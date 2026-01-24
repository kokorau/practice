<script setup lang="ts">
/**
 * MaskPatternThumbnail
 *
 * Renders mask preset preview using the main rendering pipeline.
 * Shows the actual Surface + Processor effects + preview mask shape.
 *
 * Rendering flow:
 * 1. Create mini HeroViewConfig with Surface + Processor + preview mask
 * 2. Use buildPipeline + executePipeline for accurate preview
 */

import { ref, onMounted, onUnmounted, watch, useId } from 'vue'
import type { TextureRenderer, RGBA, Viewport } from '@practice/texture'
import type { PrimitivePalette } from '@practice/semantic-color-palette'
import type {
  SurfaceLayerNodeConfig,
  ProcessorNodeConfig,
  NormalizedMaskConfig,
} from '@practice/section-visual'
import {
  createMaskPreviewConfig,
  renderWithPipeline,
} from '@practice/section-visual'
import { createSharedRenderer } from '../../services/createSharedRenderer'

// ============================================================
// Legacy Types (for backward compatibility)
// ============================================================

export type BackgroundSpecCreator = (viewport: Viewport) => { shader: string; uniforms: ArrayBuffer; bufferSize: number } | null
export type MaskSpecCreator = (color1: RGBA, color2: RGBA, viewport: Viewport) => { shader: string; uniforms: ArrayBuffer; bufferSize: number }

export interface EffectSpec {
  shader: string
  uniforms: ArrayBuffer
  bufferSize: number
}

// ============================================================
// Props
// ============================================================

const props = defineProps<{
  // Pipeline-based rendering (new)
  /** Surface layer config from the selected Clip Group */
  surface?: SurfaceLayerNodeConfig
  /** Processor config (to extract preceding effects) */
  processor?: ProcessorNodeConfig
  /** Mask shape config to preview */
  previewMask?: NormalizedMaskConfig
  /** Palette for color resolution */
  palette?: PrimitivePalette

  // Legacy props (for backward compatibility)
  createBackgroundSpec?: BackgroundSpecCreator
  createMaskSpec?: MaskSpecCreator
  maskColor1?: RGBA
  maskColor2?: RGBA
  precedingEffectSpecs?: EffectSpec[]
}>()

const canvasId = useId()
const canvasRef = ref<HTMLCanvasElement | null>(null)
let renderer: TextureRenderer | null = null

// ============================================================
// Pipeline-based Rendering
// ============================================================

const renderWithPipelineMode = async () => {
  if (!renderer || !props.surface || !props.processor || !props.previewMask || !props.palette) {
    return false
  }

  try {
    // Create mini config for this mask preview
    const previewConfig = createMaskPreviewConfig({
      surface: props.surface,
      processor: props.processor,
      previewMask: props.previewMask,
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
    console.error('[MaskPatternThumbnail] Pipeline rendering failed:', e)
    return false
  }
}

// ============================================================
// Legacy Rendering (fallback)
// ============================================================

const renderLegacyMode = async () => {
  if (!renderer) return

  const viewport = renderer.getViewport()
  const bgSpec = props.createBackgroundSpec?.(viewport)
  const hasEffects = props.precedingEffectSpecs && props.precedingEffectSpecs.length > 0

  if (hasEffects && bgSpec) {
    // With effects: use offscreen rendering pipeline
    renderer.renderToOffscreen(bgSpec, 0)

    let currentIndex = 0
    for (const effectSpec of props.precedingEffectSpecs!) {
      const inputTexture = renderer.getOffscreenTexture(currentIndex)
      const outputIndex = currentIndex === 0 ? 1 : 0
      renderer.applyPostEffectToOffscreen(effectSpec, inputTexture, outputIndex)
      currentIndex = outputIndex
    }

    const finalTexture = renderer.getOffscreenTexture(currentIndex)
    renderer.compositeToCanvas(finalTexture, { clear: true })
  } else {
    // Without effects: direct rendering
    if (bgSpec) {
      renderer.render(bgSpec)
    }
  }

  // Overlay mask shape (without clearing)
  if (props.createMaskSpec && props.maskColor1 && props.maskColor2) {
    const maskSpec = props.createMaskSpec(props.maskColor1, props.maskColor2, viewport)
    if (maskSpec) {
      renderer.render(maskSpec, { clear: false })
    }
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
    props.surface,
    props.processor,
    props.previewMask,
    props.palette,
    // Legacy mode props
    props.createBackgroundSpec,
    props.createMaskSpec,
    props.maskColor1,
    props.maskColor2,
    props.precedingEffectSpecs,
  ],
  render
)
</script>

<template>
  <canvas :id="canvasId" ref="canvasRef" class="mask-pattern-canvas" />
</template>

<style scoped>
.mask-pattern-canvas {
  width: 100%;
  aspect-ratio: 16 / 9;
}
</style>
