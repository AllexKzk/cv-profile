<script setup lang="ts">
import { Moon, Sun } from '@lucide/vue'

const colorMode = useColorMode()
const { t } = useI18n()

const isDark = computed(() => colorMode.value === 'dark')
const label = computed(() => t(isDark.value ? 'topbar.theme.toLight' : 'topbar.theme.toDark'))

function toggle() {
  colorMode.preference = isDark.value ? 'light' : 'dark'
}
</script>

<template>
  <Tooltip>
    <TooltipTrigger as-child>
      <Button
        variant="ghost"
        size="icon"
        :aria-label="label"
        @click="toggle"
      >
        <!-- With 'system' preference the server does not know the theme -->
        <ClientOnly>
          <Sun v-if="isDark" />
          <Moon v-else />
        </ClientOnly>
      </Button>
    </TooltipTrigger>
    <TooltipContent>{{ label }}</TooltipContent>
  </Tooltip>
</template>
