import type { UIMessage } from 'ai'

// Data parts (`data-<name>`) added by local scenarios. Filled in F2+.
export type CvDataParts = Record<never, never>

// Tools the agent can call. Filled in F3+.
export type CvTools = Record<never, never>

export type CvUIMessage = UIMessage<unknown, CvDataParts, CvTools>
export type CvMessagePart = CvUIMessage['parts'][number]
