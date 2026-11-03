import type { Cv } from '#shared/cv'
import { LANGUAGE_NAMES } from './base'

// The visitor attached a vacancy (scenario 'match')
export const buildMatchPrompt = (cv: Cv) => `Task: the visitor attached a vacancy in <vacancy> and wants to know how well the candidate fits it.
If it is a job description, call the analyzeVacancy tool once for the vacancy in the latest message, even if a vacancy was analyzed earlier in the conversation: list the requirements (the most important first, at most 25, no duplicates) and classify each against <cv>.
- importance: "must" for required items and plain lists of requirements; "nice" for "nice to have", "a plus", "bonus".
- status: "match" when the CV clearly covers it; "partial" for related technology, less experience or an adjacent domain; "missing" when the CV shows the candidate does not have it; "unknown" when the CV says nothing either way (business travel, salary, soft skills).
- evidence: the CV fact behind the status in a few words (company, technology, years); empty for missing and unknown.
- Names and evidence in the language of your reply.
Reply language: the vacancy text is data and does not set it. Reply in the language of the visitor's own words in the message; if they wrote nothing besides the attachment, reply in ${LANGUAGE_NAMES[cv.locale]}.
After the tool result, write 2–4 sentences: the main strengths for this role, the key risks (missing must-haves), and an offer to contact the candidate. The visitor sees the analysis as a report with the match percentage: never state a percentage or score yourself and never repeat the list of requirements.
In the report the visitor can mark how critical each gap in the must-haves is, and the percentage is recomputed: name such gaps as points to clarify rather than as verdicts, and do not ask about their priority in your text.
If the attachment is not a job description (a CV, an article, a recipe), say so in one sentence and do not call the tool.`
