<script setup lang="ts">
/**
 * MaskPatternThumbnail
 *
 * Renders mask shape preview with background composite.
 * First renders background spec, then overlays the mask shape.
 */

import { ref, onMounted, onUnmounted, watch, useId } from 'vue'
import { TextureRenderer, type TextureRenderSpec, type Viewport, type RGBA } from '@practice/texture'

export type BackgroundSpecCreator = (viewport: Viewport) => TextureRenderSpec | null
export type MaskSpecCreator = (color1: RGBA, color2: RGBA, viewport: Viewport) => TextureRenderSpec

const props = defineProps<{
  createBackgroundSpec: BackgroundSpecCreator
  createMaskSpec: MaskSpecCreator
  maskColor1: RGBA
  maskColor2: RGBA
}>()

const canvasId = useId()
const canvasRef = ref<HTMLCanvasElement | null>(null)
let renderer: TextureRenderer | null = null

const render = async () => {
  if (!renderer) return
  const viewport = renderer.getViewport()

  // 1. Render background first
  const bgSpec = props.createBackgroundSpec(viewport)
  if (bgSpec) {
    renderer.render(bgSpec)
  }

  // 2. Overlay mask shape (without clearing)
  const maskSpec = props.createMaskSpec(props.maskColor1, props.maskColor2, viewport)
  if (maskSpec) {
    renderer.render(maskSpec, { clear: false })
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

// Re-render when any prop changes
watch(
  () => [props.createBackgroundSpec, props.createMaskSpec, props.maskColor1, props.maskColor2],
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
