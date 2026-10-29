<script setup lang="ts">
import type { CvUIMessage } from '#shared/types/chat'

defineProps<{ message: CvUIMessage }>()
</script>

<template>
  <div
    class="message"
    :class="message.role"
  >
    <ChatMessagePart
      v-for="(part, index) in message.parts"
      :key="index"
      :part="part"
    />
  </div>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.message {
  @apply flex flex-col gap-3;
}

/* Assistant answers take the full width: CV blocks will be wide */
.message.user {
  @apply max-w-[85%] self-end rounded-2xl bg-muted px-4 py-2.5;
}
</style>
