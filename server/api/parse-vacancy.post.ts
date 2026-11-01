import { VACANCY_LIMITS } from '#shared/vacancy'
import { createUpstashWindow } from '../utils/rate-limit'
import { handleParseVacancy } from '../utils/vacancy/handler'

// Room for multipart boundaries and headers around the file
const MAX_BODY_BYTES = VACANCY_LIMITS.fileBytes + 16 * 1024
// Uploads per IP per 10 minutes
const UPLOADS_PER_WINDOW = 10

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)

  // Refuse oversized bodies before reading them
  const length = Number(getRequestHeader(event, 'content-length') ?? 0)
  const parts = length > MAX_BODY_BYTES ? undefined : (await readMultipartFormData(event)) ?? []

  return handleParseVacancy({
    files: parts?.filter(part => part.name === 'file').map(part => ({ name: part.filename ?? '', data: part.data })),
    ip: getRequestIP(event, { xForwardedFor: true }) ?? 'unknown',
    origin: getRequestHeader(event, 'origin'),
    host: getRequestHost(event, { xForwardedHost: true }),
    window: createUpstashWindow({
      url: config.upstashRedisRestUrl || process.env.KV_REST_API_URL,
      token: config.upstashRedisRestToken || process.env.KV_REST_API_TOKEN,
    }, UPLOADS_PER_WINDOW, 'cv:rl-vacancy'),
  })
})
