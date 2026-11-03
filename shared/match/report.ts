import { z } from 'zod'
import { computeMatchScore } from './match-score'
import type { ScoreImportance } from './match-score'
import { MATCH_LIMITS } from './schema'
import type { MatchScore, Requirement } from './schema'

// The report's clarifications: how critical a gap in a must-have is, answered in the report itself.
// The score is recomputed by code from these answers; the model is not asked again.

export const MAX_CLARIFICATIONS = 5
export const MAX_STRENGTHS = 4
export const MAX_RISKS = 5

export const PRIORITIES = ['must', 'nice', 'none'] as const satisfies readonly ScoreImportance[]
export type Priority = typeof PRIORITIES[number]

// Requirement name → the importance the visitor picked; only changed values are stored
export const prioritiesSchema = z.record(z.string().min(1).max(MATCH_LIMITS.nameChars), z.enum(PRIORITIES))
  .refine(values => Object.keys(values).length <= MAX_CLARIFICATIONS, { message: `At most ${MAX_CLARIFICATIONS} priorities` })

export type Priorities = z.infer<typeof prioritiesSchema>

// `data-priorities`: the visitor's answers, `source` is the toolCallId of the analysis
export const prioritiesDataSchema = z.object({
  source: z.string().min(1).max(100),
  values: prioritiesSchema,
})

type Classified = Pick<Requirement, 'name' | 'importance' | 'status'>

// Must-haves the CV lacks, then the partly covered ones, in the order of the analysis
export function clarificationCandidates<T extends Classified>(requirements: T[]): T[] {
  const must = requirements.filter(r => r.importance === 'must')
  return [
    ...must.filter(r => r.status === 'missing'),
    ...must.filter(r => r.status === 'partial'),
  ].slice(0, MAX_CLARIFICATIONS)
}

// The visitor's answers apply only to the requirements they were asked about
export function applyPriorities<T extends Classified>(requirements: T[], priorities: Priorities = {}) {
  const asked = new Set(clarificationCandidates(requirements).map(r => r.name))
  return requirements.map((r): Omit<T, 'importance'> & { importance: ScoreImportance } =>
    (asked.has(r.name) && priorities[r.name] ? { ...r, importance: priorities[r.name]! } : r))
}

// The score after the visitor's answers
export function scoreWithPriorities(requirements: (Classified & Pick<Requirement, 'category'>)[], priorities?: Priorities): MatchScore {
  return computeMatchScore(applyPriorities(requirements, priorities))
}

const IMPORTANCE_ORDER: Record<ScoreImportance, number> = { must: 0, nice: 1, none: 2 }

// Strengths and risks of the report, built by code so they follow the visitor's answers
export function reportHighlights<T extends { importance: ScoreImportance, status: Requirement['status'] }>(requirements: T[]) {
  const strengths = requirements
    .filter(r => r.status === 'match' && r.importance !== 'none')
    .sort((a, b) => IMPORTANCE_ORDER[a.importance] - IMPORTANCE_ORDER[b.importance])
    .slice(0, MAX_STRENGTHS)
  const must = requirements.filter(r => r.importance === 'must')
  const risks = [
    ...must.filter(r => r.status === 'missing'),
    ...must.filter(r => r.status === 'partial'),
    ...must.filter(r => r.status === 'unknown'),
  ]
  return { strengths, risks: risks.slice(0, MAX_RISKS), moreRisks: Math.max(0, risks.length - MAX_RISKS) }
}

const PRIORITY_FOR_MODEL: Record<Priority, string> = {
  must: 'required',
  nice: 'nice to have',
  none: 'not important',
}

// One line for the model instead of JSON. No percentage, as with the analysis itself.
export function prioritiesForModel(priorities: Priorities, score?: MatchScore): string {
  const list = Object.entries(priorities).map(([name, value]) => `${name} — ${PRIORITY_FOR_MODEL[value]}`).join('; ')
  const level = score?.level ? `. Updated level: ${score.level}` : ''
  return `[The visitor clarified in the report how critical the gaps are: ${list}${level}]`
}
