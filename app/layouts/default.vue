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
  /* The page itself scrolls; TopBar and the chat composer are sticky */
  @apply flex min-h-dvh flex-col;
}

.content {
  @apply mx-auto flex w-full max-w-3xl flex-1 flex-col px-4;
}
</style>
