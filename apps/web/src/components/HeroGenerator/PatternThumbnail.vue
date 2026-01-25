<script setup lang="ts">
/**
 * PatternThumbnail
 *
 * WebGPU を使ったパターンサムネイル描画コンポーネント
 * 各インスタンスが独自の canvas と renderer を管理
 *
 * Supports two rendering modes:
 * 1. Pipeline mode (new): Uses main rendering pipeline with HeroViewConfig
 * 2. Legacy mode: Uses TextureRenderSpec directly
 */

import { ref, onMounted, onUnmounted, watch, useId } from 'vue'
import type { TextureRenderer, TextureRenderSpec, Viewport } from '@practice/texture'
import type { PrimitivePalette } from '@practice/semantic-color-palette'
import type {
  NormalizedSurfaceConfig,
  ProcessorNodeConfig,
  ColorValue,
} from '@practice/section-visual'
import {
  createSurfacePreviewConfig,
  renderWithPipeline,
} from '@practice/section-visual'
import { createSharedRenderer } from '../../services/createSharedRenderer'

// ============================================================
// Legacy Types (for backward compatibility)
// ============================================================

export type SpecCreator = (viewport: Viewport) => TextureRenderSpec | null

// ============================================================
// Props
// ============================================================

const props = defineProps<{
  // Pipeline-based rendering (new)
  /** Surface config to preview (params should include color1/color2) */
  previewSurface?: NormalizedSurfaceConfig
  /** Processor config (to extract preceding effects, optional) */
  processor?: ProcessorNodeConfig
  /** Primary color override (optional) */
  color1?: ColorValue
  /** Secondary color override (optional) */
  color2?: ColorValue
  /** Palette for color resolution */
  palette?: PrimitivePalette

  // Legacy mode (for backward compatibility)
  /** Legacy spec creator function */
  createSpec?: SpecCreator
}>()

const canvasId = useId()
const canvasRef = ref<HTMLCanvasElement | null>(null)
let renderer: TextureRenderer | null = null

// ============================================================
// Pipeline-based Rendering
// ============================================================

const renderWithPipelineMode = async () => {
  if (!renderer || !props.previewSurface || !props.palette) {
    return false
  }

  try {
    // Create mini config for this surface preview
    const previewConfig = createSurfacePreviewConfig({
      previewSurface: props.previewSurface,
      processor: props.processor,
      color1: props.color1,
      color2: props.color2,
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
    console.error('[PatternThumbnail] Pipeline rendering failed:', e)
    return false
  }
}

// ============================================================
// Legacy Rendering (fallback)
// ============================================================

const renderLegacyMode = async () => {
  if (!renderer || !props.createSpec) return

  const viewport = renderer.getViewport()
  const spec = props.createSpec(viewport)
  if (spec) {
    renderer.render(spec)
  }
}

// ============================================================
// Main Render Function
// ============================================================

const render = async () => {
  if (!renderer) return

  // Try pipeline-based rendering first
  const usedPipeline = await renderWithPipelineMode()

  // Fall back to legacy rendering if pipeline mode is not available
  if (!usedPipeline) {
    await renderLegacyMode()
  }
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
    renderer = await createSharedRenderer(canvas)
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
    // Pipeline mode props
    props.previewSurface,
    props.processor,
    props.color1,
    props.color2,
    props.palette,
    // Legacy mode props
    props.createSpec,
  ],
  render
)
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
