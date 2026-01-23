<script setup lang="ts">
/**
 * EffectPatternThumbnail
 *
 * Renders effect preset preview using the main rendering pipeline.
 * Shows the actual Surface with the preview effect applied (no mask).
 *
 * Rendering flow:
 * 1. Create mini HeroViewConfig with Surface + preview effect
 * 2. Use buildPipeline + executePipeline for accurate preview
 */

import { ref, onMounted, onUnmounted, watch, useId } from 'vue'
import { TextureRenderer } from '@practice/texture'
import type { PrimitivePalette } from '@practice/semantic-color-palette'
import type {
  SurfaceLayerNodeConfig,
  SingleEffectConfig,
} from '@practice/section-visual'
import {
  createEffectPreviewConfig,
  renderWithPipeline,
} from '@practice/section-visual'

// ============================================================
// Props
// ============================================================

const props = defineProps<{
  /** Surface layer config from the selected Clip Group */
  surface?: SurfaceLayerNodeConfig
  /** Effect config to preview */
  previewEffect?: SingleEffectConfig
  /** Palette for color resolution */
  palette?: PrimitivePalette
}>()

const canvasId = useId()
const canvasRef = ref<HTMLCanvasElement | null>(null)
let renderer: TextureRenderer | null = null

// ============================================================
// Pipeline-based Rendering
// ============================================================

const renderWithPipelineMode = async () => {
  if (!renderer || !props.surface || !props.previewEffect || !props.palette) {
    return false
  }

  try {
    // Create mini config for this effect preview
    const previewConfig = createEffectPreviewConfig({
      surface: props.surface,
      previewEffect: props.previewEffect,
      viewport: { width: 256, height: 144 },
    })

    // Render using the main pipeline
    await renderWithPipeline(
      previewConfig,
      renderer,
      props.palette,
      { scale: 0.3 } // Scale down parameters for thumbnail
    )

    return true
  } catch (e) {
    console.error('[EffectPatternThumbnail] Pipeline rendering failed:', e)
    return false
  }
}

// ============================================================
// Main Render Function
// ============================================================

const render = async () => {
  if (!renderer) return

  // Use pipeline-based rendering
  await renderWithPipelineMode()
}

// ============================================================
// Lifecycle
// ============================================================

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

// Re-render when any prop changes
watch(
  () => [
    props.surface,
    props.previewEffect,
    props.palette,
  ],
  render
)
</script>

<template>
  <canvas :id="canvasId" ref="canvasRef" class="effect-pattern-canvas" />
</template>

<style scoped>
.effect-pattern-canvas {
  width: 100%;
  aspect-ratio: 16 / 9;
}
</style>
