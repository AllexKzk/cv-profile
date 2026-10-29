import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getCv } from '#shared/cv'
import CvHero from '~/components/blocks/CvHero.vue'
import ChatShell from '~/components/chat/ChatShell.vue'
import { HISTORY_KEY } from '~/lib/chat-history'
import { mountInApp } from './helpers'

const SHOW_CV = 0
const DOWNLOAD_CV = 2

describe('CV in chat', () => {
  beforeEach(() => {
    useCvChat().messages.value = []
    useState('chat-greeting-typed').value = true
    localStorage.clear()
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await useNuxtApp().$i18n.setLocale('en')
  })

  it('"Show CV" answers with all CV sections', async () => {
    const wrapper = await mountInApp(ChatShell)
    await wrapper.findAll('.actions button')[SHOW_CV]!.trigger('click')

    const [question, answer] = useCvChat().messages.value
    expect(question!.parts).toEqual([{ type: 'text', text: 'Show CV' }])
    expect(answer!.parts.map(part => part.type === 'data-cv' && part.data.section))
      .toEqual(['hero', 'about', 'experience', 'education', 'skills'])

    const text = wrapper.text()
    expect(wrapper.findAll('.card')).toHaveLength(5)
    expect(text).toContain('Alexandr Kozikov')
    expect(text).toMatch(/\d\+ years of experience/)
    expect(text).toContain('ORION SOFT')
    expect(text).toContain('present')
    // Fresh answers animate in, part by part
    expect(wrapper.findAll('.appear')).toHaveLength(5)
    // Stored as references to sections, not as a copy of the CV
    expect(localStorage.getItem(HISTORY_KEY)).toContain('"section":"hero"')
  })

  it('a shown CV follows the locale', async () => {
    const wrapper = await mountInApp(ChatShell)
    await wrapper.findAll('.actions button')[SHOW_CV]!.trigger('click')
    await useNuxtApp().$i18n.setLocale('ru')
    await flushPromises()

    const text = wrapper.text()
    expect(text).toContain('Александр Козиков')
    expect(text).toMatch(/\d\+ (год|года|лет) опыта/)
    expect(text).toContain('н. в.')
  })

  it('"Download CV" shows the card and downloads the PDF of the locale', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.getAttribute('href')).toBe(getCv('en').pdf)
      expect(this.download).toBe('Alexandr_Kozikov_en.pdf')
    })
    const wrapper = await mountInApp(ChatShell)
    await wrapper.findAll('.actions button')[DOWNLOAD_CV]!.trigger('click')

    expect(click).toHaveBeenCalledOnce()
    const link = wrapper.find('.download a')
    expect(link.attributes('href')).toBe(getCv('en').pdf)
    expect(link.attributes('download')).toBe('Alexandr_Kozikov_en.pdf')
  })

  it('restored history shows blocks without animation', async () => {
    useCvChat().messages.value = [{ id: 'restored', role: 'assistant', parts: [{ type: 'data-cv', data: { section: 'about' } }] }]
    const wrapper = await mountInApp(ChatShell)

    expect(wrapper.findAll('.card')).toHaveLength(1)
    expect(wrapper.find('.appear').exists()).toBe(false)
  })

  it('uses Russian plural forms', async () => {
    const i18n = useNuxtApp().$i18n
    await i18n.setLocale('ru')

    expect([1, 2, 5, 21].map(n => i18n.t('cv.hero.experience', n)))
      .toEqual(['1+ год опыта', '2+ года опыта', '5+ лет опыта', '21+ год опыта'])
  })

  it('the hero falls back to initials without a photo', async () => {
    const cv = getCv('en')
    const wrapper = await mountInApp(CvHero, {
      person: { ...cv.person, photo: '/missing.webp' },
      contacts: cv.contacts,
      experienceYears: 5,
    })
    await flushPromises()

    expect(wrapper.find('[data-slot="avatar-fallback"]').text()).toBe('AK')
    expect(wrapper.text()).toContain('5+ years of experience')
    expect(wrapper.findAll('.contacts a')).toHaveLength(4)
  })
})
