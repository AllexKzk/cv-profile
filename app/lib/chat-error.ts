import { CHAT_ERROR_CODES } from '#shared/types/chat'
import type { ChatErrorCode } from '#shared/types/chat'

// The transport throws Error(response body) for a refused request ({"code":"rate_limit"}),
// and a failed stream carries the code returned by the server's onError ('model_error').
// Anything else (no network, a proxy page) is 'network'.
export function chatErrorCode(error: Error): ChatErrorCode | 'network' {
  const known = (value: unknown): value is ChatErrorCode =>
    typeof value === 'string' && (CHAT_ERROR_CODES as readonly string[]).includes(value)

  if (known(error.message)) return error.message
  try {
    const { code } = JSON.parse(error.message) as { code?: unknown }
    if (known(code)) return code
  }
  catch {
    // not JSON
  }
  return 'network'
}
