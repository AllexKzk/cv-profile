import { flushPromises } from '@vue/test-utils'
import { createUIMessageStreamResponse } from 'ai'
import type { UIMessageChunk } from 'ai'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ChatInput from '~/components/chat/ChatInput.vue'
import ChatShell from '~/components/chat/ChatShell.vue'
import VacancyMatchBlock from '~/components/blocks/VacancyMatchBlock.vue'
import type { CvToolPart } from '#shared/types/chat'
import { mountInApp } from './helpers'

const VACANCY = 'Senior Frontend Engineer. Requirements: Vue 3, TypeScript, Nuxt, five years of experience. '.repeat(4)

const parsed = (fileName: string) => Response.json({ fileName, text: VACANCY, chars: VACANCY.length, truncated: false })

const emptyAnswer = () => createUIMessageStreamResponse({
  stream: new ReadableStream<UIMessageChunk>({
    start(controller) {
      controller.enqueue({ type: 'start' })
      controller.enqueue({ type: 'finish' })
      controller.close()
    },
  }),
})

// /api/parse-vacancy and /api/chat answering in turn
function mockFetch(...responses: Response[]) {
  const fetch = vi.fn(async () => responses.shift() ?? emptyAnswer())
  vi.stubGlobal('fetch', fetch)
  return fetch
}

const file = (name: string, size = 100) => new File(['x'.repeat(size)], name)

describe('vacancy upload', () => {
  beforeEach(() => {
    useCvChat().clearError()
    useCvChat().messages.value = []
    useState('chat-greeting-typed').value = true
    useVacancyUpload().clear()
    useVacancyDialog().value = false
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uploads a file, shows the chip and sends it as data-vacancy with the match scenario', async () => {
    const fetch = mockFetch(parsed('job.pdf'))
    const wrapper = await mountInApp(ChatShell)
    await useVacancyUpload().attachFile(file('job.pdf'))
    await flushPromises()

    expect(wrapper.find('.input .chip').text()).toContain('job.pdf')
    expect(wrapper.find('.input .chip').text()).toContain(`${VACANCY.length} characters`)
    const [url] = fetch.mock.calls[0] as unknown as [string]
    expect(url).toBe('/api/parse-vacancy')

    // An attachment alone can be sent
    await wrapper.find('form.input').trigger('submit')
    await flushPromises()

    const [, init] = fetch.mock.calls[1] as unknown as [string, RequestInit]
    const body = JSON.parse(init.body as string)
    expect(body.scenario).toBe('match')
    expect(body.messages.at(-1).parts).toEqual([{ type: 'data-vacancy', data: { source: 'file', fileName: 'job.pdf', text: VACANCY } }])
    expect(wrapper.find('.input .chip').exists()).toBe(false)
    expect(wrapper.find('.message.user .chip').text()).toContain('job.pdf')
  })

  it('shows the server error in the chip and blocks sending until removed', async () => {
    mockFetch(Response.json({ code: 'empty_text' }, { status: 422 }))
    const wrapper = await mountInApp(ChatShell)
    await useVacancyUpload().attachFile(file('scan.pdf'))
    await flushPromises()

    const chip = wrapper.find('.input .chip')
    expect(chip.text()).toContain('No text found')
    await wrapper.find('textarea').setValue('Does he fit?')
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()

    await chip.find('button[aria-label="Remove the vacancy"]').trigger('click')
    expect(wrapper.find('.input .chip').exists()).toBe(false)
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
  })

  it('refuses a wrong file before uploading it', async () => {
    const fetch = mockFetch()
    const wrapper = await mountInApp(ChatShell)
    await useVacancyUpload().attachFile(file('photo.png'))
    await useVacancyUpload().attachFile(file('big.pdf', 3 * 1024 * 1024))
    await flushPromises()
    expect(fetch).not.toHaveBeenCalled()
    expect(wrapper.find('.input .chip').text()).toContain('too large')
  })

  it('a newer file replaces one that is still uploading', async () => {
    let resolveFirst!: (response: Response) => void
    const fetch = vi.fn()
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveFirst = resolve }))
      .mockImplementationOnce(async () => parsed('second.md'))
    vi.stubGlobal('fetch', fetch)
    const wrapper = await mountInApp(ChatShell)

    const first = useVacancyUpload().attachFile(file('first.md'))
    await useVacancyUpload().attachFile(file('second.md'))
    resolveFirst(parsed('first.md'))
    await first
    await flushPromises()

    expect(wrapper.find('.input .chip').text()).toContain('second.md')
  })

  it('the quick action opens the dialog, pasted text becomes the chip', async () => {
    mockFetch()
    const wrapper = await mountInApp(ChatShell)
    await wrapper.findAll('.actions button')[3]!.trigger('click')
    await flushPromises()

    const dialog = document.body.querySelector('[role="dialog"]')!
    expect(dialog.textContent).toContain('Upload a vacancy')
    const textarea = dialog.querySelector<HTMLTextAreaElement>('#vacancy-text')!
    textarea.value = 'Too short'
    textarea.dispatchEvent(new Event('input'))
    await nextTick()
    dialog.querySelector<HTMLFormElement>('form')!.requestSubmit()
    await nextTick()
    expect(dialog.textContent).toContain('too short')

    textarea.value = VACANCY
    textarea.dispatchEvent(new Event('input'))
    await nextTick()
    dialog.querySelector<HTMLFormElement>('form')!.requestSubmit()
    await flushPromises()

    expect(useVacancyDialog().value).toBe(false)
    expect(wrapper.find('.input .chip').text()).toContain('Pasted text')
  })

  it('a file dropped on the chat is uploaded', async () => {
    const fetch = mockFetch(parsed('dropped.docx'))
    const wrapper = await mountInApp(ChatShell)
    const dataTransfer = { files: [file('dropped.docx')], types: ['Files'], items: [{ kind: 'file', type: '' }], dropEffect: 'none' }
    const drop = new Event('drop', { bubbles: true, cancelable: true })
    Object.assign(drop, { dataTransfer })
    wrapper.find('.chat').element.dispatchEvent(drop)
    await flushPromises()

    expect(fetch).toHaveBeenCalledOnce()
    expect(wrapper.find('.input .chip').text()).toContain('dropped.docx')
  })
})

