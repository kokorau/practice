<script setup lang="ts">
/**
 * PatternThumbnail
 *
 * WebGPU を使ったパターンサムネイル描画コンポーネント
 * 各インスタンスが独自の canvas と renderer を管理
 */

import { ref, onMounted, onUnmounted, watch, useId } from 'vue'
import { TextureRenderer, type TextureRenderSpec, type Viewport } from '@practice/texture'

export type SpecCreator = (viewport: Viewport) => TextureRenderSpec | null

const props = defineProps<{
  createSpec: SpecCreator
}>()

const canvasId = useId()
const canvasRef = ref<HTMLCanvasElement | null>(null)
let renderer: TextureRenderer | null = null

const render = async () => {
  if (!renderer) return
  const viewport = renderer.getViewport()
  const spec = props.createSpec(viewport)
  if (spec) {
    renderer.render(spec)
  }
}

onMounted(async () => {
  const canvas = canvasRef.value
  if (!canvas) return

  canvas.width = 256
  canvas.height = 144

  try {
    renderer = await TextureRenderer.create(canvas)
    await render()
  } catch (e) {
    console.error('WebGPU not available:', e)
  }
})

onUnmounted(() => {
  renderer?.destroy()
  renderer = null
})

// Re-render when createSpec changes (e.g., colors change)
watch(() => props.createSpec, render)
</script>

<template>
  <canvas :id="canvasId" ref="canvasRef" class="pattern-canvas" />
</template>

<style scoped>
.pattern-canvas {
  width: 100%;
  aspect-ratio: 16 / 9;
}
</style>
