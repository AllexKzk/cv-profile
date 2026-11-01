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

/* The big cards lie on the live background: the outline variant is see-through in the dark
   theme, so they get the card surface. Chips sit on the blurred composer and keep the variant. */
.actions:not(.compact) .action {
  @apply surface hover:bg-accent;
}

/* One row; scrolls sideways on narrow screens */
.actions.compact {
  @apply flex overflow-x-auto pb-1;
  scrollbar-width: none;
}
</style>
