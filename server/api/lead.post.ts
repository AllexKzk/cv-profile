import { handleLead, MAX_LEAD_BYTES } from '../utils/lead'
import { createUpstashLeadLimiter } from '../utils/rate-limit'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)

  const length = Number(getRequestHeader(event, 'content-length') ?? 0)
  const body = length > MAX_LEAD_BYTES ? undefined : await readRawBody(event)

  return handleLead({
    body,
    ip: getRequestIP(event, { xForwardedFor: true }) ?? 'unknown',
    origin: getRequestHeader(event, 'origin'),
    host: getRequestHost(event, { xForwardedHost: true }),
    telegram: config.telegramBotToken && config.telegramChatId
      ? { token: config.telegramBotToken, chatId: String(config.telegramChatId) }
      : null,
    limiter: createUpstashLeadLimiter({
      url: config.upstashRedisRestUrl || process.env.KV_REST_API_URL,
      token: config.upstashRedisRestToken || process.env.KV_REST_API_TOKEN,
    }, {
      ipDaily: Number(config.leadIpDailyLimit),
      daily: Number(config.leadDailyLimit),
    }),
  })
})
