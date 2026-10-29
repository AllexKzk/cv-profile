<template>
  <header class="topbar">
    <div class="inner">
      <LayoutContactLinks />
      <div class="controls">
        <LayoutLocaleSwitch />
        <LayoutThemeToggle />
      </div>
    </div>
  </header>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.topbar {
  @apply sticky top-0 z-10 shrink-0 border-b bg-background/80 backdrop-blur;
}

.inner {
  @apply mx-auto flex h-14 w-full max-w-3xl items-center justify-between gap-2 px-4;
}

.controls {
  @apply flex items-center gap-1;
}
</style>
