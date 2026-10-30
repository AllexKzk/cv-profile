import { flushPromises } from '@vue/test-utils'
import { createUIMessageStreamResponse } from 'ai'
import type { UIMessageChunk } from 'ai'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ChatShell from '~/components/chat/ChatShell.vue'
import ResetChatButton from '~/components/layout/ResetChatButton.vue'
import { HISTORY_KEY } from '~/lib/chat-history'
import { mountInApp } from './helpers'

// /api/chat answering with the given chunks (or an error response)
function mockApi(...responses: Array<UIMessageChunk[] | Response>) {
  const fetch = vi.fn(async () => {
    const next = responses.shift() ?? []
    if (next instanceof Response) return next
    return createUIMessageStreamResponse({
      stream: new ReadableStream<UIMessageChunk>({
        start(controller) {
          for (const chunk of next) controller.enqueue(chunk)
          controller.close()
        },
      }),
    })
  })
  vi.stubGlobal('fetch', fetch)
  return fetch
}

const textAnswer = (text: string): UIMessageChunk[] => [
  { type: 'start' },
  { type: 'text-start', id: 't' },
  { type: 'text-delta', id: 't', delta: text },
  { type: 'text-end', id: 't' },
  { type: 'finish' },
]

describe('chat shell', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  beforeEach(() => {
    useCvChat().clearError()
    useCvChat().messages.value = []
    // The greeting is already typed: the typewriter itself is covered in chat-greeting.test.ts
    useState('chat-greeting-typed').value = true
    localStorage.clear()
  })

  it('starts with the greeting and quick action cards', async () => {
    const wrapper = await mountInApp(ChatShell)
    expect(wrapper.find('.greeting').text()).toContain('Alexandr Kozikov')
    expect(wrapper.findAll('.actions:not(.compact) button')).toHaveLength(4)
    expect(wrapper.findAll('.message')).toHaveLength(0)
  })

  it('a quick action adds a question and a stub answer', async () => {
    const wrapper = await mountInApp(ChatShell)
    await wrapper.findAll('.actions button')[1]!.trigger('click')

    const messages = wrapper.findAll('.message')
    expect(messages.map(m => m.text())).toEqual(['Who are you looking for?', 'This feature is coming soon.'])
    expect(wrapper.find('.actions:not(.compact)').exists()).toBe(false)
    expect(wrapper.find('.actions.compact').exists()).toBe(true)
  })

  it('a typed message is answered by /api/chat with Markdown', async () => {
    const fetch = mockApi(textAnswer('He knows **Vue**.'))
    const wrapper = await mountInApp(ChatShell)
    await useCvChat().sendMessage({ text: 'Hello' })
    await flushPromises()

    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/chat')
    expect(JSON.parse(init.body as string)).toMatchObject({ scenario: 'free', locale: 'en' })

    const messages = wrapper.findAll('.message')
    expect(messages).toHaveLength(2)
    expect(messages[0]!.find('strong').exists()).toBe(false)
    expect(messages[1]!.find('strong').text()).toBe('Vue')
    expect(localStorage.getItem(HISTORY_KEY)).toContain('Hello')
  })

  it('renders a CV block the agent shows with the tool', async () => {
    mockApi([
      { type: 'start' },
      { type: 'tool-input-available', toolCallId: 'c1', toolName: 'showCvSection', input: { section: 'experience' } },
      { type: 'tool-output-available', toolCallId: 'c1', output: { section: 'experience' } },
      { type: 'finish' },
    ])
    const wrapper = await mountInApp(ChatShell)
    await useCvChat().sendMessage({ text: 'Where did he work?' })
    await flushPromises()

    expect(wrapper.find('.message.assistant').text()).toContain('Orion Soft')
    expect(wrapper.findAll('.message.assistant .job')).toHaveLength(3)
  })

  it('shows only the jobs the agent picked', async () => {
    const output = { section: 'experience' as const, items: ['cyno-one', 'unknown'] }
    mockApi([
      { type: 'start' },
      { type: 'tool-input-available', toolCallId: 'c1', toolName: 'showCvSection', input: output },
      { type: 'tool-output-available', toolCallId: 'c1', output },
      { type: 'finish' },
    ])
    const wrapper = await mountInApp(ChatShell)
    await useCvChat().sendMessage({ text: 'What did he do at CYNO.ONE?' })
    await flushPromises()

    const jobs = wrapper.findAll('.message.assistant .job')
    expect(jobs).toHaveLength(1)
    expect(jobs[0]!.text()).toContain('CYNO.ONE')
  })

  it('shows a refused request as an error and retries it', async () => {
    const fetch = mockApi(Response.json({ code: 'rate_limit' }, { status: 429 }), textAnswer('Now it works.'))
    const wrapper = await mountInApp(ChatShell)
    await useCvChat().sendMessage({ text: 'Hello' })
    await flushPromises()

    const error = wrapper.find('.error')
    expect(error.text()).toContain('Too many messages')
    await error.find('button').trigger('click')
    await flushPromises()

    expect(fetch).toHaveBeenCalledTimes(2)
    expect(wrapper.find('.error').exists()).toBe(false)
    expect(wrapper.findAll('.message').map(m => m.text())).toEqual(['Hello', 'Now it works.'])
  })

  it('offers the CV and Telegram when the daily limit is reached', async () => {
    mockApi(Response.json({ code: 'daily_limit' }, { status: 429 }))
    const wrapper = await mountInApp(ChatShell)
    await useCvChat().sendMessage({ text: 'Hello' })
    await flushPromises()

    const buttons = wrapper.findAll('.error .actions > *').map(b => b.text())
    expect(buttons).toEqual(['Download CV', 'Telegram'])
  })

  it('"Reset chat" clears messages and stored history', async () => {
    const shell = await mountInApp(ChatShell)
    await shell.findAll('.actions button')[0]!.trigger('click')
    await nextTick()
    expect(localStorage.getItem(HISTORY_KEY)).not.toBeNull()

    const button = await mountInApp(ResetChatButton)
    await button.find('button').trigger('click')
    await flushPromises()

    expect(useCvChat().messages.value).toEqual([])
    expect(shell.findAll('.actions:not(.compact) button')).toHaveLength(4)
    expect(localStorage.getItem(HISTORY_KEY)).toBeNull()
  })
})
