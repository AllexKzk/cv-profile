import { generateId } from 'ai'
import { pendingQuestions } from '#shared/chat/interview'
import type { CvUIMessage } from '#shared/types/chat'

// Shared chat (refs + actions from useChat), created by plugins/chat.ts
export function useCvChat() {
  return useNuxtApp().$cvChat
}

// Ids of local answers created during this visit: only they animate in.
// Not persisted, so restored history shows up at once.
export function useFreshMessages() {
  return useState<string[]>('chat-fresh-messages', () => [])
}

// Appends a user message and an assistant reply without calling the transport (local scenarios)
export function useLocalExchange() {
  const { messages, clearError } = useCvChat()
  const fresh = useFreshMessages()

  return (question: string, reply: string | CvUIMessage['parts']) => {
    const userMessage: CvUIMessage = { id: generateId(), role: 'user', parts: [{ type: 'text', text: question }] }
    const answer: CvUIMessage = {
      id: generateId(),
      role: 'assistant',
      parts: typeof reply === 'string' ? [{ type: 'text', text: reply }] : reply,
    }
    // A local answer moves the conversation on: a previous request's error is no longer relevant
    clearError()
    fresh.value = [...fresh.value, answer.id]
    messages.value = [...messages.value, userMessage, answer]
  }
}

// Appends an assistant message without a question (a confirmation after an action in a block)
export function useLocalAnswer() {
  const { messages } = useCvChat()
  const fresh = useFreshMessages()

  return (parts: CvUIMessage['parts']) => {
    const answer: CvUIMessage = { id: generateId(), role: 'assistant', parts }
    fresh.value = [...fresh.value, answer.id]
    messages.value = [...messages.value, answer]
  }
}

// Answers the open interview questions with typed text instead of clicks: the first one gets
// the text, the rest are skipped, and the round goes to the agent. False when nothing is open.
export function useAnswerByText() {
  const { messages, addToolOutput } = useCvChat()

  return (text: string): boolean => {
    const [first, ...rest] = pendingQuestions(messages.value)
    if (!first) return false
    addToolOutput({ tool: 'askQuestion', toolCallId: first.toolCallId, output: { kind: 'text', text } })
    for (const part of rest) addToolOutput({ tool: 'askQuestion', toolCallId: part.toolCallId, output: { kind: 'skipped' } })
    return true
  }
}
