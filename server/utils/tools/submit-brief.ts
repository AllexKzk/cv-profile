import { tool } from 'ai'
import type { Cv } from '#shared/cv'
import { briefFit } from '#shared/interview/fit'
import { cvToolSchemas } from '#shared/types/chat'

// Server tool: the client shows the brief as a card; the fit is computed by code, not the model
export function submitBrief(cv: Cv) {
  return tool({
    description: 'Submit the collected vacancy brief when the interview is over. Pass only what the visitor said; omit unknown fields. `format` uses remote / hybrid / office. Returns the brief with a quick fit: which skills are in the CV and whether the work format suits.',
    ...cvToolSchemas.submitBrief,
    execute: async brief => ({ brief, fit: briefFit(brief, cv) }),
  })
}
