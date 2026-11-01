// Pure math of the live background: soft light drifting behind fluted (ribbed) glass.
// The WebGL renderer runs the same functions in GLSL, generated from the same constants
// (see fieldGlsl); the Canvas 2D fallback and the tests use this TS copy.

/** Tuning knobs of the field. Screen coordinates are CSS px, y down. */
export const FIELD = {
  // Width of one glass rib, CSS px
  ribPx: 22,
  // How much a rib squeezes what is behind it: each rib shows (1 + refraction) rib widths.
  // Every rib scales it by its own factor (see ribTraits)
  refraction: 1.6,
  // Buffer px per CSS px. The picture is soft by nature, so half resolution is enough;
  // the CPU fallback draws its single frame even coarser
  renderScale: 0.5,
  fallbackScale: 0.25,
  // Animation speed multiplier for the light time: at 4.5 a blob loops its path in ~11–23 s
  speed: 4.5,
  // Light time of the static frame (reduced motion, no WebGL)
  staticTime: 40,
} as const

// Each light blob: center (x, y as viewport fractions), drift amplitude (x, y), drift speed
// (x, y, rad/s), phase, radius (viewport heights), intensity
const BLOBS: ReadonlyArray<readonly [number, number, number, number, number, number, number, number, number]> = [
  [0.35, 0.55, 0.25, 0.18, 0.11, 0.07, 0, 0.26, 0.95],
  [0.85, 0.3, 0.3, 0.15, 0.08, 0.13, 2.1, 0.22, 0.8],
  [0.15, 0.95, 0.2, 0.12, 0.09, 0.06, 4.2, 0.2, 0.85],
]

/**
 * Brightness (0–1) of the light behind the glass at viewport fractions (nx, ny): a few soft
 * blobs drifting on slow Lissajous paths. `aspect` keeps them round on any screen.
 */
export function lightAt(nx: number, ny: number, aspect: number, t: number): number {
  let l = 0
  for (const [cx, cy, ax, ay, sx, sy, phase, r, k] of BLOBS) {
    const dx = (nx - cx - ax * Math.sin(t * sx + phase)) * aspect
    const dy = ny - cy - ay * Math.cos(t * sy + phase)
    l += k * Math.exp(-(dx * dx + dy * dy) / (r * r))
  }
  return Math.min(l, 1)
}

/** Stable pseudo-random number in [0, 1) for a rib index. Same formula as in the shader. */
export function hash(n: number): number {
  return fract(Math.sin(n * 12.9898 + 4.1414) * 437.5453)
}

/**
 * Every rib is a slightly different piece of glass: how much it squeezes the light, how clear
 * it is, how bright its glint is, whether it also catches light on the right edge, a small
 * vertical shift of what it shows (uneven cast glass) and the phase of its shimmer.
 */
export function ribTraits(i: number) {
  const a = hash(i)
  const b = hash(i + 17)
  const c = hash(i + 31)
  const d = hash(i + 47)
  return {
    refraction: FIELD.refraction * (0.4 + 1.2 * a),
    clarity: 0.35 + 0.65 * b,
    glint: 0.1 + 0.9 * c,
    // About a third of the ribs get a rim light on the right edge
    rim: 0.9 * smoothstep(0.65, 1, d),
    shiftPx: (b - 0.5) * 60,
    phase: a * 6.2832,
  }
}

/**
 * Shading across one rib, u = 0 at its left edge and 1 at the right: a dark seam between
 * ribs, a thin glint just after it, an optional rim light before the right edge, and the rib
 * body dims towards the right.
 */
export function ribShade(u: number, glint: number, rim: number): number {
  const body = 0.45 + 0.55 * Math.pow(1 - u, 1.5)
  const left = glint * Math.exp(-(((u - 0.06) / 0.035) ** 2))
  const right = rim * Math.exp(-(((u - 0.93) / 0.03) ** 2))
  return (body + left + right) * smoothstep(0, 0.03, u)
}

/** Final intensity (0–1) at screen point (x, y) of a w × h viewport, CSS px. */
export function flutedAt(x: number, y: number, w: number, h: number, t: number): number {
  const i = Math.floor(x / FIELD.ribPx)
  const u = x / FIELD.ribPx - i
  const rib = ribTraits(i)
  // Each rib shows a wider slice of the light, squeezed into the rib width
  const sx = x + (u - 0.5) * FIELD.ribPx * rib.refraction
  const sy = y + rib.shiftPx
  // Glints slowly brighten and fade, each rib at its own pace
  const shimmer = 0.65 + 0.35 * Math.sin(t * 0.15 + rib.phase)
  const light = lightAt(sx / w, sy / h, w / h, t) * rib.clarity
  return Math.min(light * ribShade(u, rib.glint * shimmer, rib.rim * shimmer), 1)
}

/** GLSL source of the same functions, generated from FIELD and BLOBS so the two never drift. */
export function fieldGlsl(): string {
  const blobs = BLOBS.map(([cx, cy, ax, ay, sx, sy, phase, r, k]) => `
  d = vec2((n.x - ${f(cx)} - ${f(ax)} * sin(t * ${f(sx)} + ${f(phase)})) * aspect,
           n.y - ${f(cy)} - ${f(ay)} * cos(t * ${f(sy)} + ${f(phase)}));
  l += ${f(k)} * exp(-dot(d, d) / ${f(r * r)});`).join('')
  return `float lightAt(vec2 n, float aspect, float t) {
  float l = 0.0;
  vec2 d;${blobs}
  return min(l, 1.0);
}

float hash(float n) {
  return fract(sin(n * 12.9898 + 4.1414) * 437.5453);
}

float ribShade(float u, float glint, float rim) {
  float body = 0.45 + 0.55 * pow(1.0 - u, 1.5);
  float gl = (u - 0.06) / 0.035;
  float gr = (u - 0.93) / 0.03;
  return (body + glint * exp(-gl * gl) + rim * exp(-gr * gr)) * smoothstep(0.0, 0.03, u);
}

float flutedAt(vec2 p, vec2 size, float t) {
  float x = p.x / ${f(FIELD.ribPx)};
  float i = floor(x);
  float u = x - i;
  float a = hash(i);
  float b = hash(i + 17.0);
  float c = hash(i + 31.0);
  float d = hash(i + 47.0);
  float refraction = ${f(FIELD.refraction)} * (0.4 + 1.2 * a);
  float sx = p.x + (u - 0.5) * ${f(FIELD.ribPx)} * refraction;
  float sy = p.y + (b - 0.5) * 60.0;
  float shimmer = 0.65 + 0.35 * sin(t * 0.15 + a * 6.2832);
  float light = lightAt(vec2(sx, sy) / size, size.x / size.y, t) * (0.35 + 0.65 * b);
  float glint = (0.1 + 0.9 * c) * shimmer;
  float rim = 0.9 * smoothstep(0.65, 1.0, d) * shimmer;
  return min(light * ribShade(u, glint, rim), 1.0);
}`
}

function f(n: number): string {
  return Number.isInteger(n) ? `${n}.0` : String(n)
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

/** RGB in 0–1. */
export type Rgb = [number, number, number]

/** Linear interpolation of RGB colors, t in 0–1. */
export function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  const k = clamp(t, 0, 1)
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]
}

function fract(x: number): number {
  return x - Math.floor(x)
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

function clamp(x: number, min: number, max: number): number {
  return Math.min(Math.max(x, min), max)
}
