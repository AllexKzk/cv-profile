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
      data-shine
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

/* Both the big buttons and the chips lie on the live background: the soft blur surface
   instead of the outline variant's fill, a light accent on hover */
.action {
  @apply surface hover:bg-accent/50 dark:hover:bg-accent/50;
  /* A softer, smaller glint than on cards: a big spot would light the whole small border */
  --shine-strength: 0.4;
  --shine-size: 90px;
}

/* One row; scrolls sideways on narrow screens */
.actions.compact {
  @apply flex overflow-x-auto pb-1;
  scrollbar-width: none;
}
</style>
