<script setup lang="ts">
import type { TextUIPart } from 'ai'
import { renderMarkdown } from '~/lib/markdown'

// Assistant text: Markdown re-rendered on every streamed delta (answers are short)
const props = defineProps<{ part: TextUIPart }>()

const html = computed(() => renderMarkdown(props.part.text))
</script>

<template>
  <!-- eslint-disable vue/no-v-html -- escaped and link-checked by renderMarkdown -->
  <div
    class="markdown"
    v-html="html"
  />
  <!-- eslint-enable vue/no-v-html -->
</template>

<style scoped>
@reference "~/assets/css/main.css";

.markdown {
  @apply flex flex-col gap-3 break-words;
}

.markdown :deep(ul) {
  @apply list-disc space-y-1 pl-5;
}

.markdown :deep(ol) {
  @apply list-decimal space-y-1 pl-5;
}

.markdown :deep(strong) {
  @apply font-semibold;
}

.markdown :deep(a) {
  @apply text-primary underline underline-offset-4 hover:text-primary/80;
}

.markdown :deep(code) {
  @apply rounded bg-muted px-1 py-0.5 font-mono text-sm;
}

.markdown :deep(pre) {
  @apply overflow-x-auto rounded-lg bg-muted p-3;
}

.markdown :deep(pre code) {
  @apply bg-transparent p-0;
}

.markdown :deep(blockquote) {
  @apply border-l-2 border-border pl-3 text-muted-foreground;
}
</style>
