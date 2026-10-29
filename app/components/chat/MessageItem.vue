<script setup lang="ts">
import type { CvUIMessage } from '#shared/types/chat'

const props = defineProps<{ message: CvUIMessage }>()

// Delay between parts of a fresh local answer, so blocks appear one after another
const STAGGER_MS = 120

const fresh = useFreshMessages()
const animated = computed(() => fresh.value.includes(props.message.id))
</script>

<template>
  <div
    class="message"
    :class="message.role"
    :data-message-id="message.id"
  >
    <ChatMessagePart
      v-for="(part, index) in message.parts"
      :key="index"
      :part="part"
      :class="{ appear: animated }"
      :style="animated ? { animationDelay: `${index * STAGGER_MS}ms` } : undefined"
    />
  </div>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.message {
  @apply flex flex-col gap-3;
}

/* Assistant answers take the full width: CV blocks are wide */
.message.user {
  @apply max-w-[85%] self-end rounded-2xl bg-muted px-4 py-2.5;
}

/* Hidden until its delay ends, then fades in; no motion when the user asked for less */
.appear {
  @apply animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none;
  animation-fill-mode: backwards;
}
</style>
