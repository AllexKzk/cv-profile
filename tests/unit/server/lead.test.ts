import { describe, expect, it, vi } from 'vitest'
import { handleLead } from '../../../server/utils/lead'
import type { LeadContext } from '../../../server/utils/lead'
import { createLeadLimiter, noopLeadLimiter } from '../../../server/utils/rate-limit'
import type { LimiterStore } from '../../../server/utils/rate-limit'
import { escapeHtml, formatLead } from '../../../server/utils/telegram'
import type { LeadRequest } from '../../../shared/lead'

const lead: LeadRequest = {
  contact: '@recruiter',
  name: 'Anna',
  company: 'Acme <script>',
  comment: 'Hi & welcome',
  brief: { role: 'Frontend', seniority: 'Senior', mustHave: ['Vue', 'Go'], format: ['remote'], salary: { min: 200000, max: 300000, currency: 'RUB', period: 'month' } },
  fit: { mustHave: [{ name: 'Vue', inCv: true }, { name: 'Go', inCv: false }], niceToHave: [], format: 'match' },
  locale: 'ru',
}

function telegram(status = 200) {
  return vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => new Response('{}', { status }))
}

function context(overrides: Partial<LeadContext> = {}): LeadContext {
  return {
    body: JSON.stringify(lead),
    ip: '1.1.1.1',
    origin: 'https://allexkzk.dev',
    host: 'allexkzk.dev',
    telegram: { token: 'TOKEN', chatId: '42' },
    limiter: noopLeadLimiter,
    fetch: telegram() as unknown as typeof fetch,
    ...overrides,
  }
}

function memoryStore(): LimiterStore {
  const data = new Map<string, number>()
  return {
    get: async <T>(key: string) => (data.get(key) ?? null) as T | null,
    incr: async key => data.set(key, (data.get(key) ?? 0) + 1).get(key)!,
    incrbyfloat: async (key, value) => data.set(key, (data.get(key) ?? 0) + value).get(key)!,
    expire: async () => 1,
  }
}

const code = async (response: Response) => ((await response.json()) as { code?: string }).code

describe('handleLead', () => {
  it('sends the lead to Telegram', async () => {
    const fetch = telegram()
    const response = await handleLead(context({ fetch: fetch as unknown as typeof globalThis.fetch }))
    expect(response.status).toBe(200)

    const [url, init] = fetch.mock.calls[0]!
    expect(url).toBe('https://api.telegram.org/botTOKEN/sendMessage')
    const body = JSON.parse(init!.body as string)
    expect(body).toMatchObject({ chat_id: '42', parse_mode: 'HTML' })
    expect(body.text).toContain('@recruiter')
  })

  it('a filled honeypot answers ok without sending', async () => {
    const fetch = telegram()
    const response = await handleLead(context({ body: JSON.stringify({ ...lead, website: 'spam.example' }), fetch: fetch as never }))
    expect(response.status).toBe(200)
    expect(fetch).not.toHaveBeenCalled()
  })

  it.each([
    ['no contact', { ...lead, contact: '' }],
    ['unknown field', { ...lead, chat_id: '1' }],
    ['too long comment', { ...lead, comment: 'x'.repeat(1001) }],
  ])('rejects %s', async (_, body) => {
    const response = await handleLead(context({ body: JSON.stringify(body) }))
    expect(response.status).toBe(400)
  })

  it('refuses a foreign Origin and a missing bot config', async () => {
    expect(await code(await handleLead(context({ origin: 'https://evil.example' })))).toBe('forbidden')
    expect(await code(await handleLead(context({ telegram: null })))).toBe('unavailable')
  })

  it('a Telegram error does not use up the limit', async () => {
    const limiter = createLeadLimiter(memoryStore(), { ipDaily: 1, daily: 20 })
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await code(await handleLead(context({ limiter, fetch: telegram(500) as never })))).toBe('send_failed')
    error.mockRestore()

    expect((await handleLead(context({ limiter }))).status).toBe(200)
    expect(await code(await handleLead(context({ limiter })))).toBe('rate_limit')
    // Another visitor may still send one
    expect((await handleLead(context({ limiter, ip: '2.2.2.2' }))).status).toBe(200)
  })

  it('the site-wide daily limit applies to all IPs', async () => {
    const limiter = createLeadLimiter(memoryStore(), { ipDaily: 1, daily: 2 })
    expect((await handleLead(context({ limiter, ip: 'a' }))).status).toBe(200)
    expect((await handleLead(context({ limiter, ip: 'b' }))).status).toBe(200)
    expect(await code(await handleLead(context({ limiter, ip: 'c' })))).toBe('rate_limit')
  })
})

describe('formatLead', () => {
  it('escapes what the visitor typed and adds the brief with the fit', () => {
    const text = formatLead(lead)
    expect(text).toContain('Acme &lt;script&gt;')
    expect(text).toContain('Hi &amp; welcome')
    expect(text).not.toContain('<script>')
    expect(text).toContain('Vue ✅, Go ❌ (1/2 в резюме)')
    expect(text).toContain('remote (подходит)')
    expect(text).toContain('RUB / мес')
  })

  it('escapeHtml', () => {
    expect(escapeHtml('<b>&</b>')).toBe('&lt;b&gt;&amp;&lt;/b&gt;')
  })
})
