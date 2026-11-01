import { convertToModelMessages, isStepCount, streamText } from 'ai'
import type { LanguageModel } from 'ai'
import { trimHistory } from '#shared/chat/history'
import { getCv } from '#shared/cv'
import type { ChatErrorCode, CvDataPart, CvUIMessage } from '#shared/types/chat'
import { isForeignOrigin, parseChatRequest } from './guard'
import { answerCost } from './openrouter'
import type { Limiter } from './rate-limit'
import { chatTools, scenarios } from './scenarios'

// Tool call + the answer after it, with one spare step
const MAX_STEPS = 3

export interface ChatContext {
  body: string | undefined
  ip: string
  origin?: string
  host?: string
  model: LanguageModel | null
  limiter: Limiter
  now?: Date
}

const STATUS: Record<ChatErrorCode, number> = {
  invalid: 400,
  forbidden: 403,
  rate_limit: 429,
  ip_budget: 429,
  daily_limit: 429,
  model_error: 503,
}

export function errorResponse(code: ChatErrorCode): Response {
  return Response.json({ code }, { status: STATUS[code] })
}

const escapeAttribute = (value: string) => value.replace(/[<>&"]/g, char => `&#${char.charCodeAt(0)};`)

// The vacancy goes to the model as tagged data. A closing tag inside the text is broken up,
// so the text cannot end the block and pose as instructions after it.
export function vacancyForModel({ source, fileName, text, truncated }: CvDataPart<'vacancy'>['data']): string {
  const attributes = [`source="${source}"`]
  if (fileName) attributes.push(`name="${escapeAttribute(fileName)}"`)
  if (truncated) attributes.push('truncated="true"')
  return `<vacancy ${attributes.join(' ')}>\n${text.replace(/<\/(vacancy)/gi, '<\\/$1')}\n</vacancy>`
}

// Data parts become text for the model: CV blocks as short notes, so the agent knows what the
// user has already seen; the latest vacancy in full, earlier ones as a note (they are not paid
// for again in every request).
function dataPartConverter(messages: CvUIMessage[]) {
  const latestVacancy = messages.flatMap(m => m.parts).findLast(part => part.type === 'data-vacancy')

  return (part: CvUIMessage['parts'][number]) => {
    if (part.type === 'data-cv') {
      return { type: 'text' as const, text: `[The CV section "${part.data.section}" was shown to the user]` }
    }
    if (part.type === 'data-download') return { type: 'text' as const, text: '[A CV download card was shown to the user]' }
    if (part.type === 'data-vacancy') {
      if (part === latestVacancy) return { type: 'text' as const, text: vacancyForModel(part.data) }
      return { type: 'text' as const, text: `[A vacancy was attached earlier: ${part.data.fileName ?? 'pasted text'}]` }
    }
    return undefined
  }
}

// POST /api/chat without h3: guard → limits → model stream. Kept apart from the route for tests.
export async function handleChat(ctx: ChatContext): Promise<Response> {
  if (isForeignOrigin(ctx.origin, ctx.host)) return errorResponse('forbidden')

  const request = await parseChatRequest(ctx.body)
  if (!request) return errorResponse('invalid')

  if (!ctx.model) {
    console.error('[chat] NUXT_OPENROUTER_API_KEY is not set')
    return errorResponse('model_error')
  }

  const refused = await ctx.limiter.check(ctx.ip)
  if (refused) return errorResponse(refused)

  const scenario = scenarios[request.scenario]
  const cv = getCv(request.locale)
  const tools = chatTools(cv)
  const history = trimHistory(request.messages)
  const messages = await convertToModelMessages<CvUIMessage>(history, {
    tools,
    ignoreIncompleteToolCalls: true,
    convertDataPart: dataPartConverter(history),
  })

  const result = streamText({
    model: ctx.model,
    system: scenario.system(cv, ctx.now),
    messages,
    tools,
    stopWhen: isStepCount(MAX_STEPS),
    maxOutputTokens: scenario.maxOutputTokens,
    onFinish: async ({ steps, totalUsage }) => {
      const cost = answerCost(steps)
      console.info('[chat] usage', JSON.stringify({
        input: totalUsage.inputTokens,
        output: totalUsage.outputTokens,
        reasoning: totalUsage.outputTokenDetails?.reasoningTokens,
        cost,
        steps: steps.length,
        scenario: request.scenario,
      }))
      await ctx.limiter.record(ctx.ip, cost)
    },
  })

  return result.toUIMessageStreamResponse<CvUIMessage>({
    sendReasoning: false,
    onError: (error) => {
      console.error('[chat] model error', error)
      return 'model_error'
    },
  })
}
