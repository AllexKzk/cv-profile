import { simulateReadableStream } from 'ai'
import { MockLanguageModelV4 } from 'ai/test'
import type { CvUIMessage } from '../../../shared/types/chat'

// @ai-sdk/provider is not a direct dependency: take the stream part type from the mock
type LanguageModelV4StreamPart = Awaited<ReturnType<MockLanguageModelV4['doStream']>>['stream'] extends ReadableStream<infer T> ? T : never

const usage = {
  inputTokens: { total: 1000, noCache: 1000, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 100, text: 100, reasoning: 0 },
}

const finish = (reason: 'stop' | 'tool-calls', cost: number): LanguageModelV4StreamPart => ({
  type: 'finish',
  finishReason: { unified: reason, raw: reason },
  usage,
  providerMetadata: { openrouter: { usage: { cost } } },
})

export function textStep(text: string, cost = 0.001): LanguageModelV4StreamPart[] {
  return [
    { type: 'stream-start', warnings: [] },
    { type: 'text-start', id: 't' },
    { type: 'text-delta', id: 't', delta: text },
    { type: 'text-end', id: 't' },
    finish('stop', cost),
  ]
}

export function toolStep(section: string, cost = 0.001, items?: string[]): LanguageModelV4StreamPart[] {
  return [
    { type: 'stream-start', warnings: [] },
    { type: 'tool-call', toolCallId: 'call-1', toolName: 'showCvSection', input: JSON.stringify({ section, items }) },
    finish('tool-calls', cost),
  ]
}

export function analyzeStep(input: unknown, cost = 0.002): LanguageModelV4StreamPart[] {
  return [
    { type: 'stream-start', warnings: [] },
    { type: 'tool-call', toolCallId: 'call-a', toolName: 'analyzeVacancy', input: JSON.stringify(input) },
    finish('tool-calls', cost),
  ]
}

// A model that answers each step with the next list of stream parts
export function mockModel(...steps: LanguageModelV4StreamPart[][]) {
  let step = 0
  return new MockLanguageModelV4({
    doStream: async () => ({ stream: simulateReadableStream({ chunks: steps[step++] ?? textStep('') }) }),
  })
}

export function userMessage(text: string, id = 'u1'): CvUIMessage {
  return { id, role: 'user', parts: [{ type: 'text', text }] }
}

export function requestBody(messages: CvUIMessage[], extra: Record<string, unknown> = {}) {
  return JSON.stringify({ messages, scenario: 'free', locale: 'en', ...extra })
}

export const VACANCY_TEXT = 'Senior Frontend Engineer. Requirements: Vue 3, TypeScript, Go. Nice to have: fintech.'

export function vacancyMessage(id = 'u1', text = VACANCY_TEXT, comment?: string): CvUIMessage {
  return {
    id,
    role: 'user',
    parts: [
      { type: 'data-vacancy', data: { source: 'file', fileName: 'job.pdf', text } },
      ...(comment ? [{ type: 'text' as const, text: comment }] : []),
    ],
  }
}
