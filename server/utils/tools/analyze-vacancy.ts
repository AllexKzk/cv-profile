import { tool } from 'ai'
import type { Cv } from '#shared/cv'
import { computeMatchScore } from '#shared/match/match-score'
import { MATCH_LIMITS } from '#shared/match/schema'
import type { AnalyzeVacancyInput, Requirement, VacancyAnalysis } from '#shared/match/schema'
import { cvToolSchemas } from '#shared/types/chat'

const key = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ')

const clip = (text: string, max: number) => {
  const trimmed = text.trim()
  return trimmed.length > max ? `${trimmed.slice(0, max - 1).trimEnd()}…` : trimmed
}

// Skill names and aliases of the CV → "Group: Skill", the evidence for a stack requirement
function skillIndex(cv: Cv): Map<string, string> {
  const index = new Map<string, string>()
  for (const group of cv.skills) {
    for (const skill of group.items) {
      for (const name of [skill.name, ...skill.aliases]) index.set(key(name), `${group.name}: ${skill.name}`)
    }
  }
  return index
}

// Cleans what the model sent and scores it. The model classifies; this code only cuts, dedupes,
// corrects stack requirements up by skill aliases (never down) and computes the percentage.
export function buildVacancyAnalysis(input: AnalyzeVacancyInput, cv: Cv): VacancyAnalysis {
  const skills = skillIndex(cv)
  const seen = new Set<string>()
  const requirements: Requirement[] = []

  for (const raw of input.requirements) {
    const name = clip(raw.name, MATCH_LIMITS.nameChars)
    if (!name || seen.has(key(name))) continue
    seen.add(key(name))

    let { status, evidence } = raw
    // "Vue 3 (Composition API)" is looked up as is and without the parenthesized part
    const skill = raw.category === 'stack'
      ? skills.get(key(name)) ?? skills.get(key(name.replace(/\s*\(.*?\)\s*/g, ' ')))
      : undefined
    if (skill && status !== 'match') {
      status = 'match'
      evidence = skill
    }
    if (status === 'missing' || status === 'unknown') evidence = ''

    requirements.push({ ...raw, name, status, evidence: clip(evidence, MATCH_LIMITS.evidenceChars) })
    if (requirements.length === MATCH_LIMITS.requirements) break
  }

  return {
    title: clip(input.title, MATCH_LIMITS.titleChars),
    company: clip(input.company, MATCH_LIMITS.titleChars),
    requirements,
    score: computeMatchScore(requirements),
  }
}

export function createAnalyzeVacancy(cv: Cv) {
  return tool({
    description: 'Analyze the vacancy the visitor attached in <vacancy>: list its requirements (up to 25, the most important first, merge duplicates) and classify each one against the CV. The visitor sees the result with a match percentage computed by the site.',
    // No `strict`: the OpenRouter provider does not pass it on. The zod schema checks the input,
    // and an invalid call comes back to the model as a tool error it can fix in the next step.
    ...cvToolSchemas.analyzeVacancy,
    execute: async input => buildVacancyAnalysis(input, cv),
    // The model needs the classification for its summary, not the whole result again.
    // No percentage: the visitor sees it in the block, the model should not restate or round it.
    toModelOutput: ({ output }) => ({
      type: 'json',
      value: {
        level: output.score.level,
        mustMissing: output.score.mustMissing,
        requirements: output.requirements.map(r => `${r.name} (${r.importance}): ${r.status}`),
      },
    }),
  })
}
