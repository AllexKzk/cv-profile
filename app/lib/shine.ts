// Hover glint on borders (see [data-shine] in main.css): the cursor position, in px from the top
// left of each marked element, as --shine-x / --shine-y.

/**
 * Writes the cursor position into every data-shine element from `target` up: a button inside
 * a card is hovered together with the card, so both glints follow the cursor.
 */
export function trackShine(target: Element | null, clientX: number, clientY: number): void {
  let element = target?.closest<HTMLElement>('[data-shine]') ?? null
  while (element) {
    const box = element.getBoundingClientRect()
    element.style.setProperty('--shine-x', `${clientX - box.left}px`)
    element.style.setProperty('--shine-y', `${clientY - box.top}px`)
    element = element.parentElement?.closest<HTMLElement>('[data-shine]') ?? null
  }
}
