<script setup lang="ts">
/**
 * HeroPreviewThumbnail
 *
 * renderHeroConfigを使用した完全なHeroViewプレビューコンポーネント
 * テキストなしで背景+マスク+エフェクトをレンダリング
 */

import { ref, onMounted, onUnmounted, watch, useId, computed } from 'vue'
import { TextureRenderer } from '@practice/texture'
import type { HeroViewConfig } from '../../modules/HeroScene'
import { renderHeroConfig } from '../../modules/HeroScene'
import type { PrimitivePalette } from '../../modules/SemanticColorPalette/Domain'
import {
  PREVIEW_ORIGINAL_WIDTH,
  PREVIEW_THUMBNAIL_WIDTH,
  PREVIEW_THUMBNAIL_HEIGHT,
} from '../../constants/preview'

const props = defineProps<{
  config: HeroViewConfig
  palette: PrimitivePalette
  scale?: number
}>()

const canvasId = useId()
const containerRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
let renderer: TextureRenderer | null = null
let resizeObserver: ResizeObserver | null = null

// Canvas dimensions (updated by ResizeObserver)
const canvasWidth = ref(PREVIEW_THUMBNAIL_WIDTH)
const canvasHeight = ref(PREVIEW_THUMBNAIL_HEIGHT)

// Calculate texture scale based on canvas width
const textureScale = computed(() => {
  if (props.scale !== undefined) return props.scale
  return canvasWidth.value / PREVIEW_ORIGINAL_WIDTH
})

const render = async () => {
  if (!renderer) return

  await renderHeroConfig(renderer, props.config, props.palette, {
    scale: textureScale.value,
  })
}

const updateCanvasSize = () => {
  const canvas = canvasRef.value
  if (!canvas) return

  canvas.width = canvasWidth.value
  canvas.height = canvasHeight.value

  // Re-initialize renderer with new size
  if (renderer) {
    renderer.destroy()
    renderer = null
  }

  TextureRenderer.create(canvas).then(r => {
    renderer = r
    render()
  }).catch(e => {
    console.error('WebGPU not available:', e)
  })
}

onMounted(async () => {
  const canvas = canvasRef.value
  const container = containerRef.value
  if (!canvas || !container) return

  // Set up ResizeObserver for responsive sizing
  resizeObserver = new ResizeObserver(entries => {
    const entry = entries[0]
    if (!entry) return
    const { width } = entry.contentRect
    if (width > 0) {
      canvasWidth.value = Math.round(width)
      canvasHeight.value = Math.round(width * 9 / 16)
      updateCanvasSize()
    }
  })
  resizeObserver.observe(container)

  // Initial size
  const rect = container.getBoundingClientRect()
  if (rect.width > 0) {
    canvasWidth.value = Math.round(rect.width)
    canvasHeight.value = Math.round(rect.width * 9 / 16)
  }

  canvas.width = canvasWidth.value
  canvas.height = canvasHeight.value

  try {
    renderer = await TextureRenderer.create(canvas)
    await render()
  } catch (e) {
    console.error('WebGPU not available:', e)
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  renderer?.destroy()
  renderer = null
})

// Re-render when config or palette changes
watch(
  () => [props.config, props.palette],
  render,
  { deep: true }
)
</script>

<template>
  <div ref="containerRef" class="hero-preview-container">
    <canvas :id="canvasId" ref="canvasRef" class="hero-preview-canvas" />
  </div>
</template>

<style scoped>
.hero-preview-container {
  width: 100%;
  aspect-ratio: 16 / 9;
}

.hero-preview-canvas {
  width: 100%;
  height: 100%;
  background: oklch(0.92 0.01 260);
}

:global(.dark) .hero-preview-canvas {
  background: oklch(0.22 0.02 260);
}
</style>
