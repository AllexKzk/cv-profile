import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CvToolPart } from '#shared/types/chat'
import BriefCard from '~/components/blocks/BriefCard.vue'
import QuestionWidget from '~/components/blocks/QuestionWidget.vue'
import { mountInApp } from './helpers'

const question = (input: CvToolPart<'askQuestion'>['input']): CvToolPart<'askQuestion'> =>
  ({ type: 'tool-askQuestion', toolCallId: 'q1', state: 'input-available', input }) as CvToolPart<'askQuestion'>

const brief: CvToolPart<'submitBrief'> = {
  type: 'tool-submitBrief',
  toolCallId: 'b1',
  state: 'output-available',
  input: {},
  output: {
    brief: { role: 'Frontend', seniority: 'Senior', mustHave: ['Vue', 'Go'], format: ['remote'], salary: { min: 5000, currency: 'USD', period: 'month' } },
    fit: { mustHave: [{ name: 'Vue', inCv: true }, { name: 'Go', inCv: false }], niceToHave: [], format: 'match' },
  },
}

describe('QuestionWidget', () => {
  let addToolOutput: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    addToolOutput = vi.spyOn(useCvChat(), 'addToolOutput').mockImplementation(async () => {})
  })
  afterEach(() => {
    addToolOutput.mockRestore()
  })

  const output = () => (addToolOutput.mock.calls[0]![0] as { output: unknown }).output

  it('single choice answers with a click, fixed options are translated', async () => {
    const wrapper = await mountInApp(QuestionWidget, { part: question({ slot: 'format', question: 'Format?', options: ['Ignored'] }) })
    // format is a multi-select with fixed options: the agent's options are ignored
    expect(wrapper.findAll('.option').map(b => b.text())).toEqual(['Remote', 'Hybrid', 'Office'])

    const single = await mountInApp(QuestionWidget, { part: question({ slot: 'seniority', question: 'Level?' }) })
    await single.findAll('.option')[1]!.trigger('click')
    expect(output()).toEqual({ kind: 'options', values: ['Senior'] })
  })

  it('multi-select takes the agent options and an own value', async () => {
    const wrapper = await mountInApp(QuestionWidget, { part: question({ slot: 'mustHave', question: 'Stack?', options: ['Vue', 'React'] }) })
    expect(wrapper.find('.done').attributes('disabled')).toBeDefined()

    await wrapper.findAll('.option')[0]!.trigger('click')
    await wrapper.find('form input').setValue('Svelte')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.findAll('.option').map(b => b.text())).toEqual(['Vue', 'React', 'Svelte'])

    await wrapper.find('.done').trigger('click')
    expect(output()).toEqual({ kind: 'options', values: ['Vue', 'Svelte'] })
  })

  it('salary range needs one bound', async () => {
    const wrapper = await mountInApp(QuestionWidget, { part: question({ slot: 'salary', question: 'Salary?' }) })
    const [min] = wrapper.findAll('.range input')
    await min!.setValue('4000')
    await wrapper.findAll('.range button').find(b => b.text() === 'EUR')!.trigger('click')
    await wrapper.find('.done').trigger('click')
    expect(output()).toEqual({ kind: 'range', min: 4000, max: undefined, currency: 'EUR', period: 'month' })
  })

  it('can be skipped', async () => {
    const wrapper = await mountInApp(QuestionWidget, { part: question({ slot: 'domain', question: 'Domain?' }) })
    await wrapper.find('.skip').trigger('click')
    expect(output()).toEqual({ kind: 'skipped' })
  })

  it('an answered question shows the answer and no controls', async () => {
    const part = { ...question({ slot: 'salary', question: 'Salary?' }), state: 'output-available', output: { kind: 'range', min: 100, max: 200, currency: 'USD', period: 'year' } }
    const wrapper = await mountInApp(QuestionWidget, { part })
    expect(wrapper.find('.answer').text()).toBe('100–200 USD per year')
    expect(wrapper.find('button').exists()).toBe(false)
  })
})

describe('BriefCard', () => {
  beforeEach(() => {
    useCvChat().messages.value = []
  })

  it('shows the brief with the fit', async () => {
    const wrapper = await mountInApp(BriefCard, { part: brief })
    const text = wrapper.text()
    expect(text).toContain('Senior · Frontend')
    expect(text).toContain('Remote')
    expect(text).toContain('fits')
    expect(text).toContain('from 5,000 USD per month')
    expect(text).toContain('Must-have stack: 1 of 2 in the CV.')
    expect(wrapper.find('.actions button').text()).toBe('Send to Alexandr')
  })

  it('sends a lead from the form and shows it as sent', async () => {
    const lead = vi.fn(() => ({ ok: true }))
    registerEndpoint('/api/lead', { method: 'POST', handler: lead })
    const wrapper = await mountInApp(BriefCard, { part: brief })
    await wrapper.find('.actions button').trigger('click')
    await flushPromises()

    const contact = document.body.querySelector<HTMLInputElement>('#lead-contact')!
    const submit = document.body.querySelector<HTMLButtonElement>('form.form button[type=submit]')!
    expect(submit.disabled).toBe(true)
    contact.value = '@recruiter'
    contact.dispatchEvent(new Event('input'))
    await flushPromises()
    submit.closest('form')!.dispatchEvent(new Event('submit'))
    await flushPromises()

    expect(lead).toHaveBeenCalledOnce()
    await vi.waitFor(() => expect(useCvChat().messages.value).toHaveLength(1))
    await flushPromises()
    expect(useCvChat().messages.value.at(-1)?.parts).toEqual([{ type: 'data-lead', data: { source: 'b1' } }])
    expect(wrapper.find('.sent').text()).toBe('Request sent')
  })
})
