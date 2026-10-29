<script setup lang="ts">
// Frame of a CV section: a card with an optional heading
defineProps<{ title?: string }>()
</script>

<template>
  <section class="card">
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
  @apply rounded-xl border bg-card p-4 text-card-foreground sm:p-5;
}

.title {
  @apply mb-4 text-base font-semibold;
}
</style>
