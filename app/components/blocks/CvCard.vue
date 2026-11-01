<script setup lang="ts">
// Frame of a CV section: a card with an optional heading. `glass` makes it a liquid glass
// block (rare: the live background does extra work for each one)
defineProps<{ title?: string, glass?: boolean }>()
</script>

<template>
  <section
    class="card"
    :class="{ liquid: glass }"
    :data-glass="glass || undefined"
  >
    <h3
      v-if="title"
      class="title"
    >
      {{ title }}
    </h3>
    <slot />
  </section>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.card {
  @apply rounded-xl border surface p-4 text-card-foreground sm:p-5;
}

.card.liquid {
  @apply glass;
}

.title {
  @apply mb-4 text-base font-semibold;
}
</style>
