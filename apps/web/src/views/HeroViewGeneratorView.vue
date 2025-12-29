<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { TextureRenderer } from '@practice/texture'

const solidCanvasRef = ref<HTMLCanvasElement | null>(null)
const stripeCanvasRef = ref<HTMLCanvasElement | null>(null)
let solidRenderer: TextureRenderer | null = null
let stripeRenderer: TextureRenderer | null = null

onMounted(async () => {
  // Solid
  const solidCanvas = solidCanvasRef.value
  if (solidCanvas) {
    solidCanvas.width = 400
    solidCanvas.height = 225
    try {
      solidRenderer = await TextureRenderer.create(solidCanvas)
      solidRenderer.renderSolid({
        color: [0.29, 0.44, 0.65, 1.0], // #4a6fa5
      })
    } catch (e) {
      console.error('WebGPU not available:', e)
    }
  }

  // Stripe
  const stripeCanvas = stripeCanvasRef.value
  if (stripeCanvas) {
    stripeCanvas.width = 400
    stripeCanvas.height = 225
    try {
      stripeRenderer = await TextureRenderer.create(stripeCanvas)
      stripeRenderer.renderStripe({
        width1: 20,
        width2: 20,
        angle: Math.PI / 4, // 45度
        color1: [0.29, 0.44, 0.65, 1.0], // #4a6fa5
        color2: [0.2, 0.3, 0.5, 1.0],
      })
    } catch (e) {
      console.error('WebGPU not available:', e)
    }
  }
})

onUnmounted(() => {
  solidRenderer?.destroy()
  stripeRenderer?.destroy()
})
</script>

<template>
  <div class="w-screen min-h-screen bg-gray-900 text-white p-8">
    <div class="max-w-7xl mx-auto">
      <h1 class="text-3xl font-bold mb-8">Hero View Generator</h1>
      <div class="flex gap-4">
        <div>
          <p class="text-sm text-gray-400 mb-2">Solid</p>
          <div class="w-[400px] aspect-video rounded-lg overflow-hidden border border-gray-700">
            <canvas ref="solidCanvasRef" class="w-full h-full" />
          </div>
        </div>
        <div>
          <p class="text-sm text-gray-400 mb-2">Stripe</p>
          <div class="w-[400px] aspect-video rounded-lg overflow-hidden border border-gray-700">
            <canvas ref="stripeCanvasRef" class="w-full h-full" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
