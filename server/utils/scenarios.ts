import type { Cv } from '#shared/cv'
import type { ChatScenario } from '#shared/types/chat'
import { buildBasePrompt } from './prompts/base'
import { FREE_CHAT_PROMPT } from './prompts/free'
import { INTERVIEW_PROMPT } from './prompts/interview'
import { askQuestion } from './tools/ask-question'
import { showCvSection } from './tools/show-cv-section'
import { submitBrief } from './tools/submit-brief'

// A scenario is a system prompt and a set of tools. F5–F6 add a line each.
// Tools get the CV of the request locale: submitBrief checks the brief against it.
export const scenarios = {
  free: {
    system: (cv: Cv, now?: Date) => `${buildBasePrompt(cv, now)}\n\n${FREE_CHAT_PROMPT}`,
    tools: (_cv: Cv) => ({ showCvSection }),
  },
  interview: {
    system: (cv: Cv, now?: Date) => `${buildBasePrompt(cv, now)}\n\n${FREE_CHAT_PROMPT}\n\n${INTERVIEW_PROMPT}`,
    tools: (cv: Cv) => ({ showCvSection, askQuestion, submitBrief: submitBrief(cv) }),
  },
} satisfies Record<ChatScenario, unknown>
