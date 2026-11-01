import { z } from 'zod'

// Slots of the vacancy brief, in the order the interview asks about them
export const INTERVIEW_SLOTS = [
  'role',
  'seniority',
  'mustHave',
  'niceToHave',
  'format',
  'location',
  'domain',
  'employment',
  'salary',
  'start',
] as const
export type InterviewSlot = typeof INTERVIEW_SLOTS[number]

export type QuestionWidget = 'single' | 'multi' | 'range' | 'text'

export interface SlotConfig {
  widget: QuestionWidget
  // Option keys, labels come from i18n `interview.options.<slot>.<key>`
  options: readonly string[]
  // Untranslated options (technology names) when the agent suggests none
  fallback?: readonly string[]
  // The agent may replace the options with its own suggestions
  agentOptions: boolean
  // An input for an answer that is not among the options
  custom: boolean
}

// The widget and options of a slot are fixed in code: the agent only words the question
export const SLOT_CONFIG: Record<InterviewSlot, SlotConfig> = {
  role: { widget: 'single', options: ['frontend', 'fullstack', 'lead'], agentOptions: true, custom: true },
  seniority: { widget: 'single', options: ['middle', 'senior', 'lead', 'staff'], agentOptions: false, custom: true },
  mustHave: {
    widget: 'multi',
    options: [],
    fallback: ['TypeScript', 'React', 'Vue', 'Nuxt', 'Next.js', 'Node.js'],
    agentOptions: true,
    custom: true,
  },
  niceToHave: {
    widget: 'multi',
    options: [],
    fallback: ['GraphQL', 'Playwright', 'Storybook', 'Docker', 'Go', 'Micro-frontends'],
    agentOptions: true,
    custom: true,
  },
  format: { widget: 'multi', options: ['remote', 'hybrid', 'office'], agentOptions: false, custom: false },
  location: { widget: 'text', options: [], agentOptions: false, custom: false },
  domain: { widget: 'single', options: ['fintech', 'ecommerce', 'saas', 'media', 'internal'], agentOptions: true, custom: true },
  employment: { widget: 'single', options: ['full', 'part', 'contract'], agentOptions: false, custom: false },
  salary: { widget: 'range', options: [], agentOptions: false, custom: false },
  start: { widget: 'single', options: ['asap', 'month', 'quarter', 'flexible'], agentOptions: false, custom: false },
}

export const CURRENCIES = ['RUB', 'USD', 'EUR'] as const
export const SALARY_PERIODS = ['month', 'year'] as const
export const BRIEF_FORMATS = ['remote', 'hybrid', 'office'] as const

// Free text the user may type instead of clicking: the same limit as a chat message
const ANSWER_TEXT_CHARS = 2000

const salarySchema = z.object({
  min: z.number().nonnegative().max(1e9).optional(),
  max: z.number().nonnegative().max(1e9).optional(),
  currency: z.enum(CURRENCIES),
  period: z.enum(SALARY_PERIODS),
})

// Input of the client tool `askQuestion`
export const askQuestionInputSchema = z.object({
  slot: z.enum(INTERVIEW_SLOTS),
  question: z.string().min(1).max(200),
  options: z.array(z.string().min(1).max(40)).max(8).optional(),
})
export type AskQuestionInput = z.infer<typeof askQuestionInputSchema>

// What the visitor answered: picked options (their labels), a salary range, text, or nothing
export const askQuestionOutputSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('options'), values: z.array(z.string().min(1).max(100)).min(1).max(15) }),
  z.object({ kind: z.literal('range'), ...salarySchema.shape }),
  z.object({ kind: z.literal('text'), text: z.string().min(1).max(ANSWER_TEXT_CHARS) }),
  z.object({ kind: z.literal('skipped') }),
])
export type QuestionAnswer = z.infer<typeof askQuestionOutputSchema>

const short = z.string().trim().min(1).max(100)
const skills = z.array(short).max(15)

// The brief the agent collects. Everything is optional: a recruiter may skip even
// required questions, the card then says "not specified".
export const vacancyBriefSchema = z.object({
  role: short.optional(),
  seniority: short.optional(),
  mustHave: skills.optional(),
  niceToHave: skills.optional(),
  format: z.array(z.enum(BRIEF_FORMATS)).max(3).optional(),
  location: z.string().trim().min(1).max(200).optional(),
  domain: short.optional(),
  employment: short.optional(),
  salary: salarySchema.optional(),
  start: short.optional(),
  company: short.optional(),
  notes: z.string().trim().min(1).max(500).optional(),
})
export type VacancyBrief = z.infer<typeof vacancyBriefSchema>

const skillFitSchema = z.array(z.object({ name: short, inCv: z.boolean() })).max(15)

// Quick fit computed by code: which listed skills the CV has, whether the format suits
export const briefFitSchema = z.object({
  mustHave: skillFitSchema,
  niceToHave: skillFitSchema,
  format: z.enum(['match', 'relocation', 'mismatch', 'unknown']),
})
export type BriefFit = z.infer<typeof briefFitSchema>

export const submitBriefOutputSchema = z.object({ brief: vacancyBriefSchema, fit: briefFitSchema })
export type SubmittedBrief = z.infer<typeof submitBriefOutputSchema>
