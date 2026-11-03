import type { Cv } from './schema'

// 'Vue.js', 'VueJS', 'vue js' → 'vue'; 'Node.js' → 'node'. A bare 'JS' stays 'js'.
export function normalizeSkill(name: string): string {
  const flat = name.toLowerCase().replace(/[\s._-]+/g, '')
  const stripped = flat.replace(/js$/, '')
  return stripped || flat
}

// Every spelling the CV knows a skill by: skill names, their parts ('React / Next.js'), aliases
// and the stacks of jobs. Normalized, so lookups are a set check.
export function cvSkillNames(cv: Cv): Set<string> {
  const names = new Set<string>()
  const add = (name: string) => {
    names.add(normalizeSkill(name))
    for (const part of name.split('/')) names.add(normalizeSkill(part))
  }
  for (const group of cv.skills) {
    for (const skill of group.items) {
      add(skill.name)
      skill.aliases.forEach(add)
    }
  }
  for (const job of cv.experience) job.stack.forEach(add)
  names.delete('')
  return names
}

// Whether a requirement like 'Vue.js' or 'TS' is in the CV
export function hasSkill(names: Set<string>, requirement: string): boolean {
  return names.has(normalizeSkill(requirement))
}

// Every spelling of the CV's skills as written (names, their parts, aliases, job stacks),
// to find them in the visitor's own words
export function cvSkillSpellings(cv: Cv): string[] {
  const spellings = new Set<string>()
  const add = (name: string) => {
    spellings.add(name.trim())
    for (const part of name.split('/')) spellings.add(part.trim())
  }
  for (const group of cv.skills) {
    for (const skill of group.items) {
      add(skill.name)
      skill.aliases.forEach(add)
    }
  }
  for (const job of cv.experience) job.stack.forEach(add)
  spellings.delete('')
  return [...spellings]
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Whether a skill is named in free text as a word of its own. Short names ('Go', 'TS', 'JS')
// must match the case: "let's go" is not Go
export function mentionsSkill(text: string, spelling: string): boolean {
  const flags = spelling.length <= 2 ? 'u' : 'iu'
  return new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(spelling)}(?![\\p{L}\\p{N}])`, flags).test(text)
}

/**
 * Normalized names of the skills the visitor asked for: skill requirements (a vacancy, a brief)
 * as they are, and the CV's skills named in the visitor's messages.
 */
export function requestedSkillKeys(cv: Cv, requirements: string[], texts: string[]): Set<string> {
  const keys = new Set<string>()
  for (const requirement of requirements) {
    // 'Vue 3 (Composition API)', 'React/Redux': the whole name, without the parentheses, each part,
    // each also without a trailing version ('React 18', 'Vue.js 3')
    const bare = requirement.replace(/\s*\(.*?\)\s*/g, ' ')
    for (const name of [requirement, bare, ...bare.split(/[/,]/)]) {
      keys.add(normalizeSkill(name.trim()))
      keys.add(normalizeSkill(name.trim().replace(/\s*v?\d+(\.\d+)*\+?$/i, '')))
    }
  }
  const spellings = cvSkillSpellings(cv)
  for (const text of texts) {
    for (const spelling of spellings) {
      if (mentionsSkill(text, spelling)) keys.add(normalizeSkill(spelling))
    }
  }
  keys.delete('')
  return keys
}

// Whether a CV skill, known by these names ('React / Next.js', its aliases), was asked for
export function isSkillRequested(keys: Set<string>, names: string[]): boolean {
  return names.some(name => keys.has(normalizeSkill(name)) || name.split('/').some(part => keys.has(normalizeSkill(part.trim()))))
}
