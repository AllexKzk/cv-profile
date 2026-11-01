import { describe, expect, it, vi } from 'vitest'
import { handleLead } from '../../../server/utils/lead'
import type { LeadContext } from '../../../server/utils/lead'
import { createLeadLimiter, noopLeadLimiter } from '../../../server/utils/rate-limit'
import type { LimiterStore } from '../../../server/utils/rate-limit'
import { escapeHtml, formatLead } from '../../../server/utils/telegram'
import type { LeadRequest } from '../../../shared/lead'

const lead: LeadRequest = {
  kind: 'brief',
  contact: '@recruiter',
  name: 'Anna',
  company: 'Acme <script>',
  comment: 'Hi & welcome',
  brief: { role: 'Frontend', seniority: 'Senior', mustHave: ['Vue', 'Go'], format: ['remote'], salary: { min: 200000, max: 300000, currency: 'RUB', period: 'month' } },
  fit: { mustHave: [{ name: 'Vue', inCv: true }, { name: 'Go', inCv: false }], niceToHave: [], format: 'match' },
  locale: 'ru',
}

const report: LeadRequest = {
  kind: 'report',
  contact: '@recruiter',
  title: 'Senior Frontend <Engineer>',
  company: 'Acme',
  requirements: [
    { name: 'Vue 3', category: 'stack', importance: 'must', status: 'match' },
    { name: 'Go', category: 'stack', importance: 'must', status: 'missing' },
    { name: 'Kubernetes', category: 'stack', importance: 'must', status: 'partial' },
    { name: 'Business travel', category: 'format', importance: 'must', status: 'unknown' },
    { name: 'Fintech', category: 'domain', importance: 'nice', status: 'missing' },
  ],
  priorities: { 'Go': 'none', 'Vue 3': 'none' },
  locale: 'en',
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
    ['no kind', { ...lead, kind: undefined }],
    ['a report with a brief', { ...report, brief: lead.brief }],
    ['a report with a percentage', { ...report, percent: 100 }],
    ['a report with evidence', { ...report, requirements: [{ ...report.requirements[0], evidence: 'x' }] }],
    ['a report with 26 requirements', { ...report, requirements: Array.from({ length: 26 }, (_, i) => ({ ...report.requirements[0], name: `R${i}` })) }],
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

  it('recomputes the report score with the clarifications and lists the gaps', () => {
    const text = formatLead(report)
    expect(text).toContain('<b>Отчёт по вакансии</b>')
    expect(text).toContain('Senior Frontend &lt;Engineer&gt;')
    // Go is not important; Vue 3 was not a clarification, so its answer is ignored:
    // Vue 3 (3·1) + Kubernetes (3·0.5) + Fintech (1·0) out of 7 → 64%
    expect(text).toContain('Совпадение: 64% (хорошее совпадение)')
    expect(text).toContain('Уточнения рекрутера: Go → не важно')
    expect(text).not.toContain('Vue 3 → ')
    expect(text).not.toContain('Нет must-have')
    expect(text).toContain('⚠️ Частично must-have: Kubernetes')
    expect(text).toContain('❔ Нет данных в резюме: Business travel')
    expect(text).toContain('Язык сайта: en')
  })

  it('sends a report lead', async () => {
    const fetch = telegram()
    const response = await handleLead(context({ body: JSON.stringify(report), fetch: fetch as never }))
    expect(response.status).toBe(200)
    expect(JSON.parse(fetch.mock.calls[0]![1]!.body as string).text).toContain('Отчёт по вакансии')
  })

  it('escapeHtml', () => {
    expect(escapeHtml('<b>&</b>')).toBe('&lt;b&gt;&amp;&lt;/b&gt;')
  })
})
