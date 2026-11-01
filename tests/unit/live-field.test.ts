import { describe, expect, it } from 'vitest'
import {
  FIELD,
  MAX_HEIGHT,
  createFrameGate,
  createGrid,
  dotStyle,
  fieldHeight,
  fieldViewProj,
  heightGlsl,
  mixRgb,
  toClip,
} from '../../app/lib/live-field/field'

describe('fieldHeight', () => {
  it('stays within the sum of wave amplitudes', () => {
    for (let x = -10; x <= 10; x += 0.7) {
      for (let y = -6; y <= 6; y += 0.9) {
        for (const t of [0, 3.3, 120]) {
          expect(Math.abs(fieldHeight(x, y, t))).toBeLessThanOrEqual(MAX_HEIGHT)
        }
      }
    }
  })

  it('moves over time', () => {
    expect(fieldHeight(1, -3, 0)).not.toBeCloseTo(fieldHeight(1, -3, 1), 3)
  })
})

describe('heightGlsl', () => {
  it('mirrors every wave of the TS height function', () => {
    const glsl = heightGlsl()
    expect(glsl).toContain('float height(vec2 p, float t)')
    expect(glsl.match(/sin\(dot\(q/g)).toHaveLength(4)
    // GLSL float literals need a decimal point
    expect(glsl).not.toMatch(/[^.\d]\d+\s*\*\s*sin/)
  })
})

describe('createGrid', () => {
  const [width, height] = [1280, 800]
  const grid = createGrid(width, height)
  const viewProj = fieldViewProj(width / height)
  const dots = height / FIELD.dotSpacingPx
  const lines = grid.length / 2 / dots
  const point = (line: number, dot: number) => {
    const i = (line * dots + dot) * 2
    const [cx, cy, , w] = toClip(viewProj, grid[i]!, grid[i + 1]!, 0)
    return { x: cx / w, y: cy / w, w, worldX: grid[i]! }
  }

  it('builds whole vertical lines of dots', () => {
    expect(Number.isInteger(lines)).toBe(true)
    expect(lines).toBeGreaterThan(50)
    expect(lines).toBeLessThanOrEqual(width / FIELD.lineSpacingPx + 1)
  })

  it('keeps each line vertical and taller than the view', () => {
    for (const line of [0, Math.floor(lines / 2), lines - 1]) {
      const top = point(line, dots - 1)
      const bottom = point(line, 0)
      expect(top.worldX).toBe(bottom.worldX)
      expect(top.y).toBeGreaterThan(1)
      expect(bottom.y).toBeLessThan(-1)
    }
  })

  it('spaces lines evenly on screen from edge to edge', () => {
    const xs = Array.from({ length: lines }, (_, line) => point(line, 0).x)
    expect(xs[0]).toBeLessThan(-1)
    expect(xs.at(-1)).toBeGreaterThan(1)
    const gaps = xs.slice(1).map((x, i) => x - xs[i]!)
    for (const gap of gaps) expect(gap).toBeCloseTo(gaps[0]!, 5)
  })

  it('turns the wall away from the camera: the right side is further', () => {
    expect(point(lines - 1, 0).w).toBeGreaterThan(point(0, 0).w)
    expect(point(lines - 1, 0).w).toBeLessThanOrEqual(FIELD.fadeEnd)
  })

  it('caps the point count on huge screens', () => {
    expect(createGrid(7680, 4320).length / 2).toBeLessThanOrEqual(FIELD.maxLines * FIELD.maxDotsPerLine)
  })
})

describe('dotStyle', () => {
  it('fades with depth', () => {
    expect(dotStyle(3, 0).alpha).toBeGreaterThan(dotStyle(15, 0).alpha)
    expect(dotStyle(FIELD.fadeEnd + 1, 0).alpha).toBe(0)
  })

  it('never draws dots smaller than a pixel', () => {
    expect(dotStyle(50, 0).size).toBe(1)
  })

  it('makes crests brighter than troughs', () => {
    expect(dotStyle(3, MAX_HEIGHT).alpha).toBeGreaterThan(dotStyle(3, -MAX_HEIGHT).alpha)
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
