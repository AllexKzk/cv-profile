<script setup lang="ts">
import {
  useDocumentVisibility,
  useMutationObserver,
  usePreferredReducedMotion,
  useResizeObserver,
} from '@vueuse/core'
import type { FieldController } from '~/lib/live-field/renderer'

// Decorative waving field of dots behind the page. The server renders an empty canvas;
// the renderer is a separate chunk loaded when the browser is idle after hydration.
const canvas = useTemplateRef('canvas')
const ready = ref(false)
const reducedMotion = usePreferredReducedMotion()
const visibility = useDocumentVisibility()

let field: FieldController | undefined
let readColor: (() => [number, number, number]) | undefined
let disposed = false

const animated = computed(() => reducedMotion.value !== 'reduce')

async function init() {
  const { startField, readFieldColor } = await import('~/lib/live-field/renderer')
  if (disposed || !canvas.value) return
  readColor = readFieldColor
  try {
    field = startField(canvas.value, {
      color: readFieldColor(),
      animated: animated.value,
      onReady: () => (ready.value = true),
    })
    field.setVisible(visibility.value === 'visible')
  }
  catch (error) {
    // A broken background must never break the page
    console.warn(error)
  }
}

onMounted(() => {
  if ('requestIdleCallback' in window) requestIdleCallback(init, { timeout: 2000 })
  else setTimeout(init, 200)
})

onBeforeUnmount(() => {
  disposed = true
  field?.destroy()
})

watch(animated, value => field?.setAnimated(value))
watch(visibility, value => field?.setVisible(value === 'visible'))

// color-mode toggles the theme class on <html>: re-read the token after it lands
useMutationObserver(
  () => (import.meta.client ? document.documentElement : null),
  () => {
    if (field && readColor) field.setColor(readColor())
  },
  { attributes: true, attributeFilter: ['class'] },
)

let resizeTimer: ReturnType<typeof setTimeout> | undefined
useResizeObserver(canvas, () => {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => field?.resize(), 100)
})
</script>

<template>
  <canvas
    ref="canvas"
    class="field"
    :class="{ ready }"
    aria-hidden="true"
  />
</template>

<style scoped>
@reference "~/assets/css/main.css";

/* lvh, not dvh: the mobile address bar showing up must not resize the buffer */
.field {
  @apply pointer-events-none fixed inset-x-0 top-0 -z-10 h-lvh w-full opacity-0;
  @apply transition-opacity duration-700;
}

/* Low opacity keeps the text readable; the value is a theme token */
.field.ready {
  opacity: var(--field-opacity);
}
</style>
