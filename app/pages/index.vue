<script setup lang="ts">
// Temporary demo page, replaced by the real layout in step 1.2
import { Moon, Sun } from '@lucide/vue'

const colorMode = useColorMode()
const { locale, setLocale } = useI18n()

function toggleTheme() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}

function toggleLocale() {
  setLocale(locale.value === 'en' ? 'ru' : 'en')
}
</script>

<template>
  <main class="page">
    <header class="header">
      <h1 class="title">
        {{ $t('demo.title') }}
      </h1>
      <div class="actions">
        <Button
          variant="ghost"
          :aria-label="$t('demo.switchLocale')"
          @click="toggleLocale"
        >
          {{ locale === 'en' ? 'RU' : 'EN' }}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          :aria-label="$t('demo.toggleTheme')"
          @click="toggleTheme"
        >
          <ClientOnly>
            <Moon v-if="colorMode.value === 'light'" />
            <Sun v-else />
          </ClientOnly>
        </Button>
      </div>
    </header>

    <p class="subtitle">
      {{ $t('demo.subtitle') }}
    </p>

    <div class="buttons">
      <Button>Default</Button>
      <Button variant="secondary">
        Secondary
      </Button>
      <Button variant="outline">
        Outline
      </Button>
      <Button variant="ghost">
        Ghost
      </Button>
    </div>

    <p class="code">
      font-mono: const answer = 42
    </p>
  </main>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.page {
  @apply mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 p-6;
}

.header {
  @apply flex items-center justify-between;
}

.title {
  @apply text-2xl font-bold;
}

.actions {
  @apply flex gap-1;
}

.subtitle {
  @apply text-muted-foreground;
}

.buttons {
  @apply flex flex-wrap gap-2;
}

.code {
  @apply font-mono text-sm;
}
</style>
