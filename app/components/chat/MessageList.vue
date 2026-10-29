<script setup lang="ts">
import { useResizeObserver } from '@vueuse/core'
import type { ChatStatus } from 'ai'
import type { CvUIMessage } from '#shared/types/chat'

const props = defineProps<{
  messages: CvUIMessage[]
  status: ChatStatus
}>()

// How close to the bottom still counts as "the user is reading the latest message"
const STICK_THRESHOLD = 80

const scroller = useTemplateRef('scroller')
const content = useTemplateRef('content')
const stickToBottom = ref(true)

function onScroll() {
  const el = scroller.value
  if (!el) return
  stickToBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_THRESHOLD
}

function scrollToBottom() {
  const el = scroller.value
  if (!el) return
  el.scrollTop = el.scrollHeight
  stickToBottom.value = true
}

// Content grows on new messages and while a reply streams in.
// Follow it only if the user has not scrolled up to read history.
useResizeObserver(content, () => {
  if (stickToBottom.value) scrollToBottom()
})

// A new message from the user (typed or a quick action): always jump to it,
// even if they were reading history
const lastUserMessageId = computed(() => props.messages.findLast(message => message.role === 'user')?.id)
watch(lastUserMessageId, async () => {
  await nextTick()
  scrollToBottom()
})

onMounted(scrollToBottom)
</script>

<template>
  <div
    ref="scroller"
    class="scroller"
    @scroll.passive="onScroll"
  >
    <div
      ref="content"
      class="messages"
      role="log"
      aria-live="polite"
      :aria-label="$t('chat.log')"
    >
      <slot name="intro" />
      <ChatMessageItem
        v-for="message in messages"
        :key="message.id"
        :message="message"
      />
      <ChatTypingIndicator v-if="status === 'submitted'" />
    </div>
  </div>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.scroller {
  @apply min-h-0 flex-1 overflow-y-auto;
}

.messages {
  @apply flex flex-col gap-6 py-6;
}
</style>