describe('ChatInput', () => {
  it('turns a paste longer than a message into an attachment', async () => {
    const wrapper = await mountInApp(ChatInput)
    const input = wrapper.findComponent(ChatInput)
    const long = 'a'.repeat(2001)
    await wrapper.find('textarea').trigger('paste', { clipboardData: { getData: () => long } })
    expect(input.emitted('pasteLong')).toEqual([[long]])

    await wrapper.find('textarea').trigger('paste', { clipboardData: { getData: () => 'short' } })
    expect(input.emitted('pasteLong')).toHaveLength(1)
  })
})

describe('VacancyMatchBlock', () => {
  const output = {
    title: 'Senior Frontend Engineer',
    company: 'Acme',
    requirements: [
      { name: 'Vue 3', category: 'stack' as const, importance: 'must' as const, status: 'match' as const, evidence: 'Vue in two jobs' },
      { name: 'Go', category: 'stack' as const, importance: 'must' as const, status: 'missing' as const, evidence: '' },
      { name: 'Travel', category: 'format' as const, importance: 'nice' as const, status: 'unknown' as const, evidence: '' },
    ],
    score: {
      percent: 50,
      level: 'partial' as const,
      counts: { match: 1, partial: 0, missing: 1, unknown: 1 },
      mustMissing: ['Go'],
      byCategory: [],
    },
  }

  it('shows a placeholder while the analysis streams in', async () => {
    const part = { type: 'tool-analyzeVacancy', toolCallId: 'c', state: 'input-streaming', input: undefined } as CvToolPart<'analyzeVacancy'>
    const wrapper = await mountInApp(VacancyMatchBlock, { part })
    expect(wrapper.text()).toContain('Analyzing the vacancy')
  })

  it('shows the score, counters, gaps and requirements with evidence', async () => {
    const part = { type: 'tool-analyzeVacancy', toolCallId: 'c', state: 'output-available', input: output, output } as CvToolPart<'analyzeVacancy'>
    const wrapper = await mountInApp(VacancyMatchBlock, { part })
    expect(wrapper.find('.percent').text()).toBe('50%')
    expect(wrapper.find('.level').text()).toBe('Partial match')
    expect(wrapper.find('.gaps').text()).toBe('Missing must-haves: Go')
    expect(wrapper.findAll('.requirement').map(r => r.find('.name').text())).toEqual(['Vue 3 must', 'Go must', 'Travel nice'])
    expect(wrapper.find('.requirement.match .evidence').text()).toBe('Vue in two jobs')
  })
})
