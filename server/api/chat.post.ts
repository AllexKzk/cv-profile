import { createChatModel } from '../utils/openrouter'
import { createUpstashLimiter } from '../utils/rate-limit'
import { handleChat } from '../utils/chat'
import { MAX_BODY_BYTES } from '../utils/guard'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)

  // Refuse oversized bodies before reading them
  const length = Number(getRequestHeader(event, 'content-length') ?? 0)
  const body = length > MAX_BODY_BYTES ? undefined : await readRawBody(event)

  return handleChat({
    body,
    ip: getRequestIP(event, { xForwardedFor: true }) ?? 'unknown',
    origin: getRequestHeader(event, 'origin'),
    host: getRequestHost(event, { xForwardedHost: true }),
    model: config.openrouterApiKey
      ? createChatModel({
          apiKey: config.openrouterApiKey,
          model: config.openrouterModel,
          fallbackModels: config.openrouterFallbackModels,
          siteUrl: config.public.siteUrl,
        })
      : null,
    // NUXT_* names first, then the ones the Vercel Upstash integration creates
    limiter: createUpstashLimiter({
      url: config.upstashRedisRestUrl || process.env.KV_REST_API_URL,
      token: config.upstashRedisRestToken || process.env.KV_REST_API_TOKEN,
    }, {
      ipRequests: Number(config.ipRequestLimit),
      ipDailyBudgetUsd: Number(config.ipDailyBudgetUsd),
      dailyRequests: Number(config.dailyLlmLimit),
    }),
  })
})
