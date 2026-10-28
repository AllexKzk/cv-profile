<script setup lang="ts">
// Temporary demo page for step 0.2, replaced by the real layout in step 1.2
import { Moon, Sun } from '@lucide/vue'

const colorMode = useColorMode()

function toggleTheme() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}
</script>

<template>
  <main class="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 p-6">
    <header class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">
        CV Agent
      </h1>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Toggle theme"
        @click="toggleTheme"
      >
        <ClientOnly>
          <Moon v-if="colorMode.value === 'light'" />
          <Sun v-else />
        </ClientOnly>
      </Button>
    </header>

    <p class="text-muted-foreground">
      Fullstack engineer. Полноценный T-shaped инженер — проверка кириллицы.
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
