import { z } from 'zod'
import { LOCALES } from './cv/schema'
import { briefFitSchema, vacancyBriefSchema } from './interview/brief'
import { prioritiesSchema } from './match/report'
import { MATCH_LIMITS, REQUIREMENT_CATEGORIES, REQUIREMENT_IMPORTANCE, REQUIREMENT_STATUSES } from './match/schema'

export const LEAD_LIMITS = {
  name: 100,
  contact: 100,
  company: 100,
  comment: 1000,
} as const

const optionalText = (max: number) => z.string().trim().max(max).optional()

// What a lead is sent from: the interview brief or the match report. The report goes without
// evidence (it fits the size limit) and without the percentage: the server recomputes it.
const briefLeadSchema = z.strictObject({
  kind: z.literal('brief'),
  brief: vacancyBriefSchema,
  fit: briefFitSchema,
})

const reportLeadSchema = z.strictObject({
  kind: z.literal('report'),
  title: z.string().trim().min(1).max(MATCH_LIMITS.titleChars),
  company: z.string().trim().max(MATCH_LIMITS.titleChars),
  requirements: z.array(z.strictObject({
    name: z.string().trim().min(1).max(MATCH_LIMITS.nameChars),
    category: z.enum(REQUIREMENT_CATEGORIES),
    importance: z.enum(REQUIREMENT_IMPORTANCE),
    status: z.enum(REQUIREMENT_STATUSES),
  })).min(1).max(MATCH_LIMITS.requirements),
  priorities: prioritiesSchema,
})

export const leadSubjectSchema = z.discriminatedUnion('kind', [briefLeadSchema, reportLeadSchema])
export type LeadSubject = z.infer<typeof leadSubjectSchema>
export type ReportLead = z.infer<typeof reportLeadSchema>

// Body of POST /api/lead. Strict: nothing but the form, what it was sent from and the locale.
const formSchema = {
  name: optionalText(LEAD_LIMITS.name),
  contact: z.string().trim().min(3).max(LEAD_LIMITS.contact),
  company: optionalText(LEAD_LIMITS.company),
  comment: optionalText(LEAD_LIMITS.comment),
  // Honeypot: hidden from people, bots fill it in
  website: z.string().max(200).optional(),
  locale: z.enum(LOCALES),
}

export const leadRequestSchema = z.discriminatedUnion('kind', [
  briefLeadSchema.extend(formSchema),
  reportLeadSchema.extend(formSchema),
])
export type LeadRequest = z.infer<typeof leadRequestSchema>

export const LEAD_ERROR_CODES = ['invalid', 'forbidden', 'rate_limit', 'unavailable', 'send_failed'] as const
export type LeadErrorCode = typeof LEAD_ERROR_CODES[number]
