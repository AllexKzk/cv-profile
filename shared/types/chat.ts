import type { UIMessage } from 'ai'
import { z } from 'zod'
import { askQuestionInputSchema, askQuestionOutputSchema, submitBriefOutputSchema, vacancyBriefSchema } from '../interview/brief'
import { prioritiesDataSchema } from '../match/report'
import { analyzeVacancyInputSchema, vacancyAnalysisSchema } from '../match/schema'
import { vacancyDataSchema } from '../vacancy'

// CV sections that can be shown as blocks, in the order of a full CV
export const CV_SECTIONS = ['hero', 'about', 'experience', 'education', 'skills'] as const
export type CvSection = typeof CV_SECTIONS[number]

// A CV section to show. `items` narrows a list section to some of its entries by id
// (experience: one or a few jobs); without it the whole section is shown.
const cvSectionSchema = z.object({
  section: z.enum(CV_SECTIONS),
  items: z.array(z.string().max(64)).max(10).optional(),
})

// Data parts (`data-<name>`). CV parts are added by local scenarios and reference CV data instead
// of copying it, so a shown CV follows the current locale and stored history stays small.
// `vacancy` is the job description the user attached to a message.
export const cvDataSchemas = {
  cv: cvSectionSchema,
  download: z.object({}),
  // Invisible marker in the user message of the quick action: the interview starts here
  interview: z.object({}),
  // Confirmation of a sent lead; `source` is the toolCallId of the brief or analysis it was sent from
  lead: z.object({ source: z.string().min(1).max(100) }),
  vacancy: vacancyDataSchema,
  // The visitor's answers to the clarifications of a match report, kept in the analysis message
  priorities: prioritiesDataSchema,
}

export type CvDataParts = { [K in keyof typeof cvDataSchemas]: z.infer<typeof cvDataSchemas[K]> }

// Tools the agent can call. Schemas live here so the server tool, stored history and
// the client share one definition.

export const cvToolSchemas = {
  // Server tool: the agent shows a CV block instead of retelling it
  showCvSection: { inputSchema: cvSectionSchema, outputSchema: cvSectionSchema },
  // Client tool (no execute): a question with a widget, the visitor's answer is its output
  askQuestion: { inputSchema: askQuestionInputSchema, outputSchema: askQuestionOutputSchema },
  // Server tool: the collected brief and its quick fit against the CV
  submitBrief: { inputSchema: vacancyBriefSchema, outputSchema: submitBriefOutputSchema },
  // Server tool: the model classifies vacancy requirements against the CV, the server adds the score
  analyzeVacancy: { inputSchema: analyzeVacancyInputSchema, outputSchema: vacancyAnalysisSchema },
}

type ToolTypes<T extends Record<string, { inputSchema: z.ZodType, outputSchema: z.ZodType }>> = {
  [K in keyof T]: { input: z.infer<T[K]['inputSchema']>, output: z.infer<T[K]['outputSchema']> }
}

export type CvTools = ToolTypes<typeof cvToolSchemas>

export type CvUIMessage = UIMessage<unknown, CvDataParts, CvTools>
export type CvMessagePart = CvUIMessage['parts'][number]
export type CvDataPart<K extends keyof CvDataParts> = Extract<CvMessagePart, { type: `data-${K}` }>
export type CvToolPart<K extends keyof CvTools> = Extract<CvMessagePart, { type: `tool-${K}` }>

// Conversation scenarios of /api/chat: 'interview' after the quick action,
// 'match' for a message with an attached vacancy
export const CHAT_SCENARIOS = ['free', 'interview', 'match'] as const
export type ChatScenario = typeof CHAT_SCENARIOS[number]

// Error codes /api/chat answers with; the client maps them to i18n texts
export const CHAT_ERROR_CODES = ['invalid', 'forbidden', 'rate_limit', 'ip_budget', 'daily_limit', 'model_error'] as const
export type ChatErrorCode = typeof CHAT_ERROR_CODES[number]
