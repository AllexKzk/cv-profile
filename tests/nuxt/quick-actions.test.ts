import { describe, expect, it } from 'vitest'
import type { CvUIMessage } from '#shared/types/chat'
import { usedQuickActions } from '~/composables/useQuickActions'

const user = (parts: CvUIMessage['parts']): CvUIMessage => ({ id: crypto.randomUUID(), role: 'user', parts })
const assistant = (parts: CvUIMessage['parts']): CvUIMessage => ({ id: crypto.randomUUID(), role: 'assistant', parts })

describe('usedQuickActions', () => {
  it('finds nothing in an empty or plain chat', () => {
    expect(usedQuickActions([])).toEqual(new Set())
    expect(usedQuickActions([user([{ type: 'text', text: 'Hi' }]), assistant([{ type: 'text', text: 'Hello' }])])).toEqual(new Set())
  })

  it('recognizes each action by the trace it leaves', () => {
    const messages = [
      user([{ type: 'text', text: 'Show CV' }]),
      assistant([{ type: 'data-cv', data: { section: 'hero' } }]),
      user([{ type: 'text', text: 'Download' }]),
      assistant([{ type: 'data-download', data: {} }]),
      user([{ type: 'text', text: 'Who' }, { type: 'data-interview', data: {} }]),
    ] as CvUIMessage[]
    expect(usedQuickActions(messages)).toEqual(new Set(['showCv', 'downloadCv', 'lookingFor']))
  })
})
