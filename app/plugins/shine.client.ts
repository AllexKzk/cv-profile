import { trackShine } from '~/lib/shine'

// Hover glint on borders: one listener for the whole page, at most one layout read per frame.
// Mouse only: touch has no hover, so the glint never shows there.
export default defineNuxtPlugin(() => {
  let frame = 0
  let last: PointerEvent | undefined

  document.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return
    last = event
    if (frame) return
    frame = requestAnimationFrame(() => {
      frame = 0
      if (last) trackShine(last.target as Element | null, last.clientX, last.clientY)
    })
  }, { passive: true })
})
