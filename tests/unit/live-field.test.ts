import { describe, expect, it } from 'vitest'
import {
  FIELD,
  createFrameGate,
  fieldGlsl,
  flutedAt,
  lightAt,
  mixRgb,
  ribShade,
  ribTraits,
  rippleAt,
  glassAt,
  roundedBoxSdf,
} from '../../app/lib/live-field/field'

describe('lightAt', () => {
  it('stays within 0–1 over the whole screen', () => {
    for (let nx = 0; nx <= 1; nx += 0.05) {
      for (let ny = 0; ny <= 1; ny += 0.05) {
        for (const t of [0, 13, 400]) {
          const l = lightAt(nx, ny, 1.6, t)
          expect(l).toBeGreaterThanOrEqual(0)
          expect(l).toBeLessThanOrEqual(1)
        }
      }
    }
  })

  it('has bright and dark areas', () => {
    const samples = Array.from({ length: 400 }, (_, i) => lightAt((i % 20) / 19, Math.floor(i / 20) / 19, 1.6, FIELD.staticTime))
    expect(Math.max(...samples)).toBeGreaterThan(0.7)
    expect(Math.min(...samples)).toBeLessThan(0.1)
  })

  it('drifts over time', () => {
    expect(lightAt(0.4, 0.5, 1.6, 0)).not.toBeCloseTo(lightAt(0.4, 0.5, 1.6, 10), 2)
  })
})

describe('ribShade', () => {
  it('has a dark seam at the rib edge', () => {
    expect(ribShade(0, 1, 1)).toBe(0)
  })

  it('glints just after the seam and dims towards the right edge', () => {
    expect(ribShade(0.06, 0.6, 0)).toBeGreaterThan(ribShade(0.3, 0.6, 0))
    expect(ribShade(0.3, 0.6, 0)).toBeGreaterThan(ribShade(0.85, 0.6, 0))
  })

  it('adds a rim light before the right edge only when the rib has one', () => {
    expect(ribShade(0.93, 0.6, 0.9)).toBeGreaterThan(ribShade(0.93, 0.6, 0) + 0.5)
  })
})

describe('ribTraits', () => {
  const ribs = Array.from({ length: 100 }, (_, i) => ribTraits(i))

  it('is stable for the same rib', () => {
    expect(ribTraits(42)).toEqual(ribTraits(42))
  })

  it('makes ribs different: clear and frosted, with and without a rim light', () => {
    const clarity = ribs.map(r => r.clarity)
    expect(Math.min(...clarity)).toBeLessThan(0.5)
    expect(Math.max(...clarity)).toBeGreaterThan(0.85)
    const withRim = ribs.filter(r => r.rim > 0.1).length
    expect(withRim).toBeGreaterThan(10)
    expect(withRim).toBeLessThan(60)
  })

  it('keeps every trait in its range', () => {
    for (const r of ribs) {
      expect(r.refraction).toBeGreaterThanOrEqual(FIELD.refraction * 0.4)
      expect(r.refraction).toBeLessThanOrEqual(FIELD.refraction * 1.6)
      expect(r.clarity).toBeGreaterThanOrEqual(0.35)
      expect(r.clarity).toBeLessThanOrEqual(1)
      expect(Math.abs(r.shiftPx)).toBeLessThanOrEqual(30)
    }
  })
})

describe('flutedAt', () => {
  const [w, h] = [1280, 800]

  it('repeats the rib shading every rib', () => {
    // Inside a dark area the light barely changes over one rib, so the seam shows at each rib edge
    for (let rib = 1; rib < 5; rib++) {
      expect(flutedAt(rib * FIELD.ribPx, 400, w, h, FIELD.staticTime)).toBe(0)
    }
  })

  it('moves the light with the tilt offset', () => {
    const at = (offset: [number, number]) => flutedAt(640.5 + 5, 400, w, h, FIELD.staticTime, offset)
    expect(at([0.1, 0])).not.toBeCloseTo(at([0, 0]), 3)
  })

  it('stays within 0–1', () => {
    for (let x = 0; x < w; x += 37) {
      for (let y = 0; y < h; y += 41) {
        const a = flutedAt(x, y, w, h, FIELD.staticTime)
        expect(a).toBeGreaterThanOrEqual(0)
        expect(a).toBeLessThanOrEqual(1)
      }
    }
  })
})

