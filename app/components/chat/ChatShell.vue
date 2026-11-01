<script setup lang="ts">
import { useElementSize } from '@vueuse/core'

const { messages, status, error, sendMessage, stop, regenerate } = useCvChat()
const picker = useVacancyPicker()

const isEmpty = computed(() => messages.value.length === 0)
const busy = computed(() => status.value === 'submitted' || status.value === 'streaming')

// The greeting is typed out once per visit, only into an empty chat.
// useState keeps the flag across locale switches and matches between server and client.
const greetingTyped = useState('chat-greeting-typed', () => false)
const animateGreeting = computed(() => !greetingTyped.value && isEmpty.value)

// The sticky composer covers the bottom of the viewport: scrolling must keep messages above it
const composer = useTemplateRef('composer')
const { height: composerHeight } = useElementSize(composer, undefined, { box: 'border-box' })

function send(text: string) {
  sendMessage({ text })
}
</script>

<template>
  <div class="chat">
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
        @send="send"
        @stop="stop()"
        @attach="picker.open()"
      />
    </div>
  </div>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.chat {
  @apply flex flex-1 flex-col;
}

.cards {
  @apply animate-in fade-in slide-in-from-bottom-2 duration-300;
}

/* No backdrop: the live background runs full screen under the composer */
.composer {
  @apply sticky bottom-0 z-10 flex shrink-0 flex-col gap-2 pb-4;
}
</style>
