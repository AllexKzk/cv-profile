import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computeMatchScore } from '#shared/match/match-score'
import type { Requirement } from '#shared/match/schema'
import type { CvToolPart, CvUIMessage } from '#shared/types/chat'
import MatchReport from '~/components/blocks/MatchReport.vue'
import { mountInApp } from './helpers'

const requirements: Requirement[] = [
  { name: 'Vue 3', category: 'stack', importance: 'must', status: 'match', evidence: 'Vue in two jobs' },
  { name: 'Go', category: 'stack', importance: 'must', status: 'missing', evidence: '' },
  { name: 'Node.js', category: 'stack', importance: 'must', status: 'partial', evidence: 'Express APIs' },
  { name: 'Travel', category: 'format', importance: 'must', status: 'unknown', evidence: '' },
  { name: 'Fintech', category: 'domain', importance: 'nice', status: 'match', evidence: 'Payments' },
]

const output = { title: 'Senior Frontend Engineer', company: 'Acme', requirements, score: computeMatchScore(requirements) }

const part = (state: CvToolPart<'analyzeVacancy'>['state'] = 'output-available') =>
  ({ type: 'tool-analyzeVacancy', toolCallId: 'c', state, input: output, output }) as CvToolPart<'analyzeVacancy'>

// The report reads and writes its clarifications in the message that holds it
function seed(extra: CvUIMessage['parts'] = []) {
  useCvChat().messages.value = [
    { id: 'u', role: 'user', parts: [{ type: 'text', text: 'Fit?' }] },
    { id: 'a', role: 'assistant', parts: [part(), { type: 'text', text: 'Summary' }, ...extra] },
  ]
}

const priorities = () => useCvChat().messages.value[1]!.parts.find(p => p.type === 'data-priorities')

describe('MatchReport', () => {
  beforeEach(() => seed())

  it('shows a placeholder while the analysis streams in', async () => {
    const wrapper = await mountInApp(MatchReport, { part: { ...part('input-streaming'), input: undefined } })
    expect(wrapper.text()).toContain('Analyzing the vacancy')
  })

  it('shows the score, clarifications, categories, strengths and risks', async () => {
    const wrapper = await mountInApp(MatchReport, { part: part() })
    // Vue 3 + Node.js 1.5 + Fintech 1 out of 3 + 3 + 3 + 1 → 55%
    expect(wrapper.find('.percent').text()).toBe('55%')
    expect(wrapper.find('.level').text()).toBe('Partial match')
    expect(wrapper.find('.basis').text()).toBe('Requirements: 5, must-haves: 4')
    expect(wrapper.findAll('.clarify-item .name').map(n => n.text())).toEqual(['Go', 'Node.js'])
    expect(wrapper.findAll('.category-name').map(n => n.text())).toEqual(['Stack', 'Domain'])
    const [strengths, risks] = wrapper.findAll('.highlights .section')
    expect(strengths!.findAll('.name').map(n => n.text())).toEqual(['Vue 3', 'Fintech'])
    expect(risks!.findAll('.name').map(n => n.text())).toEqual(['Go', 'Node.js', 'Travel'])
    expect(risks!.text()).toContain('worth asking at the interview')
    expect(wrapper.find('.clarified').exists()).toBe(false)
    expect(wrapper.find('.actions button').text()).toBe('Send the report to Alexandr')
  })

  it('a clarification recomputes the score locally and is stored in the message', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch')
    const wrapper = await mountInApp(MatchReport, { part: part() })
    const notImportant = wrapper.findAll('.clarify-item')[0]!.findAll('button').find(b => b.text() === 'Not important')!
    await notImportant.trigger('click')
    await flushPromises()

    expect(priorities()).toEqual({ type: 'data-priorities', data: { source: 'c', values: { Go: 'none' } } })
    // Go is out: 5.5 of 7 → 79%
    expect(wrapper.find('.percent').text()).toBe('79%')
    expect(wrapper.find('.clarified').exists()).toBe(true)
    expect(wrapper.findAll('.highlights .section')[1]!.findAll('.name').map(n => n.text())).toEqual(['Node.js', 'Travel'])
    expect(fetch).not.toHaveBeenCalled()

    await wrapper.find('.reset').trigger('click')
    await flushPromises()
    expect(priorities()).toBeUndefined()
    expect(wrapper.find('.percent').text()).toBe('55%')
    fetch.mockRestore()
  })

  it('restores clarifications from history', async () => {
    seed([{ type: 'data-priorities', data: { source: 'c', values: { Go: 'none' } } }])
    const wrapper = await mountInApp(MatchReport, { part: part() })
    expect(wrapper.find('.percent').text()).toBe('79%')
  })

  it('sends the report without evidence and percentage, then shows it as sent', async () => {
    seed([{ type: 'data-priorities', data: { source: 'c', values: { Go: 'none' } } }])
    let body: Record<string, unknown> | undefined
    const lead = vi.fn(async (event: { web?: { request?: Request } }) => {
      body = await event.web?.request?.json()
      return { ok: true }
    })
    registerEndpoint('/api/lead', { method: 'POST', handler: lead })
    const wrapper = await mountInApp(MatchReport, { part: part() })
    await wrapper.find('.actions button').trigger('click')
    await flushPromises()

    const contact = document.body.querySelector<HTMLInputElement>('#lead-contact')!
    contact.value = '@recruiter'
    contact.dispatchEvent(new Event('input'))
    await flushPromises()
    contact.closest('form')!.dispatchEvent(new Event('submit'))
    await flushPromises()

    expect(lead).toHaveBeenCalledOnce()
    expect(body).toMatchObject({ kind: 'report', title: 'Senior Frontend Engineer', priorities: { Go: 'none' }, contact: '@recruiter' })
    expect(body).not.toHaveProperty('score')
    expect(JSON.stringify(body)).not.toContain('Vue in two jobs')
    await vi.waitFor(() => expect(useCvChat().messages.value).toHaveLength(3))
    await flushPromises()
    expect(wrapper.find('.sent').text()).toBe('Report sent')
  })
})
