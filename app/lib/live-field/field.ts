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
  // Phones: the light stands still and follows the tilt. `offset` is how far it shifts at full
  // tilt (viewport fractions), `rangeDeg` the tilt for that, `time` how much it also morphs
  tilt: { offset: 0.12, rangeDeg: 30, time: 6 },
  // A press sends a ring across the glass: it pushes the light outwards and brightens the ribs
  ripple: { max: 4, speedPx: 650, widthPx: 60, lifeS: 1.4, pushPx: 45, glow: 0.85 },
  // Liquid glass blocks (marked data-glass). Inside, the picture is frosted: the ribs average
  // out to a soft glow (`frost` is the average rib shading). In a `bevelPx` band along the edge
  // the glass works as a lens: it shows the picture from up to `pullPx` beyond its edge, squeezed
  // and sharp. `magnify` slightly enlarges what is behind the middle of the block. `flatten` is
  // how much of the frosted inside is the light averaged over the whole block (the rest follows
  // the light under each point), so a block glows evenly instead of showing a strong gradient.
  // Up to `max` blocks at once (uniform budget: 2 vectors per block, fine even on old phones)
  glass: { max: 16, bevelPx: 22, pullPx: 22, magnify: 0.03, frost: 0.47, flatten: 0.85 },
  // Desktop: outside the chat column the field gets its own opacity, fading in over this many px
  sideFadePx: 120,
} as const

/** A glass block on screen: CSS px from the viewport top left, `r` is its corner radius. */
export interface GlassRect {
  x: number
  y: number
  w: number
  h: number
  r: number
}

/** Signed distance from (px, py) to a rounded rectangle: negative inside. */
export function roundedBoxSdf(px: number, py: number, rect: GlassRect): number {
  const r = Math.min(rect.r, rect.w / 2, rect.h / 2)
  const qx = Math.abs(px - (rect.x + rect.w / 2)) - (rect.w / 2 - r)
  const qy = Math.abs(py - (rect.y + rect.h / 2)) - (rect.h / 2 - r)
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r
}

/**
 * What a glass block does to screen point (x, y): where the picture there comes from (sx, sy),
 * how sharp it stays (1 outside and at the very edge, 0 frosted) and whether the point is
 * inside a block. The first block that contains the point wins: pass nested blocks (a button
 * inside a card) before their containers.
 * Same math as `glass()` in the shader.
 */
export function glassAt(x: number, y: number, rects: readonly GlassRect[]): { sx: number, sy: number, sharp: number, inside: boolean } {
  const { bevelPx, pullPx, magnify } = FIELD.glass
  for (const rect of rects) {
    const d = roundedBoxSdf(x, y, rect)
    if (d >= 0) continue
    let sx = x - (x - rect.x - rect.w / 2) * magnify
    let sy = y - (y - rect.y - rect.h / 2) * magnify
    const t = clamp(1 + d / bevelPx, 0, 1)
    // The normal is only needed (and only defined) near the edge, not on the center line
    if (t > 0) {
      const gx = roundedBoxSdf(x + 1, y, rect) - roundedBoxSdf(x - 1, y, rect)
      const gy = roundedBoxSdf(x, y + 1, rect) - roundedBoxSdf(x, y - 1, rect)
      const len = Math.max(Math.hypot(gx, gy), 0.001)
      sx += (gx / len) * t * t * pullPx
      sy += (gy / len) * t * t * pullPx
    }
    return { sx, sy, sharp: smoothstep(0.2, 0.75, t), inside: true }
  }
  return { sx: x, sy: y, sharp: 1, inside: false }
}

/**
 * Opacity of the field at screen x: `column` inside the chat column, `side` beyond it, with a
 * soft fade between. On phones the column is the whole screen.
 */
export function columnAlpha(x: number, column: readonly [number, number], opacity: { column: number, side: number }): number {
  const outside = Math.max(column[0] - x, x - column[1], 0)
  const k = smoothstep(0, FIELD.sideFadePx, outside)
  return opacity.column + (opacity.side - opacity.column) * k
}

/** A ring from a press: center in CSS px, age in seconds. */
export interface Ripple {
  x: number
  y: number
  age: number
}

/**
 * Effect of the rings at screen point (x, y): how far they push the light (dx, dy, CSS px) and
 * how much they brighten it. Same math as `ripple()` in the shader.
 */
