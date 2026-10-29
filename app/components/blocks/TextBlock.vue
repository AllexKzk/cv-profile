<script setup lang="ts">
import type { TextUIPart } from 'ai'

// Plain text with line breaks. Markdown comes in F3.
defineProps<{ part: TextUIPart }>()
</script>

<template>
  <p class="text">
    {{ part.text }}
  </p>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.text {
  @apply break-words whitespace-pre-wrap;
}
</style>
