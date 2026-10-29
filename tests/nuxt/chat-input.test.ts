import { describe, expect, it } from 'vitest'
import ChatInput from '~/components/chat/ChatInput.vue'
import { mountInApp } from './helpers'

async function setup(props: Record<string, unknown> = {}) {
  const wrapper = await mountInApp(ChatInput, props)
  const input = wrapper.findComponent(ChatInput)
  const textarea = wrapper.find('textarea')
  return { input, textarea }
}

describe('ChatInput', () => {
  it('sends trimmed text on Enter and clears the field', async () => {
    const { input, textarea } = await setup()
    await textarea.setValue('  hello  ')
    await textarea.trigger('keydown', { key: 'Enter' })
    expect(input.emitted('send')).toEqual([['hello']])
    expect(textarea.element.value).toBe('')
  })

  it('does not send on Shift+Enter', async () => {
    const { input, textarea } = await setup()
    await textarea.setValue('hello')
    await textarea.trigger('keydown', { key: 'Enter', shiftKey: true })
    expect(input.emitted('send')).toBeUndefined()
  })

  it('does not send empty text', async () => {
    const { input, textarea } = await setup()
    await textarea.setValue('   ')
    await textarea.trigger('keydown', { key: 'Enter' })
    expect(input.emitted('send')).toBeUndefined()
  })

  it('does not send while the assistant is answering', async () => {
    const { input, textarea } = await setup({ busy: true })
    await textarea.setValue('hello')
    await textarea.trigger('keydown', { key: 'Enter' })
    expect(input.emitted('send')).toBeUndefined()
  })
})
