import { convertToModelMessages, isStepCount, streamText } from 'ai'
import type { LanguageModel } from 'ai'
import { trimHistory } from '#shared/chat/history'
import { getCv } from '#shared/cv'
import type { ChatErrorCode, CvUIMessage } from '#shared/types/chat'
import { isForeignOrigin, parseChatRequest } from './guard'
import { answerCost } from './openrouter'
import type { Limiter } from './rate-limit'
import { scenarios } from './scenarios'

export const MAX_OUTPUT_TOKENS = 800
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

// Data parts of local scenarios become short notes, so the agent knows what the user has already seen
function convertDataPart(part: { type: string, data: unknown }) {
  if (part.type === 'data-cv') {
    const { section } = part.data as { section: string }
    return { type: 'text' as const, text: `[The CV section "${section}" was shown to the user]` }
  }
  if (part.type === 'data-download') return { type: 'text' as const, text: '[A CV download card was shown to the user]' }
  return undefined
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
  const messages = await convertToModelMessages<CvUIMessage>(trimHistory(request.messages), {
    tools: scenario.tools,
    ignoreIncompleteToolCalls: true,
    convertDataPart,
  })

  const result = streamText({
    model: ctx.model,
    system: scenario.system(cv, ctx.now),
    messages,
    tools: scenario.tools,
    stopWhen: isStepCount(MAX_STEPS),
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    onFinish: async ({ steps, totalUsage }) => {
      const cost = answerCost(steps)
      console.info('[chat] usage', JSON.stringify({
        input: totalUsage.inputTokens,
        output: totalUsage.outputTokens,
        reasoning: totalUsage.outputTokenDetails?.reasoningTokens,
        cost,
        steps: steps.length,
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
