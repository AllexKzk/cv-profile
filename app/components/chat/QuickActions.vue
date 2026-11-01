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
      :data-glass="compact ? undefined : true"
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

/* The big cards under the greeting are liquid glass blocks (data-glass in the template).
   Chips above the input keep the outline variant */
.actions:not(.compact) .action {
  @apply glass hover:bg-accent/40;
}

/* One row; scrolls sideways on narrow screens */
.actions.compact {
  @apply flex overflow-x-auto pb-1;
  scrollbar-width: none;
}
</style>
