<script setup lang="ts">
import { ref, onMounted } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // 16:9のサイズを設定
  canvas.width = 400
  canvas.height = 225

  // べた塗り
  ctx.fillStyle = '#4a6fa5'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
})
</script>

<template>
  <div class="w-screen min-h-screen bg-gray-900 text-white p-8">
    <div class="max-w-7xl mx-auto">
      <h1 class="text-3xl font-bold mb-8">Hero View Generator</h1>
      <div class="w-[400px] aspect-video rounded-lg overflow-hidden border border-gray-700">
        <canvas ref="canvasRef" class="w-full h-full" />
      </div>
    </div>
  </div>
</template>
