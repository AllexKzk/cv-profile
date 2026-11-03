import { describe, expect, it } from 'vitest'
import { buildVacancyAnalysis } from '../../../server/utils/tools/analyze-vacancy'
import { getCv } from '../../../shared/cv'
import type { AnalyzeVacancyInput, Requirement } from '../../../shared/match/schema'

const cv = getCv('en')

const req = (name: string, overrides: Partial<Requirement> = {}): Requirement => ({
  name,
  category: 'stack',
  importance: 'must',
  status: 'match',
  evidence: 'Some fact',
  ...overrides,
})

const analyze = (requirements: Requirement[], extra: Partial<AnalyzeVacancyInput> = {}) =>
  buildVacancyAnalysis({ title: 'Frontend Engineer', company: '', requirements, ...extra }, cv)

describe('buildVacancyAnalysis', () => {
  it('scores the classification', () => {
    const result = analyze([req('Vue'), req('Go', { status: 'missing', evidence: '' })])
    expect(result.score).toMatchObject({ percent: 50, mustMissing: ['Go'] })
  })

  it('drops duplicates by name, ignoring case and spaces', () => {
    const result = analyze([req('Vue 3'), req(' vue  3 ', { status: 'missing' })])
    expect(result.requirements).toHaveLength(1)
    expect(result.requirements[0]!.status).toBe('match')
  })

  it('raises a stack requirement to match when the CV lists it under a skill alias', () => {
    const result = analyze([
      req('Vue.js', { status: 'missing', evidence: '' }),
      req('TS', { status: 'partial' }),
      req('Vue 3 (Composition API)', { status: 'partial' }),
    ])
    expect(result.requirements.map(r => r.status)).toEqual(['match', 'match', 'match'])
    expect(result.requirements[0]!.evidence).toMatch(/Vue \/ Nuxt$/)
  })

  it('never lowers a status and leaves other categories alone', () => {
    const result = analyze([
      req('Kubernetes', { status: 'match' }),
      req('Vue', { category: 'experience', status: 'missing', evidence: '' }),
    ])
    expect(result.requirements.map(r => r.status)).toEqual(['match', 'missing'])
  })

  it('clears evidence of missing and unknown requirements', () => {
    const result = analyze([req('Go', { status: 'missing', evidence: 'none' }), req('Travel', { category: 'format', status: 'unknown', evidence: '?' })])
    expect(result.requirements.map(r => r.evidence)).toEqual(['', ''])
  })

  it('cuts long texts and the number of requirements', () => {
    const many = Array.from({ length: 40 }, (_, i) => req(`Skill ${i}`))
    const result = analyze([req('x'.repeat(150), { evidence: 'y'.repeat(300) }), ...many], { title: 't'.repeat(200) })
    expect(result.requirements).toHaveLength(25)
    expect(result.requirements[0]!.name.length).toBeLessThanOrEqual(80)
    expect(result.requirements[0]!.evidence.length).toBeLessThanOrEqual(200)
    expect(result.title.length).toBeLessThanOrEqual(120)
  })
})
