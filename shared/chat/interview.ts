import type { ChatScenario, CvToolPart, CvUIMessage } from '../types/chat'

// The scenario follows from history, so it survives a reload: once the quick action started
// the interview, the chat stays in it until reset (the interview prompt answers questions too)
export function chatScenario(messages: CvUIMessage[]): ChatScenario {
  const started = messages.some(message =>
    message.role === 'user' && message.parts.some(part => part.type === 'data-interview'))
  return started ? 'interview' : 'free'
}

// Parts of the last step of an assistant message (after its last `step-start`)
function lastStepParts(message: CvUIMessage) {
  const start = message.parts.findLastIndex(part => part.type === 'step-start')
  return message.parts.slice(start + 1)
}

function lastStepQuestions(messages: CvUIMessage[]): CvToolPart<'askQuestion'>[] {
  const last = messages.at(-1)
  if (last?.role !== 'assistant') return []
  // The questions must end the message: anything after them is the agent's next answer
  const parts = lastStepParts(last)
  if (parts.at(-1)?.type !== 'tool-askQuestion') return []
  return parts.filter((part): part is CvToolPart<'askQuestion'> => part.type === 'tool-askQuestion')
}

// Questions of the latest round still waiting for an answer
export function pendingQuestions(messages: CvUIMessage[]): CvToolPart<'askQuestion'>[] {
  return lastStepQuestions(messages).filter(part => part.state === 'input-available')
}

// The latest round is fully answered: send it to the agent. Only `askQuestion` counts, so a
// server tool cut by the step limit never triggers a request on its own.
export function isRoundAnswered(messages: CvUIMessage[]): boolean {
  const questions = lastStepQuestions(messages)
  return questions.length > 0 && questions.every(part => part.state === 'output-available')
}
