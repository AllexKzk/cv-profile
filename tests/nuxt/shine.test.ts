import { afterEach, describe, expect, it } from 'vitest'
import { trackShine } from '~/lib/shine'

function box(element: HTMLElement, left: number, top: number) {
  element.getBoundingClientRect = () => ({ left, top, right: left + 100, bottom: top + 50, width: 100, height: 50, x: left, y: top, toJSON: () => ({}) })
}

describe('trackShine', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('writes the cursor position relative to the marked element', () => {
    document.body.innerHTML = '<section data-shine><p><span id="t">text</span></p></section>'
    const card = document.querySelector<HTMLElement>('[data-shine]')!
    box(card, 40, 100)
    trackShine(document.getElementById('t'), 70, 130)
    expect(card.style.getPropertyValue('--shine-x')).toBe('30px')
    expect(card.style.getPropertyValue('--shine-y')).toBe('30px')
  })

  it('updates a button and the card around it', () => {
    document.body.innerHTML = '<section id="card" data-shine><button id="btn" data-shine>Go</button></section>'
    const card = document.getElementById('card')!
    const button = document.getElementById('btn')!
    box(card, 0, 0)
    box(button, 20, 10)
    trackShine(button, 25, 15)
    expect(button.style.getPropertyValue('--shine-x')).toBe('5px')
    expect(card.style.getPropertyValue('--shine-x')).toBe('25px')
  })

  it('does nothing outside marked elements', () => {
    document.body.innerHTML = '<div id="plain"></div>'
    const plain = document.getElementById('plain')!
    trackShine(plain, 10, 10)
    trackShine(null, 10, 10)
    expect(plain.style.getPropertyValue('--shine-x')).toBe('')
  })
})
