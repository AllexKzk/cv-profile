<script setup lang="ts">
import { FileUp } from '@lucide/vue'
import { useDropZone, useElementSize } from '@vueuse/core'
import type { CvUIMessage } from '#shared/types/chat'

const { messages, status, error, sendMessage, stop, regenerate } = useCvChat()
const answerByText = useAnswerByText()
const { attachment, attachFile, attachText, clear: clearAttachment } = useVacancyUpload()
const picker = useVacancyPicker(attachFile)

const isEmpty = computed(() => messages.value.length === 0)
const busy = computed(() => status.value === 'submitted' || status.value === 'streaming')

// The greeting is typed out once per visit, only into an empty chat.
// useState keeps the flag across locale switches and matches between server and client.
const greetingTyped = useState('chat-greeting-typed', () => false)
const animateGreeting = computed(() => !greetingTyped.value && isEmpty.value)

// The sticky composer covers the bottom of the viewport: scrolling must keep messages above it
const composer = useTemplateRef('composer')
const { height: composerHeight } = useElementSize(composer, undefined, { box: 'border-box' })

// A file dropped anywhere on the chat becomes the pending attachment
const chat = useTemplateRef<HTMLElement>('chat')
const { isOverDropZone } = useDropZone(chat, {
  multiple: false,
  onDrop: (files) => {
    const file = files?.[0]
    if (file) attachFile(file)
  },
})

// An attached vacancy goes out as a new message; otherwise typed text answers open interview
// questions first, and only then becomes a new message
function send(text: string) {
  const vacancy = attachment.value?.status === 'ready' ? attachment.value.data : undefined
  if (!vacancy) {
    if (answerByText(text)) return
    return sendMessage({ text })
  }

  const parts: CvUIMessage['parts'] = [{ type: 'data-vacancy', data: vacancy }]
  if (text) parts.push({ type: 'text', text })
  clearAttachment()
  sendMessage({ parts })
}
</script>

<template>
  <div
    ref="chat"
    class="chat"
  >
    <ChatMessageList
      :messages="messages"
      :status="status"
      :bottom-inset="composerHeight"
    >
      <template #intro>
        <ChatGreeting
          :animate="animateGreeting"
          @typed="greetingTyped = true"
        />
        <ChatQuickActions
          v-if="isEmpty && greetingTyped"
          class="cards"
        />
      </template>
      <template #footer>
        <ChatError
          v-if="error && status === 'error'"
          :error="error"
          @retry="regenerate()"
        />
      </template>
    </ChatMessageList>
    <div
      ref="composer"
      class="composer"
    >
      <ChatQuickActions
        v-if="!isEmpty"
        compact
      />
      <ChatInput
        :busy="busy"
        :attachment="attachment"
        @send="send"
        @stop="stop()"
        @attach="picker.open()"
        @remove-attachment="clearAttachment()"
        @paste-long="attachText"
      />
    </div>
    <div
      v-if="isOverDropZone"
      class="drop"
    >
      <FileUp class="drop-icon" />
      {{ $t('vacancy.drop') }}
    </div>
    <ChatVacancyDialog />
  </div>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.chat {
  @apply relative flex flex-1 flex-col;
}

/* Covers the chat while a file is dragged over it; pointer events stay with the drop zone */
.drop {
  @apply pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/85 text-lg font-medium backdrop-blur-sm;
}

.drop-icon {
  @apply size-10 text-muted-foreground;
}

.cards {
  @apply animate-in fade-in slide-in-from-bottom-2 duration-300;
}

/* No backdrop: the live background runs full screen under the composer */
.composer {
  @apply sticky bottom-0 z-10 flex shrink-0 flex-col gap-2 pb-4;
}
</style>