export function rippleAt(x: number, y: number, ripples: readonly Ripple[]): [number, number, number] {
  const { speedPx, widthPx, lifeS, pushPx } = FIELD.ripple
  let dx = 0
  let dy = 0
  let glow = 0
  for (const r of ripples) {
    const vx = x - r.x
    const vy = y - r.y
    const d = Math.hypot(vx, vy)
    const g = (d - r.age * speedPx) / widthPx
    const ring = Math.exp(-g * g) * (1 - smoothstep(0, lifeS, r.age))
    const k = (ring * pushPx) / Math.max(d, 1)
    dx += vx * k
    dy += vy * k
    glow += ring
  }
  return [dx, dy, glow]
}

interface Blob {
  // Center as viewport fractions and how far it drifts from there (Lissajous path)
  x: number
  y: number
  driftX: number
  driftY: number
  driftSpeedX: number
  driftSpeedY: number
  phase: number
  // Radius across the long axis (viewport heights), how much longer it is along it,
  // starting angle and turning speed
  radius: number
  stretch: number
  angle: number
  turnSpeed: number
  // Peak brightness and how fast the blob "breathes" (radius and brightness swell and fade)
  intensity: number
  breathSpeed: number
}

// Speeds are per unit of light time (FIELD.speed units per second)
const BLOBS: readonly Blob[] = [
  { x: 0.3, y: 0.55, driftX: 0.25, driftY: 0.18, driftSpeedX: 0.11, driftSpeedY: 0.07, phase: 0, radius: 0.16, stretch: 3.2, angle: 0.9, turnSpeed: 0.03, intensity: 0.95, breathSpeed: 0.09 },
  { x: 0.8, y: 0.3, driftX: 0.3, driftY: 0.15, driftSpeedX: 0.08, driftSpeedY: 0.13, phase: 2.1, radius: 0.13, stretch: 2.4, angle: -0.6, turnSpeed: -0.04, intensity: 0.8, breathSpeed: 0.12 },
  { x: 0.15, y: 0.95, driftX: 0.2, driftY: 0.12, driftSpeedX: 0.09, driftSpeedY: 0.06, phase: 4.2, radius: 0.12, stretch: 3.8, angle: 0.3, turnSpeed: 0.025, intensity: 0.85, breathSpeed: 0.07 },
  { x: 0.6, y: 0.8, driftX: 0.35, driftY: 0.2, driftSpeedX: 0.05, driftSpeedY: 0.1, phase: 5.3, radius: 0.1, stretch: 2, angle: 1.8, turnSpeed: -0.02, intensity: 0.6, breathSpeed: 0.1 },
]

/**
 * Brightness (0–1) of the light behind the glass at viewport fractions (nx, ny). The light is a
 * few long soft streaks: each drifts, slowly turns and breathes, and the space they live in
 * flows (domain warp), so their outlines bend, merge and split instead of reading as circles.
 * `aspect` keeps shapes undistorted on any screen.
 */
