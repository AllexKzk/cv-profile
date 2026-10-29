import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import ChatShell from '~/components/chat/ChatShell.vue'
import ResetChatButton from '~/components/layout/ResetChatButton.vue'
import { HISTORY_KEY } from '~/lib/chat-history'
import { mountInApp } from './helpers'

describe('chat shell', () => {
  beforeEach(() => {
    useCvChat().messages.value = []
    // The greeting is already typed: the typewriter itself is covered in chat-greeting.test.ts
    useState('chat-greeting-typed').value = true
    localStorage.clear()
  })

  it('starts with the greeting and quick action cards', async () => {
    const wrapper = await mountInApp(ChatShell)
    expect(wrapper.find('.greeting').text()).toContain('Alexandr Kozikov')
    expect(wrapper.findAll('.actions:not(.compact) button')).toHaveLength(4)
    expect(wrapper.findAll('.message')).toHaveLength(0)
  })

  it('a quick action adds a question and a stub answer', async () => {
    const wrapper = await mountInApp(ChatShell)
    await wrapper.findAll('.actions button')[0]!.trigger('click')

    const messages = wrapper.findAll('.message')
    expect(messages.map(m => m.text())).toEqual(['Show CV', 'This feature is coming soon.'])
    expect(wrapper.find('.actions:not(.compact)').exists()).toBe(false)
    expect(wrapper.find('.actions.compact').exists()).toBe(true)
  })

  it('a typed message gets a reply from the stub transport', async () => {
    const wrapper = await mountInApp(ChatShell)
    await useCvChat().sendMessage({ text: 'Hello' })
    await nextTick()

    const messages = wrapper.findAll('.message')
    expect(messages).toHaveLength(2)
    expect(messages[1]!.text()).toContain('AI assistant is almost ready')
    expect(localStorage.getItem(HISTORY_KEY)).toContain('Hello')
  })

  it('"Reset chat" clears messages and stored history', async () => {
    const shell = await mountInApp(ChatShell)
    await shell.findAll('.actions button')[0]!.trigger('click')
    await nextTick()
    expect(localStorage.getItem(HISTORY_KEY)).not.toBeNull()

    const button = await mountInApp(ResetChatButton)
    await button.find('button').trigger('click')
    await flushPromises()

    expect(useCvChat().messages.value).toEqual([])
    expect(shell.findAll('.actions:not(.compact) button')).toHaveLength(4)
    expect(localStorage.getItem(HISTORY_KEY)).toBeNull()
  })
})
