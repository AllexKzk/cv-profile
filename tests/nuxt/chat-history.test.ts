import { beforeEach, describe, expect, it } from 'vitest'
import type { CvUIMessage } from '#shared/types/chat'
import { HISTORY_KEY, HISTORY_LIMIT, HISTORY_VERSION, loadHistory, saveHistory } from '~/lib/chat-history'

const message = (id: string, text = 'hi'): CvUIMessage => ({ id, role: 'user', parts: [{ type: 'text', text }] })

describe('chat history', () => {
  beforeEach(() => localStorage.clear())

  it('saves and loads messages', async () => {
    saveHistory(localStorage, [message('1'), message('2')])
    expect((await loadHistory(localStorage)).map(m => m.id)).toEqual(['1', '2'])
  })

  it('loads CV data parts', async () => {
    const answer: CvUIMessage = {
      id: '1',
      role: 'assistant',
      parts: [{ type: 'data-cv', data: { section: 'hero' } }, { type: 'data-download', data: {} }],
    }
    saveHistory(localStorage, [answer])
    expect(await loadHistory(localStorage)).toEqual([answer])
  })

  it(`keeps only the last ${HISTORY_LIMIT} messages`, async () => {
    saveHistory(localStorage, Array.from({ length: HISTORY_LIMIT + 5 }, (_, i) => message(String(i))))
    const history = await loadHistory(localStorage)
    expect(history).toHaveLength(HISTORY_LIMIT)
    expect(history[0]!.id).toBe('5')
  })

  it('removes the key when saving an empty list', () => {
    saveHistory(localStorage, [message('1')])
    saveHistory(localStorage, [])
    expect(localStorage.getItem(HISTORY_KEY)).toBeNull()
  })

  it.each([
    ['another version', JSON.stringify({ version: HISTORY_VERSION + 1, messages: [message('1')] })],
    ['broken JSON', '{broken'],
    ['invalid messages', JSON.stringify({ version: HISTORY_VERSION, messages: [{ id: '1', role: 'robot' }] })],
    ['an unknown CV section', JSON.stringify({
      version: HISTORY_VERSION,
      messages: [{ id: '1', role: 'assistant', parts: [{ type: 'data-cv', data: { section: 'hobbies' } }] }],
    })],
  ])('drops %s', async (_, raw) => {
    localStorage.setItem(HISTORY_KEY, raw)
    expect(await loadHistory(localStorage)).toEqual([])
    expect(localStorage.getItem(HISTORY_KEY)).toBeNull()
  })
})
