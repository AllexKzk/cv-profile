import { z } from 'zod'
import { LOCALES } from './cv/schema'
import { briefFitSchema, vacancyBriefSchema } from './interview/brief'

export const LEAD_LIMITS = {
  name: 100,
  contact: 100,
  company: 100,
  comment: 1000,
} as const

const optionalText = (max: number) => z.string().trim().max(max).optional()

// Body of POST /api/lead. Strict: nothing but the form, the brief it was sent from and the locale.
export const leadRequestSchema = z.strictObject({
  name: optionalText(LEAD_LIMITS.name),
  contact: z.string().trim().min(3).max(LEAD_LIMITS.contact),
  company: optionalText(LEAD_LIMITS.company),
  comment: optionalText(LEAD_LIMITS.comment),
  // Honeypot: hidden from people, bots fill it in
  website: z.string().max(200).optional(),
  brief: vacancyBriefSchema,
  fit: briefFitSchema,
  locale: z.enum(LOCALES),
})
export type LeadRequest = z.infer<typeof leadRequestSchema>

export const LEAD_ERROR_CODES = ['invalid', 'forbidden', 'rate_limit', 'unavailable', 'send_failed'] as const
export type LeadErrorCode = typeof LEAD_ERROR_CODES[number]
