import { useChat } from '@ai-sdk/vue'
import type { UseChatHelpers } from '@ai-sdk/vue'
import { DefaultChatTransport } from 'ai'
import { trimHistory } from '#shared/chat/history'
import type { CvUIMessage } from '#shared/types/chat'
import { loadHistory, saveHistory } from '~/lib/chat-history'

// One chat per app instance: on the server every request gets its own, so state is never shared.
// Lives outside pages, so switching the locale (`/` ↔ `/ru`) keeps the conversation.
// `useChat` rather than the `Chat` class: the class is deprecated and does not re-render
// a part that streams into an already rendered message.
export default defineNuxtPlugin((nuxtApp) => {
  // Explicit type: the transport reads nuxtApp.$i18n, whose type includes this plugin's provide
  const chat: UseChatHelpers<CvUIMessage> = useChat<CvUIMessage>({
    transport: new DefaultChatTransport<CvUIMessage>({
      api: '/api/chat',
      // Only the tail the model sees: the server trims it anyway, this just sends less.
      // A message with an attached vacancy is answered by the 'match' scenario.
      prepareSendMessagesRequest: ({ messages }) => ({
        body: {
          messages: trimHistory(messages),
          scenario: messages.at(-1)?.parts.some(part => part.type === 'data-vacancy') ? 'match' : 'free',
          locale: nuxtApp.$i18n.locale.value,
        },
      }),
    }),
  })

  if (import.meta.client) {
    // Restore after hydration, so the server-rendered empty chat matches the first client render
    nuxtApp.hook('app:suspense:resolve', async () => {
      const history = await loadHistory(localStorage)
      // The user may have started a new conversation while history was loading
      if (history.length && !chat.messages.value.length) chat.messages.value = history
    })

    // Save finished states only, not every streamed token
    watch([chat.status, chat.messages], ([status, messages]) => {
      if (status === 'ready') saveHistory(localStorage, messages)
    })
  }

  return { provide: { cvChat: chat } }
})
