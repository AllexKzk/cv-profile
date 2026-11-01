import type { MatchLevel, MatchScore, RequirementCategory, RequirementImportance, RequirementStatus } from './schema'

// 'none' comes from the user saying a requirement does not matter (F6): weight 0, out of the score
export type ScoreImportance = RequirementImportance | 'none'

export interface ScoredRequirement {
  name: string
  category: RequirementCategory
  importance: ScoreImportance
  status: RequirementStatus
}

export interface MatchWeights {
  importance: Record<ScoreImportance, number>
  // unknown is never scored: the CV is silent, which is neither a match nor a gap
  status: Record<Exclude<RequirementStatus, 'unknown'>, number>
}

export const DEFAULT_WEIGHTS: MatchWeights = {
  importance: { must: 3, nice: 1, none: 0 },
  status: { match: 1, partial: 0.5, missing: 0 },
}

// Lower bounds of the levels, highest first
const LEVELS: [MatchLevel, number][] = [['strong', 80], ['good', 60], ['partial', 40], ['weak', 0]]

export function matchLevel(percent: number): MatchLevel {
  return LEVELS.find(([, min]) => percent >= min)![0]
}

// Weighted share of the CV's coverage, 0–100, or null when nothing can be scored
function weightedPercent(requirements: ScoredRequirement[], weights: MatchWeights): number | null {
  let earned = 0
  let total = 0
  for (const { importance, status } of requirements) {
    const weight = weights.importance[importance]
    if (status === 'unknown' || weight <= 0) continue
    earned += weight * weights.status[status]
    total += weight
  }
  return total > 0 ? Math.round((100 * earned) / total) : null
}

// Deterministic score of a classified vacancy. The model classifies, the percentage is ours:
// stable for the same classification and explainable requirement by requirement.
export function computeMatchScore(requirements: ScoredRequirement[], weights: MatchWeights = DEFAULT_WEIGHTS): MatchScore {
  const percent = weightedPercent(requirements, weights)

  const counts = { match: 0, partial: 0, missing: 0, unknown: 0 }
  for (const { status } of requirements) counts[status]++

  const categories = [...new Set(requirements.map(r => r.category))]
  const byCategory = categories.flatMap((category) => {
    const inCategory = requirements.filter(r => r.category === category)
    const categoryPercent = weightedPercent(inCategory, weights)
    return categoryPercent === null ? [] : [{ category, percent: categoryPercent, total: inCategory.length }]
  })

  return {
    percent,
    level: percent === null ? null : matchLevel(percent),
    counts,
    mustMissing: requirements.filter(r => r.importance === 'must' && r.status === 'missing').map(r => r.name),
    byCategory,
  }
}
