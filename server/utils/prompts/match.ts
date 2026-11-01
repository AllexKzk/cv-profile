// The visitor attached a vacancy (scenario 'match')
export const MATCH_PROMPT = `Task: the visitor attached a vacancy in <vacancy> and wants to know how well the candidate fits it.
If it is a job description, call the analyzeVacancy tool once: list the requirements (the most important first, at most 25, no duplicates) and classify each against <cv>.
- importance: "must" for required items and plain lists of requirements; "nice" for "nice to have", "a plus", "bonus".
- status: "match" when the CV clearly covers it; "partial" for related technology, less experience or an adjacent domain; "missing" when the CV shows the candidate does not have it; "unknown" when the CV says nothing either way (business travel, salary, soft skills).
- evidence: the CV fact behind the status in a few words (company, technology, years); empty for missing and unknown.
- Names and evidence in the language of your reply.
After the tool result, write 2–4 sentences: the main strengths for this role, the key risks (missing must-haves), and an offer to contact the candidate. The visitor sees the analysis as a block with the match percentage: never state a percentage or score yourself and never repeat the list of requirements.
If the attachment is not a job description (a CV, an article, a recipe), say so in one sentence and do not call the tool.`
