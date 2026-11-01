import { z } from 'zod'

export const REQUIREMENT_CATEGORIES = ['stack', 'experience', 'domain', 'format', 'language', 'education', 'other'] as const
export type RequirementCategory = typeof REQUIREMENT_CATEGORIES[number]

export const REQUIREMENT_IMPORTANCE = ['must', 'nice'] as const
export type RequirementImportance = typeof REQUIREMENT_IMPORTANCE[number]

// unknown: the CV says nothing either way (travel, salary, soft skills); not part of the score
export const REQUIREMENT_STATUSES = ['match', 'partial', 'missing', 'unknown'] as const
export type RequirementStatus = typeof REQUIREMENT_STATUSES[number]

// Limits applied by the server after the model answers; the model input itself is lenient,
// so an over-long line is cut instead of failing the whole analysis
export const MATCH_LIMITS = {
  requirements: 25,
  titleChars: 120,
  nameChars: 80,
  evidenceChars: 200,
} as const

const requirementSchema = z.object({
  name: z.string().min(1).max(200).describe('Short requirement name, e.g. "Vue 3", "5+ years of frontend", "Fintech"'),
  category: z.enum(REQUIREMENT_CATEGORIES),
  importance: z.enum(REQUIREMENT_IMPORTANCE).describe('must: required / "you have"; nice: "nice to have", "a plus"'),
  status: z.enum(REQUIREMENT_STATUSES).describe('match: the CV clearly covers it; partial: related or less experience; missing: the CV shows the candidate lacks it; unknown: the CV does not say'),
  evidence: z.string().max(400).describe('The CV fact behind the status, a few words; empty for missing and unknown'),
})

export type Requirement = z.infer<typeof requirementSchema>

// What the model fills in when it calls analyzeVacancy (the structured output of the analysis)
export const analyzeVacancyInputSchema = z.object({
  title: z.string().min(1).max(300).describe('Job title from the vacancy'),
  company: z.string().max(300).describe('Company name, empty if not stated'),
  requirements: z.array(requirementSchema).min(1).max(40),
})

export type AnalyzeVacancyInput = z.infer<typeof analyzeVacancyInputSchema>

export const MATCH_LEVELS = ['strong', 'good', 'partial', 'weak'] as const
export type MatchLevel = typeof MATCH_LEVELS[number]

export const matchScoreSchema = z.object({
  // null: nothing to score (every requirement is unknown or ignored)
  percent: z.number().min(0).max(100).nullable(),
  level: z.enum(MATCH_LEVELS).nullable(),
  counts: z.object({ match: z.number(), partial: z.number(), missing: z.number(), unknown: z.number() }),
  // Names of must-have requirements the CV lacks
  mustMissing: z.array(z.string()),
  byCategory: z.array(z.object({
    category: z.enum(REQUIREMENT_CATEGORIES),
    percent: z.number().min(0).max(100),
    total: z.number(),
  })),
})

export type MatchScore = z.infer<typeof matchScoreSchema>

// The analysis shown to the user: cleaned requirements and the score computed by code
export const vacancyAnalysisSchema = z.object({
  title: z.string(),
  company: z.string(),
  requirements: z.array(requirementSchema),
  score: matchScoreSchema,
})

export type VacancyAnalysis = z.infer<typeof vacancyAnalysisSchema>
