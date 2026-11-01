// Pure math of the live background: a wall of vertical dotted lines waving under a perspective
// camera. The WebGL renderer runs the same height function in GLSL (see renderer.ts); the
// Canvas 2D fallback and the tests use this TS copy.

export type Mat4 = Float32Array

/**
 * Tuning knobs of the field. World units: the wall is the plane z = 0 (x right, y up), waves
 * push its dots along z, towards the camera. The camera looks at the wall from the front-left,
 * so the lines bend sideways like a curtain and the right side recedes into the background.
 */
export const FIELD = {
  // Screen pitch of the dotted lines and of the dots along a line, CSS px
  lineSpacingPx: 12,
  dotSpacingPx: 5,
  maxLines: 200,
  maxDotsPerLine: 240,
  // The grid is a bit larger than the view, so waves never show an edge (in NDC units)
  overscan: 1.1,
  // Camera: distance to the wall center and the turn away from facing it head-on
  distance: 6,
  yaw: (25 * Math.PI) / 180,
  fovY: (50 * Math.PI) / 180,
  // Dot diameter in CSS px at the camera distance
  pointSize: 2.4,
  // Animation speed multiplier for the wave time
  speed: 0.5,
  // Depth range (view distance) where the field fades into the background
  fadeStart: 8,
  fadeEnd: 16,
  // Wave time of the static frame (reduced motion, no WebGL)
  staticTime: 12,
} as const

type Vec3 = readonly [number, number, number]

const EYE: Vec3 = [-FIELD.distance * Math.sin(FIELD.yaw), 0, FIELD.distance * Math.cos(FIELD.yaw)]
const TARGET: Vec3 = [0, 0, 0]

// Each wave: amplitude, direction on the wall (x, y), frequency, phase speed
const WAVES: ReadonlyArray<readonly [number, number, number, number, number]> = [
  [0.16, 0.42, 0.91, 0.9, 0.55],
  [0.11, -0.77, 0.64, 1.3, 0.43],
  [0.07, 0.96, -0.28, 2.1, -0.71],
  [0.04, -0.2, -0.98, 3.3, 0.9],
]

/** Upper bound of |height|: the sum of the wave amplitudes. */
export const MAX_HEIGHT = WAVES.reduce((sum, [amp]) => sum + amp, 0)

/**
 * Offset of the wall towards the camera at (x, y) and wave time t: a few crossing sine waves
 * over slowly warped coordinates, so the pattern never looks like a regular grid.
 * Keep in sync with `height()` in the vertex shader.
 */
export function fieldHeight(x: number, y: number, t: number): number {
  const qx = x + 0.35 * Math.sin(y * 0.37 + t * 0.21)
  const qy = y + 0.35 * Math.sin(x * 0.29 - t * 0.17)
  let h = 0
  for (const [amp, dx, dy, freq, speed] of WAVES) {
    h += amp * Math.sin((qx * dx + qy * dy) * freq + t * speed)
  }
  return h
}

/** GLSL source of the same height function, generated from WAVES so the two never drift. */
export function heightGlsl(): string {
  const terms = WAVES.map(([amp, dx, dy, freq, speed]) =>
    `${f(amp)} * sin(dot(q, vec2(${f(dx)}, ${f(dy)})) * ${f(freq)} + t * ${f(speed)})`,
  )
  return `float height(vec2 p, float t) {
  vec2 q = p + 0.35 * vec2(sin(p.y * 0.37 + t * 0.21), sin(p.x * 0.29 - t * 0.17));
  return ${terms.join('\n    + ')};
}`
}

function f(n: number): string {
  return Number.isInteger(n) ? `${n}.0` : String(n)
}

/**
 * Grid of (x, y) pairs on the wall: vertical dotted lines across the view. Line positions are
 * picked by casting rays through evenly spaced screen columns, and each line spans the view
 * height at its own depth with the same number of dots, so at rest lines and dots keep an even
 * pitch on screen. Lines further than the fade range are dropped. Depends on the viewport:
 * rebuild it on resize.
 */
export function createGrid(cssWidth: number, cssHeight: number): Float32Array {
  const aspect = cssWidth / cssHeight
  const lines = clampInt(cssWidth / FIELD.lineSpacingPx, 8, FIELD.maxLines)
  const dots = clampInt(cssHeight / FIELD.dotSpacingPx, 20, FIELD.maxDotsPerLine)
  const { right, forward } = cameraBasis()
  const tanY = Math.tan(FIELD.fovY / 2)
  const out: number[] = []
  for (let i = 0; i < lines; i++) {
    const ndcX = FIELD.overscan * (-1 + (2 * i) / (lines - 1))
    // Ray through this screen column at mid height; forward has unit length, so the ray
    // parameter at the hit point is the view distance
    const dir = [0, 1, 2].map(k => forward[k]! + right[k]! * ndcX * tanY * aspect)
    if (dir[2]! >= -1e-3) continue
    const w = -EYE[2] / dir[2]!
    if (w > FIELD.fadeEnd) continue
    const x = EYE[0] + dir[0]! * w
    const half = w * tanY * FIELD.overscan
    for (let j = 0; j < dots; j++) out.push(x, -half + (2 * half * j) / (dots - 1))
  }
  return Float32Array.from(out)
}

/** Unit right, up and forward vectors of the field camera. */
export function cameraBasis(): { right: Vec3, up: Vec3, forward: Vec3 } {
  const back = normalize([EYE[0] - TARGET[0], EYE[1] - TARGET[1], EYE[2] - TARGET[2]])
  const right = normalize(cross([0, 1, 0], back))
  return { right, up: cross(back, right), forward: [-back[0], -back[1], -back[2]] }
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
  return multiply(perspective(FIELD.fovY, aspect, 0.1, 60), lookAt(EYE, TARGET))
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
 * Dot size (CSS px) and alpha (0–1) at view distance `w` and wave offset `h`: dots shrink and
 * fade with depth, crests (closer to the camera) are a bit brighter. Keep in sync with the
 * vertex shader.
 */
export function dotStyle(w: number, h: number): { size: number, alpha: number } {
  const size = (FIELD.pointSize * FIELD.distance) / w
  const depthFade = 1 - smoothstep(FIELD.fadeStart, FIELD.fadeEnd, w)
  const crest = 0.65 + 0.35 * clamp(h / MAX_HEIGHT * 0.5 + 0.5, 0, 1)
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

function clampInt(x: number, min: number, max: number): number {
  return Math.round(clamp(x, min, max))
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
