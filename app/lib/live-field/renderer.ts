// Live background renderer: one WebGL draw call of points, or a single Canvas 2D frame
// when WebGL is unavailable. Loaded lazily (dynamic import) after hydration.
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
} from './field'
import type { Rgb } from './field'

export interface FieldController {
  /** Animate (true) or show one static frame (false, reduced motion). */
  setAnimated: (animated: boolean) => void
  /** Pause the loop while the tab is hidden. */
  setVisible: (visible: boolean) => void
  /** New dot color; animated fields blend into it, static ones redraw at once. */
  setColor: (color: Rgb) => void
  /** Match the canvas buffer to its CSS size. */
  resize: () => void
  destroy: () => void
}

export interface FieldOptions {
  color: Rgb
  animated: boolean
  /** Called after the first frame is on screen. */
  onReady?: () => void
}

const MAX_DPR = 1.5
const FPS = 30
const COLOR_FADE_MS = 300
// A long pause (hidden tab, slow device) must not jump the waves forward
const MAX_STEP_MS = 100

/**
 * Dot color from the `--field-dot` token. Theme tokens are oklch, the shader needs sRGB:
 * a 1×1 canvas converts any CSS color the browser understands.
 */
export function readFieldColor(): Rgb {
  const value = getComputedStyle(document.documentElement).getPropertyValue('--field-dot').trim()
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  if (!ctx || !value) return [0.5, 0.5, 0.5]
  ctx.fillStyle = value
  ctx.fillRect(0, 0, 1, 1)
  const [r = 128, g = 128, b = 128] = ctx.getImageData(0, 0, 1, 1).data
  return [r / 255, g / 255, b / 255]
}

export function startField(canvas: HTMLCanvasElement, options: FieldOptions): FieldController {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: true })
  return gl ? startWebGl(canvas, gl, options) : startCanvas2d(canvas, options)
}

function bufferSize(canvas: HTMLCanvasElement): { width: number, height: number, dpr: number } {
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
  return {
    width: Math.max(1, Math.round(canvas.clientWidth * dpr)),
    height: Math.max(1, Math.round(canvas.clientHeight * dpr)),
    dpr,
  }
}

const VERTEX = `
attribute vec2 aGrid;
uniform mat4 uViewProj;
uniform float uTime;
uniform float uPointScale;
uniform float uMaxHeight;
uniform vec2 uFade;
varying float vAlpha;

${heightGlsl()}

void main() {
  float y = height(aGrid, uTime);
  vec4 clip = uViewProj * vec4(aGrid.x, y, aGrid.y, 1.0);
  gl_Position = clip;
  // Same as dotStyle() in field.ts
  float size = uPointScale / clip.w;
  gl_PointSize = max(size, 1.0);
  float depthFade = 1.0 - smoothstep(uFade.x, uFade.y, clip.w);
  float crest = 0.55 + 0.45 * clamp(y / uMaxHeight * 0.5 + 0.5, 0.0, 1.0);
  vAlpha = depthFade * crest * min(size, 1.0);
}
`

const FRAGMENT = `
precision mediump float;
uniform vec3 uColor;
varying float vAlpha;

void main() {
  float d = length(gl_PointCoord - 0.5);
  // GLSL smoothstep is undefined for edge0 >= edge1: invert instead of swapping the edges
  float a = (1.0 - smoothstep(0.3, 0.5, d)) * vAlpha;
  // The canvas is premultiplied: the page background shows through
  gl_FragColor = vec4(uColor * a, a);
}
`

