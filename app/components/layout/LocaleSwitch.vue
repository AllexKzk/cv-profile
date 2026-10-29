<script setup lang="ts">
import { Languages } from '@lucide/vue'

const { locale, locales, setLocale, t } = useI18n()

// Locales go in a cycle: the button always switches to the next one
const nextLocale = computed(() => {
  const index = locales.value.findIndex(item => item.code === locale.value)
  return locales.value[(index + 1) % locales.value.length]!
})

const label = computed(() => t('topbar.locale', { language: nextLocale.value.name }))

function switchLocale() {
  setLocale(nextLocale.value.code)
}
</script>

<template>
  <Tooltip>
    <TooltipTrigger as-child>
      <Button
        variant="ghost"
        :aria-label="label"
        @click="switchLocale"
      >
        <Languages />
        <span class="code">{{ locale }}</span>
      </Button>
    </TooltipTrigger>
    <TooltipContent>{{ label }}</TooltipContent>
  </Tooltip>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.code {
  @apply uppercase;
}
</style>
