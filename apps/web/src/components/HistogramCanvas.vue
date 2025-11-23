<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import type { Histogram } from '../modules/Photo/Domain'

const props = withDefaults(defineProps<{
  data: Histogram | null
  width?: number
  height?: number
}>(), {
  width: 256,
  height: 100,
})

const canvasRef = ref<HTMLCanvasElement | null>(null)

const render = () => {
  const canvas = canvasRef.value
  if (!canvas || !props.data) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const { r, g, b } = props.data
  const { width, height } = props

  // Clear canvas
  ctx.clearRect(0, 0, width, height)

  // Find max value for normalization
  const maxR = Math.max(...r)
  const maxG = Math.max(...g)
  const maxB = Math.max(...b)
  const maxVal = Math.max(maxR, maxG, maxB, 1)

  // Draw histograms with transparency for overlap
  ctx.globalAlpha = 0.5

  // Red channel
  ctx.fillStyle = '#ef4444'
  for (let i = 0; i < 256; i++) {
    const barHeight = ((r[i] ?? 0) / maxVal) * height
    ctx.fillRect(i * (width / 256), height - barHeight, width / 256, barHeight)
  }

  // Green channel
  ctx.fillStyle = '#22c55e'
  for (let i = 0; i < 256; i++) {
    const barHeight = ((g[i] ?? 0) / maxVal) * height
    ctx.fillRect(i * (width / 256), height - barHeight, width / 256, barHeight)
  }

  // Blue channel
  ctx.fillStyle = '#3b82f6'
  for (let i = 0; i < 256; i++) {
    const barHeight = ((b[i] ?? 0) / maxVal) * height
    ctx.fillRect(i * (width / 256), height - barHeight, width / 256, barHeight)
  }

  ctx.globalAlpha = 1.0
}

watch(() => props.data, render, { deep: true })
onMounted(render)
</script>

<template>
  <canvas
    ref="canvasRef"
    :width="width"
    :height="height"
    class="bg-gray-800 rounded"
  />
</template>
