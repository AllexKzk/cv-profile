import { describe, expect, it } from 'vitest'
import { getCv } from '../../shared/cv'
import { isSkillRequested, mentionsSkill, requestedSkillKeys } from '../../shared/cv/skill-match'

const cv = getCv('en')
const requested = (requirements: string[], texts: string[] = []) => {
  const keys = requestedSkillKeys(cv, requirements, texts)
  return (...names: string[]) => isSkillRequested(keys, names)
}

describe('mentionsSkill', () => {
  it('finds a skill as a word of its own, any case', () => {
    expect(mentionsSkill('Has he worked with vue and Playwright?', 'Vue')).toBe(true)
    expect(mentionsSkill('Next.js or Nuxt?', 'Next.js')).toBe(true)
    expect(mentionsSkill('Vuex is fine', 'Vue')).toBe(false)
  })

  it('needs the exact case for short names', () => {
    expect(mentionsSkill('Any Go experience?', 'Go')).toBe(true)
    expect(mentionsSkill('Let\'s go with the interview', 'Go')).toBe(false)
    expect(mentionsSkill('TS on the backend?', 'TS')).toBe(true)
  })
})

describe('requested skills', () => {
  it('matches vacancy and brief requirements by name, alias and parts', () => {
    const is = requested(['Vue.js 3 (Composition API)', 'NextJS', 'TS'])
    expect(is('Vue / Nuxt', 'Vue', 'Vue.js')).toBe(true)
    expect(is('React / Next.js')).toBe(true)
    expect(is('TypeScript', 'TS')).toBe(true)
    expect(is('Go')).toBe(false)
  })

  it('finds the CV skills the visitor named in their messages', () => {
    const is = requested([], ['Does he know Playwright and GraphQL?'])
    expect(is('Playwright')).toBe(true)
    expect(is('GraphQL')).toBe(true)
    expect(is('Jest')).toBe(false)
  })

  it('highlights nothing when nothing was asked', () => {
    expect(requested([], ['Show CV'])('TypeScript', 'TS')).toBe(false)
  })
})
