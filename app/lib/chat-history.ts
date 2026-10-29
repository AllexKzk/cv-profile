import { safeValidateUIMessages } from 'ai'
import { cvDataSchemas } from '#shared/types/chat'
import type { CvUIMessage } from '#shared/types/chat'

export const HISTORY_KEY = 'cv-chat'
// Bump when the stored message shape changes: old histories are dropped, not migrated
export const HISTORY_VERSION = 1
export const HISTORY_LIMIT = 100

interface StoredHistory {
  version: number
  messages: unknown
}

// Storage errors (private mode, quota) are ignored: the chat works without history

export function clearHistory(storage: Storage) {
  try {
    storage.removeItem(HISTORY_KEY)
  }
  catch {
    // ignore
  }
}

export function saveHistory(storage: Storage, messages: CvUIMessage[]) {
  if (!messages.length) return clearHistory(storage)
  const value: StoredHistory = { version: HISTORY_VERSION, messages: messages.slice(-HISTORY_LIMIT) }
  try {
    storage.setItem(HISTORY_KEY, JSON.stringify(value))
  }
  catch {
    // ignore
  }
}

export async function loadHistory(storage: Storage): Promise<CvUIMessage[]> {
  try {
    const raw = storage.getItem(HISTORY_KEY)
    if (!raw) return []

    const stored = JSON.parse(raw) as Partial<StoredHistory> | null
    if (stored?.version === HISTORY_VERSION && Array.isArray(stored.messages) && stored.messages.length) {
      const result = await safeValidateUIMessages<CvUIMessage>({
        messages: stored.messages,
        dataSchemas: cvDataSchemas,
      })
      if (result.success) return result.data
    }
  }
  catch {
    // broken JSON: fall through and drop it
  }
  clearHistory(storage)
  return []
}
