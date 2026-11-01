<template>
  <header class="topbar">
    <div class="inner">
      <!-- On phones the controls take the whole bar; contacts stay in the CV hero -->
      <div class="contacts">
        <LayoutContactLinks />
      </div>
      <div class="controls">
        <LayoutResetChatButton />
        <LayoutLocaleSwitch />
        <LayoutThemeToggle />
        <LayoutInfoDialog />
      </div>
    </div>
  </header>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.topbar {
  @apply sticky top-0 z-10 shrink-0 surface-bar;
}

.inner {
  @apply mx-auto flex h-14 w-full max-w-3xl items-center justify-between gap-2 px-4;
}

.contacts {
  @apply hidden sm:block;
}

.controls {
  @apply ml-auto flex items-center gap-1;
}
</style>
