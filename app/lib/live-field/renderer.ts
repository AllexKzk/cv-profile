// Live background renderer: one full-screen WebGL fragment shader at half resolution, or a
// single coarse Canvas 2D frame when WebGL is unavailable. Loaded lazily (dynamic import)
// after hydration.
import { FIELD, createFrameGate, fieldGlsl, flutedAt, mixRgb } from './field'
import type { Rgb } from './field'

export interface FieldController {
  /** Allow motion (false: one static frame, no tilt or ripples; reduced motion). */
  setAnimated: (animated: boolean) => void
  /** Let the light drift on its own (desktop) or only follow tilt and presses (phones). */
  setAutonomous: (autonomous: boolean) => void
  /** Phone tilt, each axis in -1…1; the light eases towards it. */
  setTilt: (x: number, y: number) => void
  /** Send a ring across the glass from a point in CSS px. */
  ripple: (x: number, y: number) => void
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
uniform vec2 uOffset;
uniform vec4 uRipples[${FIELD.ripple.max}];

${fieldGlsl()}

void main() {
  // CSS px with y down, like the TS copy in field.ts
  vec2 p = vec2(gl_FragCoord.x, uSize.y * uScale - gl_FragCoord.y) / uScale;
  float a = flutedAt(p, uSize, uTime, uOffset);
  // The canvas is premultiplied: the page background shows through
  gl_FragColor = vec4(uColor * a, a);
}
`

function startWebGl(canvas: HTMLCanvasElement, gl: WebGLRenderingContext, options: FieldOptions): FieldController {
  const gate = createFrameGate(FPS)

  let animated = options.animated
  let autonomous = true
  let visible = true
  let color: Rgb = options.color
  let fadeFrom: Rgb = color
  let fadeTo: Rgb = color
  let fadeStart = 0
  // Light time of the drift; the tilt adds its own morph on top of it
  let lightTime = FIELD.staticTime
  const tilt = { x: 0, y: 0, targetX: 0, targetY: 0 }
  let ripples: Array<{ x: number, y: number, start: number }> = []
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
      offset: loc('uOffset'),
      ripples: loc('uRipples'),
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
    draw(performance.now())
  }

  function draw(now: number) {
    if (lost) return
    const live = animated ? ripples : []
    const packed = new Float32Array(FIELD.ripple.max * 4)
    live.slice(-FIELD.ripple.max).forEach((r, k) => {
      packed.set([r.x, r.y, (now - r.start) / 1000, 1], k * 4)
    })
    const tiltX = animated ? tilt.x : 0
    const tiltY = animated ? tilt.y : 0
    gl.uniform1f(uniforms.time, lightTime + (tiltX + tiltY) * FIELD.tilt.time)
    gl.uniform2f(uniforms.offset, tiltX * FIELD.tilt.offset, tiltY * FIELD.tilt.offset)
    gl.uniform4fv(uniforms.ripples, packed)
    gl.uniform3f(uniforms.color, color[0], color[1], color[2])
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    if (!ready) {
      ready = true
      options.onReady?.()
    }
  }

  // Something is still moving: the drift, the tilt easing, a ring or a color blend
  function busy(): boolean {
    if (fadeStart) return true
    if (!animated) return false
    return autonomous
      || ripples.length > 0
      || Math.abs(tilt.targetX - tilt.x) > 1e-3
      || Math.abs(tilt.targetY - tilt.y) > 1e-3
  }

  function tick(now: number) {
    frame = requestAnimationFrame(tick)
    if (!gate(now)) return
    const step = lastNow ? Math.min(now - lastNow, MAX_STEP_MS) : 0
    lastNow = now
    if (animated && autonomous) lightTime += (step / 1000) * FIELD.speed
    // Ease towards the tilt so sensor noise does not jitter the light
    const ease = Math.min(1, (step / 1000) * 5)
    tilt.x += (tilt.targetX - tilt.x) * ease
    tilt.y += (tilt.targetY - tilt.y) * ease
    ripples = ripples.filter(r => now - r.start < FIELD.ripple.lifeS * 1000)
    if (fadeStart) {
      const t = (now - fadeStart) / COLOR_FADE_MS
      color = mixRgb(fadeFrom, fadeTo, t)
      if (t >= 1) fadeStart = 0
    }
    draw(now)
    if (!busy()) stop()
  }

  function stop() {
    cancelAnimationFrame(frame)
    frame = 0
  }

  // The loop runs only while something moves, the tab is visible and the context is alive
  function sync() {
    const shouldRun = visible && !lost && busy()
    if (shouldRun && !frame) {
      lastNow = 0
      frame = requestAnimationFrame(tick)
    }
    else if (!shouldRun && frame) {
      stop()
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
    sync()
  }

  canvas.addEventListener('webglcontextlost', onLost)
  canvas.addEventListener('webglcontextrestored', onRestored)

  uniforms = setup()
  resize()
  sync()

  return {
    setAnimated(value) {
      animated = value
      if (!animated) {
        // Finish a color blend at once and freeze the light on its static frame
        if (fadeStart) color = fadeTo
        fadeStart = 0
        lightTime = FIELD.staticTime
        ripples = []
      }
      draw(performance.now())
      sync()
    },
    setAutonomous(value) {
      autonomous = value
      sync()
    },
    setTilt(x, y) {
      tilt.targetX = x
      tilt.targetY = y
      sync()
    },
    ripple(x, y) {
      if (!animated) return
      ripples.push({ x, y, start: performance.now() })
      sync()
    },
    setVisible(value) {
      visible = value
      sync()
    },
    setColor(value) {
      if (frame) {
        fadeFrom = color
        fadeTo = value
        fadeStart = performance.now()
      }
      else {
        color = value
        draw(performance.now())
      }
    },
    resize,
    destroy() {
      animated = false
      fadeStart = 0
      sync()
      stop()
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
    setAutonomous() {},
    setTilt() {},
    ripple() {},
    setVisible() {},
    setColor(value) {
      color = value
      draw()
    },
    resize: draw,
    destroy() {},
  }
}
