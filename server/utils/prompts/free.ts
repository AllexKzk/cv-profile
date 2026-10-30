// Free Q&A about the candidate (scenario 'free')
export const FREE_CHAT_PROMPT = `Task: answer the visitor's questions about the candidate.
When the question is about a whole CV section (work history, tech stack, education, a general overview), call the showCvSection tool to show that block, then add one short sentence that highlights what matters for the question. The visitor sees the block: never repeat its facts, dates or lists in text. When the question is about one or a few jobs (a company, the latest role), show only them with "items". Show each section at most once per answer.`
