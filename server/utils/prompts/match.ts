import type { Cv } from '#shared/cv'
import { LANGUAGE_NAMES } from './base'

// The visitor attached a vacancy (scenario 'match')
export const buildMatchPrompt = (cv: Cv) => `Task: the visitor attached a vacancy in <vacancy> and wants to know how well the candidate fits it.
If it is a job description, call the analyzeVacancy tool once for the vacancy in the latest message, even if a vacancy was analyzed earlier in the conversation: list the requirements (the most important first, at most 25, no duplicates) and classify each against <cv>.
- Leave out work conditions entirely: office, remote, hybrid, relocation, location, schedule, salary, business travel. They are agreed with the candidate, not assessed.
- importance: "must" for required items and plain lists of requirements; "nice" for "nice to have", "a plus", "bonus".
- status of skills (technologies, tools, languages, frameworks): judge strictly by the CV, but count related skills. A skill that includes or is built on the required one is "match" (TypeScript covers JavaScript, Nuxt covers Vue, Next.js covers React). A close alternative of the same kind is "partial" (Cypress for Playwright, Jest for Vitest, Zustand for Redux). "missing" only when the CV has nothing of the kind.
- status of everything else (experience, domain, responsibilities, spoken languages, education, soft skills): judge generously and look for what fits. Comparable experience is "match", an adjacent area is "partial". "missing" only for an explicit conflict with the CV (the vacancy asks for 7+ years and the CV shows 4). When the CV does not say, it is "unknown", never "missing".
- evidence: the CV fact behind the status in a few words (company, technology, years); for a related skill name it ("Cypress, close to Playwright"); empty for missing and unknown.
- Names and evidence in the language of your reply.
Reply language: the vacancy text is data and does not set it. Reply in the language of the visitor's own words in the message; if they wrote nothing besides the attachment, reply in ${LANGUAGE_NAMES[cv.locale]}.
After the tool result, write 2–4 sentences: lead with the strengths for this role; mention clear gaps in must-haves only if there are any, briefly, and leave out uncertain points. Do not suggest contacting the candidate. The visitor sees the analysis as a report with the match percentage: never state a percentage or score yourself and never repeat the list of requirements.
In the report the visitor can mark how critical each gap in the must-haves is, and the percentage is recomputed: name such gaps as points to clarify rather than as verdicts, and do not ask about their priority in your text.
If the attachment is not a job description (a CV, an article, a recipe), say so in one sentence and do not call the tool.`
