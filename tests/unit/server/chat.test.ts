import { readUIMessageStream } from 'ai'
import { describe, expect, it, vi } from 'vitest'
import { handleChat } from '../../../server/utils/chat'
import type { ChatContext } from '../../../server/utils/chat'
import { noopLimiter } from '../../../server/utils/rate-limit'
import type { Limiter } from '../../../server/utils/rate-limit'
import type { CvUIMessage } from '../../../shared/types/chat'
import { mockModel, requestBody, textStep, toolStep, userMessage } from './helpers'

function context(overrides: Partial<ChatContext> = {}): ChatContext {
  return {
    body: requestBody([userMessage('Where did he work?')]),
    ip: '1.1.1.1',
    origin: 'https://allexkzk.dev',
    host: 'allexkzk.dev',
    model: mockModel(textStep('Hello')),
    limiter: noopLimiter,
    ...overrides,
  }
}

// The last state of the assistant message built from the response stream
async function readAnswer(response: Response): Promise<CvUIMessage> {
  const chunks = response.body!
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new TransformStream<string, string>({
      transform(text, controller) {
        for (const line of text.split('\n')) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') controller.enqueue(line.slice(6))
        }
      },
    }))
    .pipeThrough(new TransformStream<string, never>({
      transform(json, controller) {
        controller.enqueue(JSON.parse(json) as never)
      },
    }))
  let last: CvUIMessage | undefined
  for await (const message of readUIMessageStream<CvUIMessage>({ stream: chunks })) last = message
  return last!
}

const errorCode = async (response: Response) => ((await response.json()) as { code: string }).code

describe('handleChat', () => {
  it('streams a text answer', async () => {
    const response = await handleChat(context())
    expect(response.status).toBe(200)
    const answer = await readAnswer(response)
    expect(answer.parts.find(p => p.type === 'text')).toMatchObject({ text: 'Hello' })
  })

  it('shows a CV section through the tool, then answers', async () => {
    const model = mockModel(toolStep('experience'), textStep('Here is the work history.'))
    const answer = await readAnswer(await handleChat(context({ model })))
    expect(answer.parts.find(p => p.type === 'tool-showCvSection')).toMatchObject({
      state: 'output-available',
      output: { section: 'experience' },
    })
    expect(answer.parts.at(-1)).toMatchObject({ type: 'text', text: 'Here is the work history.' })
  })

  it('sends the system prompt, history notes and limits to the model', async () => {
    const model = mockModel(textStep('Hi'))
    const body = requestBody([
      userMessage('Show CV', 'u0'),
      { id: 'a0', role: 'assistant', parts: [{ type: 'data-cv', data: { section: 'skills' } }] },
      userMessage('Thanks'),
    ])
    await readAnswer(await handleChat(context({ model, body })))

    const call = model.doStreamCalls[0]!
    expect(call.maxOutputTokens).toBe(800)
    expect(JSON.stringify(call.prompt[0])).toContain('<cv>')
    expect(JSON.stringify(call.prompt)).toContain('The CV section \\"skills\\" was shown to the user')
  })

  it('records the answer cost for the IP', async () => {
    const limiter: Limiter = { check: async () => null, record: vi.fn(async () => {}) }
    await readAnswer(await handleChat(context({ limiter, model: mockModel(toolStep('hero', 0.002), textStep('Ok', 0.003)) })))
    expect(limiter.record).toHaveBeenCalledWith('1.1.1.1', expect.closeTo(0.005, 6))
  })

  it('refuses a foreign origin before anything else', async () => {
    const model = mockModel(textStep('Hi'))
    const response = await handleChat(context({ origin: 'https://evil.example', model }))
    expect(response.status).toBe(403)
    expect(model.doStreamCalls).toHaveLength(0)
  })

  it('refuses an invalid body', async () => {
    const response = await handleChat(context({ body: requestBody([userMessage('Hi')], { model: 'gpt-4' }) }))
    expect(response.status).toBe(400)
    expect(await errorCode(response)).toBe('invalid')
  })

  it('returns the limiter code and does not call the model', async () => {
    const model = mockModel(textStep('Hi'))
    const limiter: Limiter = { check: async () => 'ip_budget', record: async () => {} }
    const response = await handleChat(context({ model, limiter }))
    expect(response.status).toBe(429)
    expect(await errorCode(response)).toBe('ip_budget')
    expect(model.doStreamCalls).toHaveLength(0)
  })

  it('answers model_error when the API key is missing', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const response = await handleChat(context({ model: null }))
    expect(await errorCode(response)).toBe('model_error')
  })
})
