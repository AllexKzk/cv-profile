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
