<script setup lang="ts">
import {
  useDocumentVisibility,
  useEventListener,
  useMediaQuery,
  useMutationObserver,
  usePreferredReducedMotion,
  useResizeObserver,
} from '@vueuse/core'
import type { FieldController } from '~/lib/live-field/renderer'

// Decorative light behind fluted glass, full screen behind the page. The server renders an empty
// canvas; the renderer is a separate chunk loaded when the browser is idle after hydration.
// Desktop: the light drifts on its own. Phones: it stands still and follows the tilt.
// Presses on buttons and fields send a ring across the glass on both. Blocks marked
// `data-glass` are liquid glass: the shader bends the picture near their edges.
const canvas = useTemplateRef('canvas')
const ready = ref(false)
const reducedMotion = usePreferredReducedMotion()
const visibility = useDocumentVisibility()
const touch = useMediaQuery('(pointer: coarse)')

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
    field.setAutonomous(!touch.value)
    updateGlass()
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
watch(touch, value => field?.setAutonomous(!value))

// Tilt: the pose the phone is held in is zero and slowly follows the hand, so only the
// change of tilt moves the light, and a new pose does not stick
const TILT_RANGE = 30
let pose: { beta: number, gamma: number } | undefined

function onOrientation(event: DeviceOrientationEvent) {
  if (!touch.value || event.beta === null || event.gamma === null) return
  pose ??= { beta: event.beta, gamma: event.gamma }
  pose.beta += (event.beta - pose.beta) * 0.01
  pose.gamma += (event.gamma - pose.gamma) * 0.01
  const clamp = (v: number) => Math.max(-1, Math.min(1, v / TILT_RANGE))
  field?.setTilt(clamp(event.gamma - pose.gamma), clamp(event.beta - pose.beta))
}

useEventListener(() => (import.meta.client ? window : null), 'deviceorientation', onOrientation)

// iOS gives orientation events only after the user allows it, from a user gesture
type OrientationWithPermission = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> }

useEventListener(() => (import.meta.client ? document : null), 'click', () => {
  const api = (window as { DeviceOrientationEvent?: OrientationWithPermission }).DeviceOrientationEvent
  if (touch.value && typeof api?.requestPermission === 'function') api.requestPermission().catch(() => {})
}, { once: true, capture: true })

// Presses: a ring from the pointer, or from the element center for Enter / Space
const PRESSABLE = 'button, a, input, textarea, select, label, [role="button"]'

useEventListener(() => (import.meta.client ? document : null), 'pointerdown', (event: PointerEvent) => {
  if ((event.target as Element | null)?.closest?.(PRESSABLE)) field?.ripple(event.clientX, event.clientY)
}, { capture: true, passive: true })

useEventListener(() => (import.meta.client ? document : null), 'keydown', (event: KeyboardEvent) => {
  if (event.key !== 'Enter' && event.key !== ' ') return
  const target = (event.target as Element | null)?.closest?.(PRESSABLE)
  if (!target) return
  const box = target.getBoundingClientRect()
  field?.ripple(box.left + box.width / 2, box.top + box.height / 2)
}, { capture: true, passive: true })

// Glass blocks: their rects feed the shader. Read synchronously on scroll and resize, so the
// bent edges move in the same frame as the blocks; DOM changes are batched to a frame
function updateGlass() {
  if (!field) return
  const height = window.innerHeight
  const rects = []
  for (const element of document.querySelectorAll('[data-glass]')) {
    const box = element.getBoundingClientRect()
    if (box.width > 0 && box.bottom > -40 && box.top < height + 40) {
      rects.push({ x: box.left, y: box.top, w: box.width, h: box.height })
    }
  }
  field.setGlass(rects)
}

let glassFrame = 0
function scheduleGlass() {
  if (glassFrame) return
  glassFrame = requestAnimationFrame(() => {
    glassFrame = 0
    updateGlass()
  })
}

useEventListener(() => (import.meta.client ? window : null), 'scroll', updateGlass, { passive: true })
useEventListener(() => (import.meta.client ? window : null), 'resize', updateGlass, { passive: true })
// Messages slide in with CSS animations: re-read the rects when they settle
useEventListener(() => (import.meta.client ? document : null), 'animationend', scheduleGlass, { passive: true })
useMutationObserver(
  () => (import.meta.client ? document.body : null),
  scheduleGlass,
  { childList: true, subtree: true },
)

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
