// Pure math of the live background: a plane of dot rows waving under a perspective camera.
// The WebGL renderer runs the same height function in GLSL (see renderer.ts); the Canvas 2D
// fallback and the tests use this TS copy.

export type Mat4 = Float32Array

/** Tuning knobs of the field. World units: the plane is y = 0, the camera looks along -z. */
export const FIELD = {
  rows: 70,
  // Dots per row: about one per this many CSS px of viewport width
  dotSpacingPx: 5,
  minCols: 120,
  maxCols: 400,
  // Depth of the first row and the gap to the next one; each next gap grows by rowGrowth,
  // so rows keep a similar spacing on screen instead of piling up at the horizon
  zNear: 0.4,
  rowGap: 0.08,
  rowGrowth: 1.04,
  // Rows are a bit wider than the view, so waves never show an edge
  widthMargin: 1.15,
  eye: [0, 1.6, 2] as const,
  // ~12° below the horizon: the horizon lands in the upper third of the screen
  target: [0, -0.53, -8] as const,
  fovY: (50 * Math.PI) / 180,
  // Dot diameter in CSS px at a view distance of 3 units
  pointSize: 2,
  // Animation speed multiplier for the wave time
  speed: 0.5,
  // Depth range (view distance) where the field fades into the background
  fadeStart: 7,
  fadeEnd: 20,
  // Wave time of the static frame (reduced motion, no WebGL)
  staticTime: 12,
} as const

// Each wave: amplitude, direction (x, z), frequency, phase speed
const WAVES: ReadonlyArray<readonly [number, number, number, number, number]> = [
  [0.16, 0.42, 0.91, 0.9, 0.55],
  [0.11, -0.77, 0.64, 1.3, 0.43],
  [0.07, 0.96, -0.28, 2.1, -0.71],
  [0.04, -0.2, -0.98, 3.3, 0.9],
]

/** Upper bound of |height|: the sum of the wave amplitudes. */
export const MAX_HEIGHT = WAVES.reduce((sum, [amp]) => sum + amp, 0)

/**
 * Height of the surface at (x, z) and wave time t: a few crossing sine waves over slowly
 * warped coordinates, so the pattern never looks like a regular grid.
 * Keep in sync with `height()` in the vertex shader.
 */
export function fieldHeight(x: number, z: number, t: number): number {
  const qx = x + 0.35 * Math.sin(z * 0.37 + t * 0.21)
  const qz = z + 0.35 * Math.sin(x * 0.29 - t * 0.17)
  let h = 0
  for (const [amp, dx, dz, freq, speed] of WAVES) {
    h += amp * Math.sin((qx * dx + qz * dz) * freq + t * speed)
  }
  return h
}

/** GLSL source of the same height function, generated from WAVES so the two never drift. */
export function heightGlsl(): string {
  const terms = WAVES.map(([amp, dx, dz, freq, speed]) =>
    `${f(amp)} * sin(dot(q, vec2(${f(dx)}, ${f(dz)})) * ${f(freq)} + t * ${f(speed)})`,
  )
  return `float height(vec2 p, float t) {
  vec2 q = p + 0.35 * vec2(sin(p.y * 0.37 + t * 0.21), sin(p.x * 0.29 - t * 0.17));
  return ${terms.join('\n    + ')};
}`
}

function f(n: number): string {
  return Number.isInteger(n) ? `${n}.0` : String(n)
}

/** Number of dots per row for a viewport width in CSS px. */
export function gridCols(cssWidth: number): number {
  return Math.round(Math.min(Math.max(cssWidth / FIELD.dotSpacingPx, FIELD.minCols), FIELD.maxCols))
}

/**
 * Grid of (x, z) pairs: rows of dots across the view. Every row spans the view width at its
 * own depth with the same number of dots, so dots keep a similar pitch on screen and each row
 * reads as a dotted line. Depends on the aspect ratio: rebuild it on resize.
 */
export function createGrid(aspect: number, cols: number, rows = FIELD.rows): Float32Array {
  const viewProj = fieldViewProj(aspect)
  const halfTan = Math.tan(FIELD.fovY / 2) * aspect * FIELD.widthMargin
  const grid = new Float32Array(cols * rows * 2)
  let i = 0
  let z = FIELD.zNear
  let gap = FIELD.rowGap
  for (let r = 0; r < rows; r++) {
    // View distance of the row center gives the half width of the view at that depth
    const half = toClip(viewProj, 0, 0, z)[3] * halfTan
    for (let c = 0; c < cols; c++) {
      grid[i++] = -half + (2 * half * c) / (cols - 1)
      grid[i++] = z
    }
    z -= gap
    gap *= FIELD.rowGrowth
  }
  return grid
}

