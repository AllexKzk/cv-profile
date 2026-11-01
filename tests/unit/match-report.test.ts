import { describe, expect, it } from 'vitest'
import {
  applyPriorities,
  clarificationCandidates,
  MAX_CLARIFICATIONS,
  prioritiesDataSchema,
  prioritiesForModel,
  reportHighlights,
  scoreWithPriorities,
} from '../../shared/match/report'
import type { Requirement } from '../../shared/match/schema'

const req = (
  name: string,
  importance: Requirement['importance'],
  status: Requirement['status'],
  category: Requirement['category'] = 'stack',
): Requirement => ({ name, category, importance, status, evidence: status === 'match' || status === 'partial' ? `${name} in CV` : '' })

const requirements = [
  req('Vue', 'must', 'match'),
  req('Node.js', 'must', 'partial'),
  req('Go', 'must', 'missing'),
  req('Travel', 'must', 'unknown', 'format'),
  req('Fintech', 'nice', 'missing', 'domain'),
  req('Playwright', 'nice', 'match'),
]

describe('clarificationCandidates', () => {
  it('asks about missing must-haves first, then partial ones, never nice or unknown', () => {
    expect(clarificationCandidates(requirements).map(r => r.name)).toEqual(['Go', 'Node.js'])
  })

  it('asks at most five', () => {
    const many = Array.from({ length: 8 }, (_, i) => req(`R${i}`, 'must', i % 2 ? 'partial' : 'missing'))
    const asked = clarificationCandidates(many).map(r => r.name)
    expect(asked).toHaveLength(MAX_CLARIFICATIONS)
    expect(asked).toEqual(['R0', 'R2', 'R4', 'R6', 'R1'])
  })
})

describe('scoreWithPriorities', () => {
  it('without answers equals the analysis score', () => {
    // Vue 3 + Node.js 1.5 + Go 0 + Playwright 1 + Fintech 0 out of 9 + 2 → 50%
    expect(scoreWithPriorities(requirements).percent).toBe(50)
  })

  it('"not important" takes a gap out of the score, "nice" lowers its weight', () => {
    expect(scoreWithPriorities(requirements, { Go: 'none' })).toMatchObject({ percent: 69, level: 'good', mustMissing: [] })
    // Go as nice: (3 + 1.5 + 1) / (3 + 3 + 1 + 1 + 1) = 61%
    expect(scoreWithPriorities(requirements, { Go: 'nice' }).percent).toBe(61)
  })

  it('ignores answers about requirements that were not asked', () => {
    expect(scoreWithPriorities(requirements, { Vue: 'none', Fintech: 'none' }).percent).toBe(50)
    expect(applyPriorities(requirements, { Vue: 'none' })[0]!.importance).toBe('must')
  })

  it('has no score when every gap is unimportant and nothing else is scored', () => {
    expect(scoreWithPriorities([req('Go', 'must', 'missing')], { Go: 'none' }).percent).toBeNull()
  })
})

describe('reportHighlights', () => {
  it('strengths are matches, must-haves first; risks are must gaps, then unknown must-haves', () => {
    const { strengths, risks, moreRisks } = reportHighlights(applyPriorities(requirements))
    expect(strengths.map(r => r.name)).toEqual(['Vue', 'Playwright'])
    expect(risks.map(r => r.name)).toEqual(['Go', 'Node.js', 'Travel'])
    expect(moreRisks).toBe(0)
  })

  it('a gap marked unimportant or nice is no longer a risk', () => {
    const { risks } = reportHighlights(applyPriorities(requirements, { 'Go': 'none', 'Node.js': 'nice' }))
    expect(risks.map(r => r.name)).toEqual(['Travel'])
  })

  it('caps the risks and counts the rest', () => {
    const many = Array.from({ length: 7 }, (_, i) => req(`R${i}`, 'must', 'missing'))
    const { risks, moreRisks } = reportHighlights(many)
    expect(risks).toHaveLength(5)
    expect(moreRisks).toBe(2)
  })
})

describe('data-priorities', () => {
  it('accepts up to five answers', () => {
    expect(prioritiesDataSchema.safeParse({ source: 'c', values: { Go: 'none', Rust: 'nice' } }).success).toBe(true)
    const six = Object.fromEntries(['a', 'b', 'c', 'd', 'e', 'f'].map(name => [name, 'none']))
    expect(prioritiesDataSchema.safeParse({ source: 'c', values: six }).success).toBe(false)
    expect(prioritiesDataSchema.safeParse({ source: 'c', values: { Go: 'maybe' } }).success).toBe(false)
  })

  it('becomes one line for the model, without the percentage', () => {
    const line = prioritiesForModel({ 'Go': 'none', 'Node.js': 'nice' }, scoreWithPriorities(requirements, { 'Go': 'none', 'Node.js': 'nice' }))
    expect(line).toBe('[The visitor clarified in the report how critical the gaps are: Go — not important; Node.js — nice to have. Updated level: good]')
  })
})
