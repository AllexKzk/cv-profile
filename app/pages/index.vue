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
  <main class="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 p-6">
    <header class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">
        {{ $t('demo.title') }}
      </h1>
      <div class="flex gap-1">
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

    <p class="text-muted-foreground">
      {{ $t('demo.subtitle') }}
    </p>

    <div class="flex flex-wrap gap-2">
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

    <p class="font-mono text-sm">
      font-mono: const answer = 42
    </p>
  </main>
</template>