export function lightAt(nx: number, ny: number, aspect: number, t: number): number {
  let qx = nx * aspect
  let qy = ny
  const wx = 0.09 * Math.sin(qy * 4.3 + t * 0.07) + 0.04 * Math.sin(qy * 9.7 - t * 0.11)
  const wy = 0.09 * Math.sin(qx * 3.7 - t * 0.06) + 0.04 * Math.sin(qx * 8.9 + t * 0.09)
  qx += wx
  qy += wy
  let l = 0
  for (const b of BLOBS) {
    const breath = Math.sin(t * b.breathSpeed + b.phase)
    const r = b.radius * (1 + 0.3 * breath)
    const dx = qx - (b.x + b.driftX * Math.sin(t * b.driftSpeedX + b.phase)) * aspect
    const dy = qy - (b.y + b.driftY * Math.cos(t * b.driftSpeedY + b.phase))
    const a = b.angle + t * b.turnSpeed
    const along = (dx * Math.cos(a) + dy * Math.sin(a)) / (r * b.stretch)
    const across = (-dx * Math.sin(a) + dy * Math.cos(a)) / r
    l += b.intensity * (0.75 + 0.25 * breath) * Math.exp(-(along * along + across * across))
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

/**
 * Final intensity (0–1) at screen point (x, y) of a w × h viewport, CSS px. `offset` shifts the
 * light (phone tilt, viewport fractions), `ripples` are the rings from presses.
 */
export function flutedAt(
  x: number,
  y: number,
  w: number,
  h: number,
  t: number,
  offset: readonly [number, number] = [0, 0],
  ripples: readonly Ripple[] = [],
): number {
  const i = Math.floor(x / FIELD.ribPx)
  const u = x / FIELD.ribPx - i
  const rib = ribTraits(i)
  // Each rib shows a wider slice of the light, squeezed into the rib width
  const [pushX, pushY, glow] = rippleAt(x, y, ripples)
  const sx = x + (u - 0.5) * FIELD.ribPx * rib.refraction + pushX
  const sy = y + rib.shiftPx + pushY
  // Glints slowly brighten and fade, each rib at its own pace
  const shimmer = 0.65 + 0.35 * Math.sin(t * 0.15 + rib.phase)
  const light = Math.min(lightAt(sx / w + offset[0], sy / h + offset[1], w / h, t) + glow * FIELD.ripple.glow, 1) * rib.clarity
  return Math.min(light * ribShade(u, rib.glint * shimmer, rib.rim * shimmer), 1)
}

/**
 * Light averaged over a glass block (a 3 × 3 grid of samples): what a very strong blur would
 * leave of it. Computed on the CPU once per frame for each block and passed to the shader.
 */
export function blockLight(rect: GlassRect, w: number, h: number, t: number, offset: readonly [number, number] = [0, 0]): number {
  let sum = 0
  for (const fx of [1 / 6, 1 / 2, 5 / 6]) {
    for (const fy of [1 / 6, 1 / 2, 5 / 6]) {
      sum += lightAt((rect.x + rect.w * fx) / w + offset[0], (rect.y + rect.h * fy) / h + offset[1], w / h, t)
    }
  }
  return sum / 9
}

/**
 * The picture behind frosted glass at (x, y): the light without ribs, at the average rib
 * shading, as if the ribs were blurred away. `average` is the block's blockLight(): it flattens
 * the light across the block.
 */
export function frostedAt(
  x: number,
  y: number,
  w: number,
  h: number,
  t: number,
  offset: readonly [number, number] = [0, 0],
  ripples: readonly Ripple[] = [],
  average?: number,
): number {
  const [pushX, pushY, glow] = rippleAt(x, y, ripples)
  const local = lightAt((x + pushX) / w + offset[0], (y + pushY) / h + offset[1], w / h, t)
  const light = average === undefined ? local : average + (local - average) * (1 - FIELD.glass.flatten)
  return Math.min(light + glow * FIELD.ripple.glow, 1) * FIELD.glass.frost
}

/** GLSL source of the same functions, generated from FIELD and BLOBS so the two never drift. */
export function fieldGlsl(): string {
  const blobs = BLOBS.map(b => `
  breath = sin(t * ${f(b.breathSpeed)} + ${f(b.phase)});
  r = ${f(b.radius)} * (1.0 + 0.3 * breath);
  d = q - vec2((${f(b.x)} + ${f(b.driftX)} * sin(t * ${f(b.driftSpeedX)} + ${f(b.phase)})) * aspect,
               ${f(b.y)} + ${f(b.driftY)} * cos(t * ${f(b.driftSpeedY)} + ${f(b.phase)}));
  a = ${f(b.angle)} + t * ${f(b.turnSpeed)};
  e = vec2((d.x * cos(a) + d.y * sin(a)) / (r * ${f(b.stretch)}), (-d.x * sin(a) + d.y * cos(a)) / r);
  l += ${f(b.intensity)} * (0.75 + 0.25 * breath) * exp(-dot(e, e));`).join('')
  return `float lightAt(vec2 n, float aspect, float t) {
  vec2 q = vec2(n.x * aspect, n.y);
  q += vec2(0.09 * sin(q.y * 4.3 + t * 0.07) + 0.04 * sin(q.y * 9.7 - t * 0.11),
            0.09 * sin(q.x * 3.7 - t * 0.06) + 0.04 * sin(q.x * 8.9 + t * 0.09));
  float l = 0.0;
  float breath;
  float r;
  float a;
  vec2 d;
  vec2 e;${blobs}
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

// Rings from presses: x, y (CSS px), age (s), active flag. Declared by the renderer
vec3 ripple(vec2 p) {
  vec3 r = vec3(0.0);
  for (int k = 0; k < ${FIELD.ripple.max}; k++) {
    vec4 rp = uRipples[k];
    if (rp.w > 0.0) {
      vec2 v = p - rp.xy;
      float d = length(v);
      float g = (d - rp.z * ${f(FIELD.ripple.speedPx)}) / ${f(FIELD.ripple.widthPx)};
      float ring = exp(-g * g) * (1.0 - smoothstep(0.0, ${f(FIELD.ripple.lifeS)}, rp.z));
      r += vec3(v * ring * ${f(FIELD.ripple.pushPx)} / max(d, 1.0), ring);
    }
  }
  return r;
}

float flutedAt(vec2 p, vec2 size, float t, vec2 offset) {
  float x = p.x / ${f(FIELD.ribPx)};
  float i = floor(x);
  float u = x - i;
  float a = hash(i);
  float b = hash(i + 17.0);
  float c = hash(i + 31.0);
  float d = hash(i + 47.0);
  float refraction = ${f(FIELD.refraction)} * (0.4 + 1.2 * a);
  vec3 rp = ripple(p);
  float sx = p.x + (u - 0.5) * ${f(FIELD.ribPx)} * refraction + rp.x;
  float sy = p.y + (b - 0.5) * 60.0 + rp.y;
  float shimmer = 0.65 + 0.35 * sin(t * 0.15 + a * 6.2832);
  float light = min(lightAt(vec2(sx, sy) / size + offset, size.x / size.y, t) + rp.z * ${f(FIELD.ripple.glow)}, 1.0) * (0.35 + 0.65 * b);
  float glint = (0.1 + 0.9 * c) * shimmer;
  float rim = 0.9 * smoothstep(0.65, 1.0, d) * shimmer;
  return min(light * ribShade(u, glint, rim), 1.0);
}

float frostedAt(vec2 p, vec2 size, float t, vec2 offset, float average) {
  vec3 rp = ripple(p);
  float local = lightAt((p + rp.xy) / size + offset, size.x / size.y, t);
  float light = mix(average, local, ${f(Math.round((1 - FIELD.glass.flatten) * 1000) / 1000)});
  return min(light + rp.z * ${f(FIELD.ripple.glow)}, 1.0) * ${f(FIELD.glass.frost)};
}

float boxSdf(vec2 p, vec4 rect, float radius) {
  float r = min(radius, min(rect.z, rect.w) * 0.5);
  vec2 q = abs(p - (rect.xy + rect.zw * 0.5)) - (rect.zw * 0.5 - r);
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

// Glass blocks: x, y, width, height (CSS px; zero width means unused) and shape: corner radius,
// light averaged over the block. Declared by the renderer. Returns the sample point, sharpness
// and an inside flag; 'average' gets the block's averaged light
vec4 glass(vec2 p, out float average) {
  average = 0.0;
  for (int k = 0; k < ${FIELD.glass.max}; k++) {
    vec4 rect = uGlass[k];
    float radius = uGlassShape[k].x;
    average = uGlassShape[k].y;
    if (rect.z > 0.0) {
      float d = boxSdf(p, rect, radius);
      if (d < 0.0) {
        vec2 s = p - (p - rect.xy - rect.zw * 0.5) * ${f(FIELD.glass.magnify)};
        float t = clamp(1.0 + d / ${f(FIELD.glass.bevelPx)}, 0.0, 1.0);
        if (t > 0.0) {
          vec2 grad = vec2(
            boxSdf(p + vec2(1.0, 0.0), rect, radius) - boxSdf(p - vec2(1.0, 0.0), rect, radius),
            boxSdf(p + vec2(0.0, 1.0), rect, radius) - boxSdf(p - vec2(0.0, 1.0), rect, radius));
          s += grad / max(length(grad), 0.001) * t * t * ${f(FIELD.glass.pullPx)};
        }
        return vec4(s, smoothstep(0.2, 0.75, t), 1.0);
      }
    }
  }
  return vec4(p, 1.0, 0.0);
}

float columnAlpha(float x, vec2 column, vec2 opacity) {
  float outside = max(max(column.x - x, x - column.y), 0.0);
  return mix(opacity.x, opacity.y, smoothstep(0.0, ${f(FIELD.sideFadePx)}, outside));
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
