import type { Cv } from '#shared/cv'
import type { ChatScenario } from '#shared/types/chat'
import { buildBasePrompt } from './prompts/base'
import { FREE_CHAT_PROMPT } from './prompts/free'
import { INTERVIEW_PROMPT } from './prompts/interview'
import { buildMatchPrompt } from './prompts/match'
import { askQuestion } from './tools/ask-question'
import { createAnalyzeVacancy } from './tools/analyze-vacancy'
import { showCvSection } from './tools/show-cv-section'
import { submitBrief } from './tools/submit-brief'

// Every scenario gets every tool: history may hold calls of any of them, and the model and
// convertToModelMessages must know a tool to read its past calls. Prompts say which to use.
// Tools get the CV of the request locale: submitBrief and analyzeVacancy check against it.
export const chatTools = (cv: Cv) => ({
  showCvSection,
  askQuestion,
  submitBrief: submitBrief(cv),
  analyzeVacancy: createAnalyzeVacancy(cv),
})

export interface Scenario {
  system: (cv: Cv, now?: Date) => string
  // Per step, reasoning included: the requirements list of an analysis is longer than a usual
  // answer, and the model may think for ~1k tokens before writing it
  maxOutputTokens: number
}

// A scenario is a system prompt and its limits
export const scenarios = {
  free: {
    system: (cv, now) => `${buildBasePrompt(cv, now)}\n\n${FREE_CHAT_PROMPT}`,
    maxOutputTokens: 800,
  },
  interview: {
    system: (cv, now) => `${buildBasePrompt(cv, now)}\n\n${FREE_CHAT_PROMPT}\n\n${INTERVIEW_PROMPT}`,
    maxOutputTokens: 800,
  },
  match: {
    system: (cv, now) => `${buildBasePrompt(cv, now)}\n\n${buildMatchPrompt(cv)}`,
    maxOutputTokens: 4000,
  },
} satisfies Record<ChatScenario, Scenario>
