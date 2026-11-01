import { describe, expect, it } from 'vitest'
import {
  FIELD,
  MAX_HEIGHT,
  createFrameGate,
  createGrid,
  dotStyle,
  fieldHeight,
  fieldViewProj,
  gridCols,
  heightGlsl,
  mixRgb,
  toClip,
} from '../../app/lib/live-field/field'

describe('fieldHeight', () => {
  it('stays within the sum of wave amplitudes', () => {
    for (let x = -10; x <= 10; x += 0.7) {
      for (let z = -20; z <= 1; z += 0.9) {
        for (const t of [0, 3.3, 120]) {
          expect(Math.abs(fieldHeight(x, z, t))).toBeLessThanOrEqual(MAX_HEIGHT)
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
  const aspect = 16 / 10
  const grid = createGrid(aspect, 200)
  const viewProj = fieldViewProj(aspect)

  it('has rows × cols points', () => {
    expect(grid.length).toBe(FIELD.rows * 200 * 2)
  })

  it('goes away from the camera row by row', () => {
    const rowZ = (row: number) => grid[row * 200 * 2 + 1]!
    expect(rowZ(0)).toBeCloseTo(FIELD.zNear)
    for (let r = 1; r < FIELD.rows; r++) expect(rowZ(r)).toBeLessThan(rowZ(r - 1))
  })

  it('spans a bit more than the view width in every row', () => {
    for (const row of [0, 20, FIELD.rows - 1]) {
      const first = row * 200 * 2
      const last = first + 199 * 2
      const [lx, , , lw] = toClip(viewProj, grid[first]!, 0, grid[first + 1]!)
      const [rx, , , rw] = toClip(viewProj, grid[last]!, 0, grid[last + 1]!)
      expect(lx / lw).toBeLessThan(-1)
      expect(rx / rw).toBeGreaterThan(1)
      expect(rx / rw).toBeLessThan(1.5)
    }
  })

  it('puts the near rows in the lower half of the screen and the horizon in the upper half', () => {
    const [, nearY, , nearW] = toClip(viewProj, 0, 0, grid[1]!)
    const [, farY, , farW] = toClip(viewProj, 0, 0, grid[grid.length - 1]!)
    expect(nearY / nearW).toBeLessThan(-0.5)
    expect(farY / farW).toBeGreaterThan(0)
    expect(farY / farW).toBeLessThan(1)
  })
})

describe('gridCols', () => {
  it('scales with the viewport width within limits', () => {
    expect(gridCols(375)).toBe(FIELD.minCols)
    expect(gridCols(1280)).toBe(256)
    expect(gridCols(3840)).toBe(FIELD.maxCols)
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
