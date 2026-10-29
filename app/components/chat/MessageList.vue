<script setup lang="ts">
import { useEventListener, useResizeObserver } from '@vueuse/core'
import type { ChatStatus } from 'ai'
import type { CvUIMessage } from '#shared/types/chat'

const props = defineProps<{
  messages: CvUIMessage[]
  status: ChatStatus
  // Height covered by the sticky composer at the bottom of the viewport
  bottomInset?: number
}>()

// The page itself scrolls (TopBar and composer are sticky), so all scrolling goes through window.

// How close to the bottom still counts as "the user is reading the latest message"
const STICK_THRESHOLD = 80

const content = useTemplateRef('content')
const stickToBottom = ref(true)

const page = () => document.documentElement

function onScroll() {
  stickToBottom.value = page().scrollHeight - window.scrollY - window.innerHeight < STICK_THRESHOLD
}

function scrollToBottom() {
  window.scrollTo({ top: page().scrollHeight })
  stickToBottom.value = true
}

useEventListener(window, 'scroll', onScroll, { passive: true })

// Content grows on new messages and while a reply streams in.
// Follow it only if the user has not scrolled up to read history.
useResizeObserver(content, () => {
  if (stickToBottom.value) scrollToBottom()
})

// Space left between the question and the composer when the answer below it is not followed
const QUESTION_MARGIN = 24

// Shows the end of a message just above the composer; content below it stays out of view
function scrollToMessageEnd(id: string) {
  const node = content.value?.querySelector(`[data-message-id="${id}"]`)
  if (!node) return
  const visibleBottom = window.innerHeight - (props.bottomInset ?? 0)
  const below = node.getBoundingClientRect().bottom - visibleBottom + QUESTION_MARGIN
  // Already in view: never scroll up
  if (below > 0) window.scrollBy({ top: below })
  onScroll()
}

// A local answer made of blocks (CV sections, download card) is long: the user reads it
// from the top at their own pace, so we do not jump to its end
const isBlockAnswer = (message?: CvUIMessage) =>
  message?.role === 'assistant' && message.parts.some(part => part.type.startsWith('data-'))

// A new message from the user (typed or a quick action): always jump to it,
// even if they were reading history
const lastUserMessageId = computed(() => props.messages.findLast(message => message.role === 'user')?.id)
watch(lastUserMessageId, async (id) => {
  await nextTick()
  if (id && isBlockAnswer(props.messages.at(-1))) scrollToMessageEnd(id)
  else scrollToBottom()
})

onMounted(scrollToBottom)
</script>

<template>
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
</template>

<style scoped>
@reference "~/assets/css/main.css";

.messages {
  @apply flex flex-1 flex-col gap-6 py-6;
}
</style>
