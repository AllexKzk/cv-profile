<script setup lang="ts">
import type { Locale } from '#shared/cv'

const { locale, locales, setLocale } = useI18n()

// Clicking the active item emits an empty value: keep the current locale then
function onChange(value: unknown) {
  if (typeof value === 'string' && value && value !== locale.value) {
    setLocale(value as Locale)
  }
}
</script>

<template>
  <ToggleGroup
    type="single"
    variant="outline"
    size="sm"
    :model-value="locale"
    :aria-label="$t('topbar.locale')"
    @update:model-value="onChange"
  >
    <ToggleGroupItem
      v-for="item in locales"
      :key="item.code"
      :value="item.code"
      :aria-label="item.name"
    >
      {{ item.code.toUpperCase() }}
    </ToggleGroupItem>
  </ToggleGroup>
</template>
