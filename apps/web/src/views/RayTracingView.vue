<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { render } from '../modules/Lighting/Application'
import type { ScenePlane } from '../modules/Lighting/Application'
import type { OrthographicCamera } from '../modules/Lighting/Domain/ValueObject'

const canvasRef = ref<HTMLCanvasElement | null>(null)

const WIDTH = 400
const HEIGHT = 400

const camera: OrthographicCamera = {
  type: 'orthographic',
  position: { x: 0, y: 0, z: 0 },
  lookAt: { x: 0, y: 0, z: 1 },
  up: { x: 0, y: 1, z: 0 },
  width: 2,
  height: 2,
}

const planes: ScenePlane[] = [
  {
    geometry: {
      type: 'plane',
      point: { x: 0, y: 0, z: 5 },
      normal: { x: 0, y: 0, z: -1 },
    },
    color: [255, 255, 255], // White background plane (infinite)
  },
  {
    geometry: {
      type: 'plane',
      point: { x: 0, y: 0, z: 3 },
      normal: { x: 0, y: 0, z: -1 },
      width: 1,
      height: 1,
    },
    color: [255, 100, 100], // Red plane in front (1x1 size)
  },
]

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const imageData = render({
    width: WIDTH,
    height: HEIGHT,
    camera,
    planes,
  })

  ctx.putImageData(imageData, 0, 0)
})
</script>

<template>
  <div class="w-screen min-h-screen bg-gray-900 text-white p-8 flex flex-col items-center">
    <h1 class="text-2xl font-bold mb-6">Ray Tracing Demo</h1>
    <canvas
      ref="canvasRef"
      :width="WIDTH"
      :height="HEIGHT"
      class="border border-gray-600"
    />
    <p class="mt-4 text-gray-400">
      Orthographic camera looking at a plane
    </p>
  </div>
</template>
