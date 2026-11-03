import { describe, expect, it } from 'vitest'
import { chatScenario, isRoundAnswered, pendingQuestions } from '../../shared/chat/interview'
import { getCv } from '../../shared/cv'
import { cvSkillNames, hasSkill, normalizeSkill } from '../../shared/cv/skill-match'
import { askQuestionOutputSchema, vacancyBriefSchema } from '../../shared/interview/brief'
import { briefFit } from '../../shared/interview/fit'
import type { CvMessagePart, CvUIMessage } from '../../shared/types/chat'

const cv = getCv('en')

const question = (id: string, output?: unknown): CvMessagePart => (output
  ? { type: 'tool-askQuestion', toolCallId: id, state: 'output-available', input: { slot: 'role', question: 'Role?' }, output: output as never }
  : { type: 'tool-askQuestion', toolCallId: id, state: 'input-available', input: { slot: 'role', question: 'Role?' } })

const assistant = (...parts: CvMessagePart[]): CvUIMessage => ({ id: 'a', role: 'assistant', parts })
const user: CvUIMessage = { id: 'u', role: 'user', parts: [{ type: 'text', text: 'Hi' }] }

describe('skill matching', () => {
  it.each([
    ['Vue.js', 'vue'],
    ['VueJS', 'vue'],
    ['Node.js', 'node'],
    ['Tailwind CSS', 'tailwindcss'],
    ['JS', 'js'],
  ])('normalizes %s', (name, expected) => {
    expect(normalizeSkill(name)).toBe(expected)
  })

  it('finds skills by name, part of a name, alias and job stack', () => {
    const names = cvSkillNames(cv)
    for (const skill of ['TypeScript', 'ts', 'Vue.js', 'Next.js', 'react', 'Pinia', 'Node.js', 'Go', 'K8s']) {
      expect(hasSkill(names, skill), skill).toBe(true)
    }
    for (const skill of ['Angular', 'Rust', 'Svelte']) expect(hasSkill(names, skill), skill).toBe(false)
  })
})

describe('briefFit', () => {
  it('marks skills found in the CV', () => {
    const fit = briefFit({ mustHave: ['Vue.js', 'Angular'], niceToHave: ['GraphQL'] }, cv)
    expect(fit.mustHave).toEqual([{ name: 'Vue.js', inCv: true }, { name: 'Angular', inCv: false }])
    expect(fit.niceToHave).toEqual([{ name: 'GraphQL', inCv: true }])
  })

  it.each([
    [undefined, 'unknown'],
    [['remote'], 'match'],
    [['office', 'hybrid'], 'match'],
    [['office'], 'relocation'],
  ] as const)('format %j is %s', (format, expected) => {
    expect(briefFit({ format: format ? [...format] : undefined }, cv).format).toBe(expected)
  })

  it('office only does not fit a candidate who does not relocate', () => {
    const remoteOnly = { ...cv, person: { ...cv.person, openTo: ['remote' as const] } }
    expect(briefFit({ format: ['office'] }, remoteOnly).format).toBe('mismatch')
  })
})

describe('schemas', () => {
  it('accepts an empty brief: required slots may stay unanswered', () => {
    expect(vacancyBriefSchema.safeParse({}).success).toBe(true)
  })

  it('rejects an unknown format and an overlong answer', () => {
    expect(vacancyBriefSchema.safeParse({ format: ['moon'] }).success).toBe(false)
    expect(askQuestionOutputSchema.safeParse({ kind: 'text', text: 'x'.repeat(2001) }).success).toBe(false)
    expect(askQuestionOutputSchema.safeParse({ kind: 'options', values: [] }).success).toBe(false)
  })
})

describe('interview state', () => {
  it('the quick action marker switches the chat to the interview', () => {
    expect(chatScenario([user])).toBe('free')
    const started: CvUIMessage = { ...user, parts: [...user.parts, { type: 'data-interview', data: {} }] }
    expect(chatScenario([started, assistant()])).toBe('interview')
  })

  it('a round is sent only when all its questions are answered', () => {
    const answered = { kind: 'skipped' }
    expect(isRoundAnswered([user, assistant(question('q1', answered), question('q2'))])).toBe(false)
    expect(isRoundAnswered([user, assistant(question('q1', answered), question('q2', answered))])).toBe(true)
    expect(pendingQuestions([user, assistant(question('q1', answered), question('q2'))]).map(p => p.toolCallId)).toEqual(['q2'])
  })

  it('only the last step counts, and only askQuestion', () => {
    const earlier = assistant(
      { type: 'step-start' },
      question('q1', { kind: 'skipped' }),
      { type: 'step-start' },
      { type: 'text', text: 'Thanks!' },
    )
    expect(isRoundAnswered([user, earlier])).toBe(false)
    // An answer that streamed in without a new step still ends the round
    expect(isRoundAnswered([user, assistant(question('q1', { kind: 'skipped' }), { type: 'text', text: 'Ok' })])).toBe(false)

    const serverTool = assistant({ type: 'tool-showCvSection', toolCallId: 'c', state: 'output-available', input: { section: 'hero' }, output: { section: 'hero' } })
    expect(isRoundAnswered([user, serverTool])).toBe(false)
    expect(isRoundAnswered([user])).toBe(false)
  })
})
