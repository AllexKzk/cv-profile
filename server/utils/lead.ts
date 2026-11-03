import { leadRequestSchema } from '#shared/lead'
import type { LeadErrorCode } from '#shared/lead'
import { isForeignOrigin } from './guard'
import type { LeadLimiter } from './rate-limit'
import { formatLead, sendTelegram } from './telegram'
import type { TelegramConfig } from './telegram'

// A form with a brief is a few KB; anything bigger is not ours
export const MAX_LEAD_BYTES = 16 * 1024

export interface LeadContext {
  body: string | undefined
  ip: string
  origin?: string
  host?: string
  telegram: TelegramConfig | null
  limiter: LeadLimiter
  fetch?: typeof fetch
}

const STATUS: Record<LeadErrorCode, number> = {
  invalid: 400,
  forbidden: 403,
  rate_limit: 429,
  unavailable: 503,
  send_failed: 502,
}

const fail = (code: LeadErrorCode) => Response.json({ code }, { status: STATUS[code] })
const ok = () => Response.json({ ok: true })

function parse(raw: string | undefined) {
  if (!raw || new TextEncoder().encode(raw).length > MAX_LEAD_BYTES) return null
  try {
    const result = leadRequestSchema.safeParse(JSON.parse(raw))
    return result.success ? result.data : null
  }
  catch {
    return null
  }
}

// POST /api/lead without h3: guard → honeypot → limits → Telegram. Sent only on the visitor's click.
export async function handleLead(ctx: LeadContext): Promise<Response> {
  if (isForeignOrigin(ctx.origin, ctx.host)) return fail('forbidden')

  const lead = parse(ctx.body)
  if (!lead) return fail('invalid')

  // A bot filled the hidden field: pretend it worked, send nothing
  if (lead.website) return ok()

  if (!ctx.telegram) {
    console.error('[lead] NUXT_TELEGRAM_BOT_TOKEN or NUXT_TELEGRAM_CHAT_ID is not set')
    return fail('unavailable')
  }
  if (!(await ctx.limiter.check(ctx.ip))) return fail('rate_limit')

  try {
    await sendTelegram(ctx.telegram, formatLead(lead), ctx.fetch)
  }
  catch (error) {
    console.error('[lead] Telegram error', error)
    return fail('send_failed')
  }
  await ctx.limiter.record(ctx.ip)
  return ok()
}
