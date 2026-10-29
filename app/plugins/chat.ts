import { useChat } from '@ai-sdk/vue'
import type { UseChatHelpers } from '@ai-sdk/vue'
import type { CvUIMessage } from '#shared/types/chat'
import { loadHistory, saveHistory } from '~/lib/chat-history'
import { createStubTransport } from '~/lib/stub-transport'

// One chat per app instance: on the server every request gets its own, so state is never shared.
// Lives outside pages, so switching the locale (`/` ↔ `/ru`) keeps the conversation.
// `useChat` rather than the `Chat` class: the class is deprecated and does not re-render
// a part that streams into an already rendered message.
export default defineNuxtPlugin((nuxtApp) => {
  // Explicit type: the transport reads nuxtApp.$i18n, whose type includes this plugin's provide
  const chat: UseChatHelpers<CvUIMessage> = useChat<CvUIMessage>({
    transport: createStubTransport((): string => nuxtApp.$i18n.t('chat.stub.reply')),
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
