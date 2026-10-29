<template>
  <div class="placeholder">
    <p class="text">
      {{ $t('home.placeholder') }}
    </p>
  </div>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.placeholder {
  @apply flex flex-1 items-center justify-center;
}

.text {
  @apply text-muted-foreground;
}
</style>
