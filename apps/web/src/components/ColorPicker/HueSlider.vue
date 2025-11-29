<script setup lang="ts">
import { ref, onMounted } from 'vue'

defineProps<{
  hue: number // 0-360
}>()

const emit = defineEmits<{
  change: [hue: number]
}>()

const canvas = ref<HTMLCanvasElement>()
let gl: WebGLRenderingContext | null = null

const vertexShaderSource = `
  attribute vec2 a_position;
  varying vec2 v_uv;
  void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`

const fragmentShaderSource = `
  precision mediump float;
  varying vec2 v_uv;

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
    float hue = v_uv.x * 360.0;
    vec3 color = hsv2rgb(hue, 1.0, 1.0);
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

  // Use fixed size matching CSS w-64 h-6 (256x24px)
  const dpr = window.devicePixelRatio || 1
  canvas.value.width = 256 * dpr
  canvas.value.height = 24 * dpr

  gl = canvas.value.getContext('webgl')
  if (!gl) {
    console.error('WebGL not supported')
    return
  }

  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource)
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource)
  if (!vertexShader || !fragmentShader) return

  const program = gl.createProgram()
  if (!program) return

  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program))
    return
  }

  gl.useProgram(program)

  const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])
  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)

  const positionLocation = gl.getAttribLocation(program, 'a_position')
  gl.enableVertexAttribArray(positionLocation)
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
}

function handlePointer(e: PointerEvent) {
  if (!canvas.value) return
  const rect = canvas.value.getBoundingClientRect()
  const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  emit('change', x * 360)
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

onMounted(() => {
  initWebGL()
})
</script>

<template>
  <div class="relative">
    <canvas
      ref="canvas"
      class="block w-64 h-6 rounded cursor-ew-resize"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
    />
    <!-- Cursor indicator -->
    <div
      class="absolute top-0 w-1 h-full bg-white border border-gray-800 pointer-events-none -translate-x-1/2 rounded"
      :style="{ left: `${(hue / 360) * 100}%` }"
    />
  </div>
</template>
