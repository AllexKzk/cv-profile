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

// Tools the agent can call. Filled in F3+.
export type CvTools = Record<never, never>

export type CvUIMessage = UIMessage<unknown, CvDataParts, CvTools>
export type CvMessagePart = CvUIMessage['parts'][number]
export type CvDataPart<K extends keyof CvDataParts> = Extract<CvMessagePart, { type: `data-${K}` }>
