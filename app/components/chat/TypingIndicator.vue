<template>
  <div
    class="typing"
    role="status"
    :aria-label="$t('chat.typing')"
  >
    <span class="dot" />
    <span class="dot" />
    <span class="dot" />
  </div>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.typing {
  @apply flex h-6 items-center gap-1;
}

.dot {
  @apply size-1.5 animate-bounce rounded-full bg-muted-foreground;
}

.dot:nth-child(2) {
  animation-delay: 150ms;
}

.dot:nth-child(3) {
  animation-delay: 300ms;
}
</style>
