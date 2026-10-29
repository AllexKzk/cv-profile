import { generateId } from 'ai'
import type { CvUIMessage } from '#shared/types/chat'

// Shared chat (refs + actions from useChat), created by plugins/chat.ts
export function useCvChat() {
  return useNuxtApp().$cvChat
}

// Appends a user message and an assistant reply without calling the transport (local scenarios)
export function useLocalExchange() {
  const { messages } = useCvChat()

  return (question: string, reply: string) => {
    const message = (role: CvUIMessage['role'], text: string): CvUIMessage => ({
      id: generateId(),
      role,
      parts: [{ type: 'text', text }],
    })
    messages.value = [...messages.value, message('user', question), message('assistant', reply)]
  }
}
