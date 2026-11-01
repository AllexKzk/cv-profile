import { safeValidateUIMessages } from 'ai'
import { z } from 'zod'
import { CHAT_LIMITS } from '#shared/chat/history'
import { isRoundAnswered } from '#shared/chat/interview'
import { LOCALES } from '#shared/cv'
import { CHAT_SCENARIOS, cvDataSchemas, cvToolSchemas } from '#shared/types/chat'
import type { CvUIMessage } from '#shared/types/chat'

// Raw body limit. 20 messages of history with answers of ≤ 800 tokens and one vacancy of
// 20 000 characters (≈ 40 KB of Cyrillic in UTF-8) fit with a margin.
export const MAX_BODY_BYTES = 192 * 1024

// Strict: the client cannot pass a system prompt, a model or generation settings
const ChatRequestSchema = z.strictObject({
  messages: z.array(z.unknown()).min(1).max(CHAT_LIMITS.historyMessages),
  scenario: z.enum(CHAT_SCENARIOS),
  locale: z.enum(LOCALES),
})

export type ChatRequest = Omit<z.infer<typeof ChatRequestSchema>, 'messages'> & { messages: CvUIMessage[] }

const vacancyCount = (message: CvUIMessage) => message.parts.filter(part => part.type === 'data-vacancy').length

const textLength = (message: CvUIMessage) =>
  message.parts.reduce((sum, part) => sum + (part.type === 'text' ? part.text.length : 0), 0)

// Returns the parsed request or null when anything is off: callers answer 400 without details
export async function parseChatRequest(raw: string | undefined): Promise<ChatRequest | null> {
  if (!raw || new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return null

  let json: unknown
  try {
    json = JSON.parse(raw)
  }
  catch {
    return null
  }

  const body = ChatRequestSchema.safeParse(json)
  if (!body.success) return null

  const messages = await safeValidateUIMessages<CvUIMessage>({
    messages: body.data.messages,
    dataSchemas: cvDataSchemas,
    tools: cvToolSchemas,
  })
  if (!messages.success) return null

  // The visitor speaks last: a message, or the answers to a round of interview questions
  const last = messages.data.at(-1)
  if (last?.role !== 'user' && !isRoundAnswered(messages.data)) return null
  // Only users write free text, and the UI never lets them send more than the limit
  if (messages.data.some(m => m.role === 'user' && textLength(m) > CHAT_LIMITS.messageChars)) return null
  if (messages.data.some(m => m.role === 'system')) return null
  // One vacancy per message, and only users attach them
  if (messages.data.some(m => vacancyCount(m) > (m.role === 'user' ? 1 : 0))) return null
  // 'match' is the answer to an attached vacancy
  if (body.data.scenario === 'match' && (!last || vacancyCount(last) !== 1)) return null

  return { ...body.data, messages: messages.data }
}

// A request from a browser always has Origin; a different host means another site embeds the chat.
// No Origin (curl, server-to-server) is let through: rate limits handle those.
export function isForeignOrigin(origin: string | undefined, host: string | undefined): boolean {
  if (!origin) return false
  try {
    return new URL(origin).host !== host
  }
  catch {
    return true
  }
}
