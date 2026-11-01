import { describe, expect, it } from 'vitest'
import { computeMatchScore, DEFAULT_WEIGHTS, matchLevel } from '../../shared/match/match-score'
import type { ScoredRequirement } from '../../shared/match/match-score'

const req = (
  name: string,
  importance: ScoredRequirement['importance'],
  status: ScoredRequirement['status'],
  category: ScoredRequirement['category'] = 'stack',
): ScoredRequirement => ({ name, category, importance, status })

describe('computeMatchScore', () => {
  it('weighs must-haves three times nice-to-haves (the example from the spec)', () => {
    const score = computeMatchScore([
      req('Vue', 'must', 'match'),
      req('TypeScript', 'must', 'match'),
      req('Nuxt', 'must', 'match'),
      req('5+ years', 'must', 'match', 'experience'),
      req('Go', 'must', 'missing'),
      req('Playwright', 'nice', 'match'),
      req('Node.js', 'nice', 'partial'),
      req('Fintech', 'nice', 'missing', 'domain'),
    ])
    // (4·3 + 1 + 0.5) / (5·3 + 3) = 13.5 / 18
    expect(score.percent).toBe(75)
    expect(score.level).toBe('good')
    expect(score.mustMissing).toEqual(['Go'])
    expect(score.counts).toEqual({ match: 5, partial: 1, missing: 2, unknown: 0 })
  })

  it('counts partial as half', () => {
    expect(computeMatchScore([req('A', 'must', 'partial')]).percent).toBe(50)
    expect(computeMatchScore([req('A', 'must', 'match'), req('B', 'must', 'partial')]).percent).toBe(75)
  })

  it('leaves unknown out of the score but counts it', () => {
    const score = computeMatchScore([req('Vue', 'must', 'match'), req('Travel', 'must', 'unknown', 'format')])
    expect(score.percent).toBe(100)
    expect(score.counts.unknown).toBe(1)
    expect(score.byCategory).toEqual([{ category: 'stack', percent: 100, total: 1 }])
  })

  it('returns null when nothing can be scored', () => {
    expect(computeMatchScore([])).toMatchObject({ percent: null, level: null, mustMissing: [], byCategory: [] })
    expect(computeMatchScore([req('Salary', 'must', 'unknown')]).percent).toBeNull()
  })

  it('drops requirements marked as not important (F6)', () => {
    const score = computeMatchScore([req('Vue', 'must', 'match'), req('Go', 'none', 'missing')])
    expect(score.percent).toBe(100)
    expect(score.mustMissing).toEqual([])
  })

  it('scores each category on its own', () => {
    const score = computeMatchScore([
      req('Vue', 'must', 'match'),
      req('Go', 'must', 'missing'),
      req('Fintech', 'nice', 'partial', 'domain'),
    ])
    expect(score.byCategory).toEqual([
      { category: 'stack', percent: 50, total: 2 },
      { category: 'domain', percent: 50, total: 1 },
    ])
  })

  it('takes weights as a parameter', () => {
    const requirements = [req('Vue', 'must', 'match'), req('Go', 'nice', 'missing')]
    expect(computeMatchScore(requirements).percent).toBe(75)
    const flat = { ...DEFAULT_WEIGHTS, importance: { must: 1, nice: 1, none: 0 } }
    expect(computeMatchScore(requirements, flat).percent).toBe(50)
  })

  it('is deterministic', () => {
    const requirements = [req('Vue', 'must', 'match'), req('Go', 'nice', 'partial')]
    expect(computeMatchScore(requirements)).toEqual(computeMatchScore([...requirements]))
  })
})

describe('matchLevel', () => {
  it.each([[100, 'strong'], [80, 'strong'], [79, 'good'], [60, 'good'], [59, 'partial'], [40, 'partial'], [39, 'weak'], [0, 'weak']])(
    '%i%% is %s', (percent, level) => {
      expect(matchLevel(percent)).toBe(level)
    },
  )
})
