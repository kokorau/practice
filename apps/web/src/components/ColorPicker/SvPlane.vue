<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { $Hsv, $Srgb } from '../../modules/Color/Domain/ValueObject'

const props = defineProps<{
  hue: number // 0-360
  saturation: number // 0-1
  value: number // 0-1
}>()

const emit = defineEmits<{
  change: [s: number, v: number]
}>()

const canvas = ref<HTMLCanvasElement>()
let gl: WebGLRenderingContext | null = null
let program: WebGLProgram | null = null
let hueLocation: WebGLUniformLocation | null = null

const vertexShaderSource = `
  attribute vec2 a_position;
  varying vec2 v_uv;
  void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`

// SV plane: left-top=white, right-top=hue, bottom=black
const fragmentShaderSource = `
  precision mediump float;
  varying vec2 v_uv;
  uniform float u_hue;

  vec3 hsv2rgb(float h, float s, float v) {
    float c = v * s;
    float x = c * (1.0 - abs(mod(h / 60.0, 2.0) - 1.0));
    float m = v - c;
    vec3 rgb;
    if (h < 60.0) rgb = vec3(c, x, 0.0);
    else if (h < 120.0) rgb = vec3(x, c, 0.0);
    else if (h < 180.0) rgb = vec3(0.0, c, x);
    else if (h < 240.0) rgb = vec3(0.0, x, c);
    else if (h < 300.0) rgb = vec3(x, 0.0, c);
    else rgb = vec3(c, 0.0, x);
    return rgb + m;
  }

  void main() {
    float s = v_uv.x;
    float v = v_uv.y;
    vec3 color = hsv2rgb(u_hue, s, v);
    gl_FragColor = vec4(color, 1.0);
  }
`

function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

function initWebGL() {
  if (!canvas.value) return

  // Use fixed size matching CSS w-64 h-64 (256px)
  const size = 256
  const dpr = window.devicePixelRatio || 1
  canvas.value.width = size * dpr
  canvas.value.height = size * dpr

  gl = canvas.value.getContext('webgl')
  if (!gl) {
    console.error('WebGL not supported')
    return
  }

  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource)
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource)
  if (!vertexShader || !fragmentShader) return

  program = gl.createProgram()
  if (!program) return

  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program))
    return
  }

  gl.useProgram(program)

  // Full screen quad
  const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])
  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)

  const positionLocation = gl.getAttribLocation(program, 'a_position')
  gl.enableVertexAttribArray(positionLocation)
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

  hueLocation = gl.getUniformLocation(program, 'u_hue')

  render()
}

function render() {
  if (!gl || !program) return

  console.log('render viewport:', gl.canvas.width, gl.canvas.height)
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
  gl.clearColor(1, 0, 1, 1) // magenta for debug
  gl.clear(gl.COLOR_BUFFER_BIT)
  gl.uniform1f(hueLocation, props.hue)
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
}

function handlePointer(e: PointerEvent) {
  if (!canvas.value) return
  const rect = canvas.value.getBoundingClientRect()
  const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  const y = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height))
  emit('change', x, y)
}

let isDragging = false

function onPointerDown(e: PointerEvent) {
  isDragging = true
  canvas.value?.setPointerCapture(e.pointerId)
  handlePointer(e)
}

function onPointerMove(e: PointerEvent) {
  if (isDragging) handlePointer(e)
}

function onPointerUp() {
  isDragging = false
}

watch(() => props.hue, render)

onMounted(() => {
  initWebGL()
})
</script>

<template>
  <div class="relative">
    <canvas
      ref="canvas"
      class="block w-64 h-64 rounded cursor-crosshair"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
    />
    <!-- Cursor indicator -->
    <div
      class="absolute w-4 h-4 border-2 border-white rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2 shadow-md"
      :style="{
        left: `${saturation * 100}%`,
        top: `${(1 - value) * 100}%`,
        backgroundColor: $Srgb.toCssRgb($Hsv.toSrgb({ h: hue, s: saturation, v: value })),
      }"
    />
  </div>
</template>
