// Pure math of the live background: soft light drifting behind fluted (ribbed) glass.
// The WebGL renderer runs the same functions in GLSL, generated from the same constants
// (see fieldGlsl); the Canvas 2D fallback and the tests use this TS copy.

/** Tuning knobs of the field. Screen coordinates are CSS px, y down. */
export const FIELD = {
  // Width of one glass rib, CSS px
  ribPx: 22,
  // How much a rib squeezes what is behind it: each rib shows (1 + refraction) rib widths
  refraction: 1.6,
  // Buffer px per CSS px. The picture is soft by nature, so half resolution is enough;
  // the CPU fallback draws its single frame even coarser
  renderScale: 0.5,
  fallbackScale: 0.25,
  // Animation speed multiplier for the light time
  speed: 1,
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

/**
 * Shading across one rib, u = 0 at its left edge and 1 at the right: a dark seam between
 * ribs, a thin glint just after it, then the rib body dims towards the right edge.
 */
export function ribShade(u: number): number {
  const body = 0.45 + 0.55 * Math.pow(1 - u, 1.5)
  const glint = 0.6 * Math.exp(-(((u - 0.06) / 0.035) ** 2))
  return (body + glint) * smoothstep(0, 0.03, u)
}

/** Final intensity (0–1) at screen point (x, y) of a w × h viewport, CSS px. */
export function flutedAt(x: number, y: number, w: number, h: number, t: number): number {
  const u = fract(x / FIELD.ribPx)
  // Each rib shows a wider slice of the light, squeezed into the rib width
  const sx = x + (u - 0.5) * FIELD.ribPx * FIELD.refraction
  return Math.min(lightAt(sx / w, y / h, w / h, t) * ribShade(u), 1)
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

float ribShade(float u) {
  float body = 0.45 + 0.55 * pow(1.0 - u, 1.5);
  float g = (u - 0.06) / 0.035;
  float glint = 0.6 * exp(-g * g);
  return (body + glint) * smoothstep(0.0, 0.03, u);
}

float flutedAt(vec2 p, vec2 size, float t) {
  float u = fract(p.x / ${f(FIELD.ribPx)});
  float sx = p.x + (u - 0.5) * ${f(FIELD.ribPx * FIELD.refraction)};
  return min(lightAt(vec2(sx, p.y) / size, size.x / size.y, t) * ribShade(u), 1.0);
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
