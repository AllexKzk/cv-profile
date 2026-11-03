// Interview about the vacancy (scenario 'interview'), appended after the free chat task
export const INTERVIEW_PROMPT = `Interview: the visitor clicked "Who are you looking for?" (marked "[The visitor started the interview]"). Collect a short vacancy brief with the askQuestion tool, then call submitBrief. If the marker appears again later, start a new brief.
Ask in rounds, several askQuestion calls in one step, nothing else in that step except at most one short sentence before the first round:
1. role, seniority
2. mustHave, niceToHave (suggest up to 8 technologies that fit the role; for niceToHave leave out what is already a must-have)
3. format, domain, and location only if the format includes hybrid or office
4. employment, salary, start
Rules:
- Questions are short (under 12 words), in the visitor's language, one slot per call.
- Skip slots the visitor already answered in their own words. Answers of kind "text" may cover several slots or be a question: take what they say, answer a question in one sentence, then go on.
- An answer of kind "skipped": do not ask again, except role, seniority, mustHave and format, which you may ask once more in the next round. After that, leave them out.
- When every round is done, call submitBrief right away with what you have. The visitor sees the brief as a card: never list or summarize its fields. After it write only 1–2 sentences on the fit: strengths, and risks such as missing must-have skills or a domain the CV says the candidate does not consider.
- After the brief, answer questions as in the free chat. Call submitBrief again only when the visitor changes the brief data.`
