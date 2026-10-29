import { generateId } from 'ai'
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
  const { messages } = useCvChat()
  const fresh = useFreshMessages()

  return (question: string, reply: string | CvUIMessage['parts']) => {
    const userMessage: CvUIMessage = { id: generateId(), role: 'user', parts: [{ type: 'text', text: question }] }
    const answer: CvUIMessage = {
      id: generateId(),
      role: 'assistant',
      parts: typeof reply === 'string' ? [{ type: 'text', text: reply }] : reply,
    }
    fresh.value = [...fresh.value, answer.id]
    messages.value = [...messages.value, userMessage, answer]
  }
}
