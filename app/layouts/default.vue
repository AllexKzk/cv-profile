<template>
  <TooltipProvider :delay-duration="300">
    <div class="shell">
      <LayoutTopBar />
      <main class="content">
        <slot />
      </main>
    </div>
  </TooltipProvider>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.shell {
  @apply flex h-dvh flex-col;
}

.content {
  @apply mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col px-4;
}
</style>
