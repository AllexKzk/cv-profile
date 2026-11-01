// Live background renderer: one full-screen WebGL fragment shader at half resolution, or a
// single coarse Canvas 2D frame when WebGL is unavailable. Loaded lazily (dynamic import)
// after hydration.
import { FIELD, createFrameGate, fieldGlsl, flutedAt, mixRgb } from './field'
import type { Rgb } from './field'

export interface FieldController {
  /** Animate (true) or show one static frame (false, reduced motion). */
  setAnimated: (animated: boolean) => void
  /** Pause the loop while the tab is hidden. */
  setVisible: (visible: boolean) => void
  /** New light color; animated fields blend into it, static ones redraw at once. */
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

const FPS = 30
const COLOR_FADE_MS = 300
// A long pause (hidden tab, slow device) must not jump the light forward
const MAX_STEP_MS = 100

/**
 * Light color from the `--field-dot` token. Theme tokens are oklch, the shader needs sRGB:
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

// Device pixel ratio is ignored on purpose: the picture is soft, the browser upscales it
function bufferSize(canvas: HTMLCanvasElement, scale: number): { width: number, height: number } {
  return {
    width: Math.max(1, Math.round(canvas.clientWidth * scale)),
    height: Math.max(1, Math.round(canvas.clientHeight * scale)),
  }
}

const VERTEX = `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`

const FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uSize;
uniform float uScale;
uniform float uTime;
uniform vec3 uColor;

${fieldGlsl()}

void main() {
  // CSS px with y down, like the TS copy in field.ts
  vec2 p = vec2(gl_FragCoord.x, uSize.y * uScale - gl_FragCoord.y) / uScale;
  float a = flutedAt(p, uSize, uTime);
  // The canvas is premultiplied: the page background shows through
  gl_FragColor = vec4(uColor * a, a);
}
`

function startWebGl(canvas: HTMLCanvasElement, gl: WebGLRenderingContext, options: FieldOptions): FieldController {
  const gate = createFrameGate(FPS)

  let animated = options.animated
  let visible = true
  let color: Rgb = options.color
  let fadeFrom: Rgb = color
  let fadeTo: Rgb = color
  let fadeStart = 0
  let lightTime = FIELD.staticTime
  let lastNow = 0
  let frame = 0
  let lost = false
  let ready = false
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

  // Program, full-screen triangle and uniform locations; run again after a lost context is restored
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
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(program, 'aPos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    const loc = (name: string) => gl.getUniformLocation(program, name)
    gl.uniform1f(loc('uScale'), FIELD.renderScale)
    return {
      size: loc('uSize'),
      time: loc('uTime'),
      color: loc('uColor'),
    }
  }

  function resize() {
    const size = bufferSize(canvas, FIELD.renderScale)
    if (canvas.width !== size.width || canvas.height !== size.height) {
      canvas.width = size.width
      canvas.height = size.height
    }
    if (lost) return
    gl.viewport(0, 0, size.width, size.height)
    gl.uniform2f(uniforms.size, size.width / FIELD.renderScale, size.height / FIELD.renderScale)
    if (!animated) draw()
  }

  function draw() {
    if (lost) return
    gl.uniform1f(uniforms.time, lightTime)
    gl.uniform3f(uniforms.color, color[0], color[1], color[2])
    gl.drawArrays(gl.TRIANGLES, 0, 3)
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
    lightTime += (step / 1000) * FIELD.speed
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
        lightTime = FIELD.staticTime
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

// No WebGL: compute the same picture once on the CPU at a coarse resolution and keep it static
function startCanvas2d(canvas: HTMLCanvasElement, options: FieldOptions): FieldController {
  const ctx = canvas.getContext('2d')
  let color = options.color

  function draw() {
    if (!ctx) return
    const { width, height } = bufferSize(canvas, FIELD.fallbackScale)
    canvas.width = width
    canvas.height = height
    const w = width / FIELD.fallbackScale
    const h = height / FIELD.fallbackScale
    const image = ctx.createImageData(width, height)
    const [r, g, b] = color.map(c => Math.round(c * 255))
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const a = flutedAt((x + 0.5) / FIELD.fallbackScale, (y + 0.5) / FIELD.fallbackScale, w, h, FIELD.staticTime)
        const i = (y * width + x) * 4
        image.data[i] = r!
        image.data[i + 1] = g!
        image.data[i + 2] = b!
        image.data[i + 3] = Math.round(a * 255)
      }
    }
    ctx.putImageData(image, 0, 0)
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
