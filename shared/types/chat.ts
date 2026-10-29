import type { UIMessage } from 'ai'
import { z } from 'zod'

// CV sections that can be shown as blocks, in the order of a full CV
export const CV_SECTIONS = ['hero', 'about', 'experience', 'education', 'skills'] as const
export type CvSection = typeof CV_SECTIONS[number]

// Data parts (`data-<name>`) added by local scenarios. They reference CV data instead of copying it,
// so a shown CV follows the current locale and stored history stays small.
export const cvDataSchemas = {
  cv: z.object({ section: z.enum(CV_SECTIONS) }),
  download: z.object({}),
}

export type CvDataParts = { [K in keyof typeof cvDataSchemas]: z.infer<typeof cvDataSchemas[K]> }

// Tools the agent can call. Schemas live here so the server tool, stored history and
// the client share one definition.
const cvSectionSchema = z.object({ section: z.enum(CV_SECTIONS) })

export const cvToolSchemas = {
  // Server tool: the agent shows a CV block instead of retelling it
  showCvSection: { inputSchema: cvSectionSchema, outputSchema: cvSectionSchema },
}

type ToolTypes<T extends Record<string, { inputSchema: z.ZodType, outputSchema: z.ZodType }>> = {
  [K in keyof T]: { input: z.infer<T[K]['inputSchema']>, output: z.infer<T[K]['outputSchema']> }
}

export type CvTools = ToolTypes<typeof cvToolSchemas>

export type CvUIMessage = UIMessage<unknown, CvDataParts, CvTools>
export type CvMessagePart = CvUIMessage['parts'][number]
export type CvDataPart<K extends keyof CvDataParts> = Extract<CvMessagePart, { type: `data-${K}` }>
export type CvToolPart<K extends keyof CvTools> = Extract<CvMessagePart, { type: `tool-${K}` }>

// Conversation scenarios of /api/chat. F4–F6 add 'interview' and 'match'.
export const CHAT_SCENARIOS = ['free'] as const
export type ChatScenario = typeof CHAT_SCENARIOS[number]

// Error codes /api/chat answers with; the client maps them to i18n texts
export const CHAT_ERROR_CODES = ['invalid', 'forbidden', 'rate_limit', 'ip_budget', 'daily_limit', 'model_error'] as const
export type ChatErrorCode = typeof CHAT_ERROR_CODES[number]
