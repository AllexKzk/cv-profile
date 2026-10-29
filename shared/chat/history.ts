import type { UIMessage } from 'ai'

// Limits shared by the client (to send less) and the server (to enforce them)
export const CHAT_LIMITS = {
  // Messages of history the model sees
  historyMessages: 20,
  // Characters in one user message
  messageChars: 2000,
} as const

// Last `historyMessages` messages, starting with a user message: models expect the
// conversation to open with the user, and a cut can leave an assistant answer first.
export function trimHistory<T extends UIMessage>(messages: T[], limit: number = CHAT_LIMITS.historyMessages): T[] {
  const tail = messages.slice(-limit)
  const firstUser = tail.findIndex(message => message.role === 'user')
  return firstUser === -1 ? [] : tail.slice(firstUser)
}