/** Column-major perspective matrix, as WebGL expects. */
export function perspective(fovY: number, aspect: number, near: number, far: number): Mat4 {
  const fy = 1 / Math.tan(fovY / 2)
  const nf = 1 / (near - far)
  const m = new Float32Array(16)
  m[0] = fy / aspect
  m[5] = fy
  m[10] = (far + near) * nf
  m[11] = -1
  m[14] = 2 * far * near * nf
  return m
}

type Vec3 = readonly [number, number, number]

/** Column-major view matrix of a camera at `eye` looking at `target`, y up. */
export function lookAt(eye: Vec3, target: Vec3): Mat4 {
  const zAxis = normalize([eye[0] - target[0], eye[1] - target[1], eye[2] - target[2]])
  const xAxis = normalize(cross([0, 1, 0], zAxis))
  const yAxis = cross(zAxis, xAxis)
  const m = new Float32Array(16)
  m.set([
    xAxis[0], yAxis[0], zAxis[0], 0,
    xAxis[1], yAxis[1], zAxis[1], 0,
    xAxis[2], yAxis[2], zAxis[2], 0,
    -dot(xAxis, eye), -dot(yAxis, eye), -dot(zAxis, eye), 1,
  ])
  return m
}

/** a × b for column-major matrices. */
export function multiply(a: Mat4, b: Mat4): Mat4 {
  const m = new Float32Array(16)
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0
      for (let k = 0; k < 4; k++) sum += a[k * 4 + row]! * b[col * 4 + k]!
      m[col * 4 + row] = sum
    }
  }
  return m
}

/** View-projection matrix of the field camera for a viewport aspect ratio. */
export function fieldViewProj(aspect: number): Mat4 {
  return multiply(perspective(FIELD.fovY, aspect, 0.1, 60), lookAt(FIELD.eye, FIELD.target))
}

/** Transform a world point to clip space: [x, y, z, w]. */
export function toClip(m: Mat4, x: number, y: number, z: number): [number, number, number, number] {
  return [
    m[0]! * x + m[4]! * y + m[8]! * z + m[12]!,
    m[1]! * x + m[5]! * y + m[9]! * z + m[13]!,
    m[2]! * x + m[6]! * y + m[10]! * z + m[14]!,
    m[3]! * x + m[7]! * y + m[11]! * z + m[15]!,
  ]
}

/**
 * Dot size (CSS px) and alpha (0–1) at view distance `w` and height `y`: dots shrink and fade
 * with depth, crests are a bit brighter. Keep in sync with the vertex shader.
 */
export function dotStyle(w: number, y: number): { size: number, alpha: number } {
  const size = (FIELD.pointSize * 3) / w
  const depthFade = 1 - smoothstep(FIELD.fadeStart, FIELD.fadeEnd, w)
  const crest = 0.55 + 0.45 * clamp(y / MAX_HEIGHT * 0.5 + 0.5, 0, 1)
  // Sub-pixel dots are drawn at 1px and fade instead of shrinking further
  return { size: Math.max(size, 1), alpha: depthFade * crest * Math.min(size, 1) }
}

/**
 * Frame limiter for requestAnimationFrame: true when a frame should be drawn.
 * The small tolerance keeps 30 fps on a 60 Hz screen (every 2nd frame) despite timer jitter.
 */
export function createFrameGate(fps: number): (now: number) => boolean {
  const interval = 1000 / fps
  let last = -Infinity
  return (now) => {
    if (now - last < interval - 2) return false
    last = now
    return true
  }
}

/** Linear interpolation of RGB colors, t in 0–1. */
export function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  const k = clamp(t, 0, 1)
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]
}

/** RGB in 0–1. */
export type Rgb = [number, number, number]

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

function clamp(x: number, min: number, max: number): number {
  return Math.min(Math.max(x, min), max)
}

function normalize(v: Vec3): Vec3 {
  const len = Math.hypot(v[0], v[1], v[2])
  return [v[0] / len, v[1] / len, v[2] / len]
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}
