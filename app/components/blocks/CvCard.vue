<script setup lang="ts">
// Frame of a CV section: an evenly frosted glass card with an optional heading
defineProps<{ title?: string }>()
</script>

<template>
  <section
    class="card"
    data-glass="frost"
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
  @apply rounded-xl glass p-4 text-card-foreground sm:p-5;
}

.title {
  @apply mb-4 text-base font-semibold;
}
</style>
