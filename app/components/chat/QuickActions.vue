<script setup lang="ts">
// Big cards under the greeting, compact chips above the input once the chat has started
defineProps<{ compact?: boolean }>()

const { actions, run } = useQuickActions()
</script>

<template>
  <div
    class="actions"
    :class="{ compact }"
  >
    <Button
      v-for="action in actions"
      :key="action.id"
      variant="outline"
      class="action"
      data-glass
      :size="compact ? 'sm' : 'default'"
      :class="compact ? 'shrink-0 rounded-full' : 'h-auto justify-start py-3'"
      @click="run(action.id)"
    >
      <component :is="action.icon" />
      {{ $t(`chat.actions.${action.id}`) }}
    </Button>
  </div>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.actions {
  @apply grid w-full gap-2 sm:grid-cols-2;
}

/* Cards under the greeting and chips above the input are liquid glass (data-glass in the
   template); the selector outweighs the outline variant's own fill */
.actions .action {
  @apply glass;
}

/* Chips float above the scrolling messages: blur the page text behind them */
.actions.compact .action {
  @apply backdrop-blur-xl;
}

/* One row; scrolls sideways on narrow screens */
.actions.compact {
  @apply flex overflow-x-auto pb-1;
  scrollbar-width: none;
}
</style>