function startWebGl(canvas: HTMLCanvasElement, gl: WebGLRenderingContext, options: FieldOptions): FieldController {
  let count = 0
  const gate = createFrameGate(FPS)

  let animated = options.animated
  let visible = true
  let color: Rgb = options.color
  let fadeFrom: Rgb = color
  let fadeTo: Rgb = color
  let fadeStart = 0
  let waveTime = FIELD.staticTime
  let lastNow = 0
  let frame = 0
  let lost = false
  let ready = false
  let dpr = 1
  let uniforms: ReturnType<typeof setup>

  function compile(type: number, source: string): WebGLShader {
    const shader = gl.createShader(type)!
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(`Live field shader: ${gl.getShaderInfoLog(shader)}`)
    }
    return shader
  }

  // Program, buffer and uniform locations; run again after a lost context is restored
  function setup() {
    const program = gl.createProgram()!
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX))
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`Live field program: ${gl.getProgramInfoLog(program)}`)
    }
    gl.useProgram(program)

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    const aGrid = gl.getAttribLocation(program, 'aGrid')
    gl.enableVertexAttribArray(aGrid)
    gl.vertexAttribPointer(aGrid, 2, gl.FLOAT, false, 0, 0)

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.clearColor(0, 0, 0, 0)

    const loc = (name: string) => gl.getUniformLocation(program, name)
    gl.uniform1f(loc('uMaxHeight'), MAX_HEIGHT)
    gl.uniform2f(loc('uFade'), FIELD.fadeStart, FIELD.fadeEnd)
    return {
      viewProj: loc('uViewProj'),
      time: loc('uTime'),
      pointScale: loc('uPointScale'),
      color: loc('uColor'),
    }
  }

  function resize() {
    const size = bufferSize(canvas)
    dpr = size.dpr
    if (canvas.width !== size.width || canvas.height !== size.height) {
      canvas.width = size.width
      canvas.height = size.height
    }
    if (lost) return
    const aspect = size.width / size.height
    const grid = createGrid(aspect, gridCols(canvas.clientWidth))
    count = grid.length / 2
    gl.bufferData(gl.ARRAY_BUFFER, grid, gl.STATIC_DRAW)
    gl.viewport(0, 0, size.width, size.height)
    gl.uniformMatrix4fv(uniforms.viewProj, false, fieldViewProj(aspect))
    gl.uniform1f(uniforms.pointScale, FIELD.pointSize * 3 * dpr)
    if (!animated) draw()
  }

  function draw() {
    if (lost) return
    gl.uniform1f(uniforms.time, waveTime)
    gl.uniform3f(uniforms.color, color[0], color[1], color[2])
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.drawArrays(gl.POINTS, 0, count)
    if (!ready) {
      ready = true
      options.onReady?.()
    }
  }

  function tick(now: number) {
    frame = requestAnimationFrame(tick)
    if (!gate(now)) return
    const step = lastNow ? Math.min(now - lastNow, MAX_STEP_MS) : 0
    lastNow = now
    waveTime += (step / 1000) * FIELD.speed
    if (fadeStart) {
      const t = (now - fadeStart) / COLOR_FADE_MS
      color = mixRgb(fadeFrom, fadeTo, t)
      if (t >= 1) fadeStart = 0
    }
    draw()
  }

  // The loop runs only while animated, visible and with a live context
  function sync() {
    const shouldRun = animated && visible && !lost
    if (shouldRun && !frame) {
      lastNow = 0
      frame = requestAnimationFrame(tick)
    }
    else if (!shouldRun && frame) {
      cancelAnimationFrame(frame)
      frame = 0
    }
  }

  function onLost(event: Event) {
    // Tells the browser we want the context back
    event.preventDefault()
    lost = true
    sync()
  }

  function onRestored() {
    lost = false
    uniforms = setup()
    resize()
    draw()
    sync()
  }

  canvas.addEventListener('webglcontextlost', onLost)
  canvas.addEventListener('webglcontextrestored', onRestored)

  uniforms = setup()
  resize()
  draw()
  sync()

  return {
    setAnimated(value) {
      animated = value
      if (!animated) {
        // Finish a color blend at once: there is no loop to run it
        if (fadeStart) color = fadeTo
        fadeStart = 0
        waveTime = FIELD.staticTime
        draw()
      }
      sync()
    },
    setVisible(value) {
      visible = value
      sync()
    },
    setColor(value) {
      if (animated && visible) {
        fadeFrom = color
        fadeTo = value
        fadeStart = performance.now()
      }
      else {
        color = value
        draw()
      }
    },
    resize,
    destroy() {
      animated = false
      sync()
      canvas.removeEventListener('webglcontextlost', onLost)
      canvas.removeEventListener('webglcontextrestored', onRestored)
    },
  }
}

// No WebGL: draw the same field once on the CPU and keep it static
function startCanvas2d(canvas: HTMLCanvasElement, options: FieldOptions): FieldController {
  const ctx = canvas.getContext('2d')
  let color = options.color

  function draw() {
    if (!ctx) return
    const { width, height, dpr } = bufferSize(canvas)
    canvas.width = width
    canvas.height = height
    const m = fieldViewProj(width / height)
    const grid = createGrid(width / height, gridCols(canvas.clientWidth))
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = `rgb(${color.map(c => Math.round(c * 255)).join(' ')})`
    for (let i = 0; i < grid.length; i += 2) {
      const x = grid[i]!
      const z = grid[i + 1]!
      const y = fieldHeight(x, z, FIELD.staticTime)
      const [cx, cy, , w] = toClip(m, x, y, z)
      if (w <= 0) continue
      const sx = (cx / w * 0.5 + 0.5) * width
      const sy = (0.5 - cy / w * 0.5) * height
      if (sx < 0 || sx > width || sy < 0 || sy > height) continue
      const { size, alpha } = dotStyle(w, y)
      if (alpha < 0.01) continue
      const px = size * dpr
      ctx.globalAlpha = alpha
      ctx.fillRect(sx - px / 2, sy - px / 2, px, px)
    }
    ctx.globalAlpha = 1
  }

  draw()
  // Without any canvas context there is nothing to show: the canvas stays transparent
  if (ctx) options.onReady?.()

  return {
    setAnimated() {},
    setVisible() {},
    setColor(value) {
      color = value
      draw()
    },
    resize: draw,
    destroy() {},
  }
}
