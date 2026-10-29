import { afterEach, describe, expect, it, vi } from 'vitest'
import ChatGreeting from '~/components/chat/ChatGreeting.vue'
import { mountInApp } from './helpers'

describe('ChatGreeting', () => {
  afterEach(() => vi.useRealTimers())

  it('shows the whole text at once without animation', async () => {
    const wrapper = await mountInApp(ChatGreeting)
    expect(wrapper.find('.rest').text()).toBe('')
    expect(wrapper.text()).toContain('Alexandr Kozikov')
  })

  it('types the text out and reports when done', async () => {
    vi.useFakeTimers()
    const wrapper = await mountInApp(ChatGreeting, { animate: true })
    const greeting = wrapper.findComponent(ChatGreeting)
    // The whole text is in the DOM from the start, the untyped part is invisible
    expect(greeting.find('.text').attributes('aria-label')).toContain('Alexandr Kozikov')
    expect(greeting.find('.rest').text()).toContain('Alexandr Kozikov')

    await vi.runAllTimersAsync()
    expect(greeting.find('.rest').text()).toBe('')
    expect(greeting.emitted('typed')).toHaveLength(1)
  })
})