describe('fieldGlsl', () => {
  it('defines the shader functions from the same constants', () => {
    const glsl = fieldGlsl()
    for (const name of ['float lightAt(', 'float hash(', 'float ribShade(', 'float flutedAt(']) expect(glsl).toContain(name)
    expect(glsl.match(/l \+= /g)).toHaveLength(4)
    expect(glsl).toContain(`${FIELD.ribPx}.0`)
  })

  it('writes every number as a GLSL float literal', () => {
    // A bare integer next to a float operation does not compile in GLSL ES 1.0; loop
    // counters are the only ints on purpose
    const glsl = fieldGlsl().replace(/for \(int k = 0; k < \d+; k\+\+\)/g, '')
    expect(glsl).not.toMatch(/[^.\w]\d+[^.\d\w]/)
  })
})

describe('rippleAt', () => {
  const ring = (age: number) => [{ x: 0, y: 0, age }]

  it('does nothing without rings', () => {
    expect(rippleAt(100, 100, [])).toEqual([0, 0, 0])
  })

  it('glows on the expanding ring and not far inside or outside it', () => {
    const age = 0.3
    const radius = age * FIELD.ripple.speedPx
    const [, , onRing] = rippleAt(radius, 0, ring(age))
    expect(onRing).toBeGreaterThan(0.5)
    expect(rippleAt(radius / 4, 0, ring(age))[2]).toBeLessThan(0.05)
    expect(rippleAt(radius * 3, 0, ring(age))[2]).toBeLessThan(0.05)
  })

  it('pushes the light outwards from the press', () => {
    const radius = 0.3 * FIELD.ripple.speedPx
    const [dx, dy] = rippleAt(radius, 0, ring(0.3))
    expect(dx).toBeGreaterThan(5)
    expect(Math.abs(dy)).toBeLessThan(1e-9)
  })

  it('fades out by the end of its life', () => {
    const age = FIELD.ripple.lifeS
    expect(rippleAt(age * FIELD.ripple.speedPx, 0, ring(age))[2]).toBeLessThan(1e-6)
  })
})

describe('glassAt', () => {
  const card = { x: 100, y: 100, w: 400, h: 200 }

  it('measures the distance to a rounded block', () => {
    expect(roundedBoxSdf(300, 200, card, FIELD.glass.radiusPx)).toBeCloseTo(-100)
    expect(roundedBoxSdf(300, 90, card, FIELD.glass.radiusPx)).toBeCloseTo(10)
  })

  it('lights the rim, the top edge more than the bottom one', () => {
    const [, , top] = glassAt(300, 100, [card])
    const [, , bottom] = glassAt(300, 300, [card])
    expect(top).toBeGreaterThan(0.9)
    expect(bottom).toBeGreaterThan(0.2)
    expect(top).toBeGreaterThan(bottom)
  })

  it('pulls the picture outwards near the edge and leaves the outside alone', () => {
    const [, dyNearTop] = glassAt(300, 104, [card])
    expect(dyNearTop).toBeLessThan(-20)
    expect(glassAt(300, 40, [card])).toEqual([0, 0, 0])
  })

  it('stays finite on the center line of a block', () => {
    for (const value of glassAt(300, 200, [card])) expect(Number.isFinite(value)).toBe(true)
  })
})

describe('createFrameGate', () => {
  it('draws every second frame of a 60 Hz screen at 30 fps', () => {
    const gate = createFrameGate(30)
    const frames = Array.from({ length: 60 }, (_, i) => gate(i * (1000 / 60)))
    expect(frames.filter(Boolean)).toHaveLength(30)
  })

  it('keeps ~30 fps on 120 and 144 Hz screens', () => {
    for (const hz of [120, 144]) {
      const gate = createFrameGate(30)
      const drawn = Array.from({ length: hz }, (_, i) => gate(i * (1000 / hz))).filter(Boolean).length
      expect(drawn).toBeGreaterThanOrEqual(28)
      expect(drawn).toBeLessThanOrEqual(30)
    }
  })
})

describe('mixRgb', () => {
  it('blends and clamps', () => {
    expect(mixRgb([0, 0, 0], [1, 1, 1], 0.25)).toEqual([0.25, 0.25, 0.25])
    expect(mixRgb([0, 0, 0], [1, 1, 1], 2)).toEqual([1, 1, 1])
  })
})
