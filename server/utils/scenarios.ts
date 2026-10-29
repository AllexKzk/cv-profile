import type { Cv } from '#shared/cv'
import type { ChatScenario } from '#shared/types/chat'
import { buildBasePrompt } from './prompts/base'
import { FREE_CHAT_PROMPT } from './prompts/free'
import { showCvSection } from './tools/show-cv-section'

// A scenario is a system prompt and a set of tools. F4–F6 add a line each.
export const scenarios = {
  free: {
    system: (cv: Cv, now?: Date) => `${buildBasePrompt(cv, now)}\n\n${FREE_CHAT_PROMPT}`,
    tools: { showCvSection },
  },
} satisfies Record<ChatScenario, unknown>
