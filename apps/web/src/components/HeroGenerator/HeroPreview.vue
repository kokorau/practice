<script setup lang="ts">
/**
 * HeroPreview
 *
 * Unified preview component for HeroView rendering.
 *
 * Variants:
 * - 'main': Full preview with external canvas control (exposes canvasRef)
 * - 'thumbnail': Self-contained WebGPU rendering for selection UI
 *
 * Both variants render the complete CompiledHeroView including foreground elements.
 */

import { ref, computed, onMounted, onUnmounted, watch, useId, type ComponentPublicInstance } from 'vue'
import { TextureRenderer } from '@practice/texture'
import {
  layoutCompiledForeground,
  type CompiledPositionedElement,
  type ForegroundElementType,
} from '../../composables/SiteBuilder'
import type { CompiledHeroView, IntensityProvider, HeroViewConfig } from '@practice/section-visual'
import { HERO_CANVAS_WIDTH, HERO_CANVAS_HEIGHT, renderHeroConfig } from '@practice/section-visual'
import type { PrimitivePalette } from '@practice/semantic-color-palette/Domain'
import { useResponsiveScale } from '../../composables/useResponsiveScale'
import {
  PREVIEW_CONTAINER_PADDING,
  BASE_FONT_SIZE_PX,
  PREVIEW_ORIGINAL_WIDTH,
  PREVIEW_THUMBNAIL_WIDTH,
  PREVIEW_THUMBNAIL_HEIGHT,
} from '../../constants/preview'

/**
 * Element bounds in canvas coordinate system
 */
export type ElementBounds = {
  x: number
  y: number
  width: number
  height: number
}

const props = defineProps<{
  /**
   * Pre-compiled view data (required for main variant, optional for thumbnail)
   */
  compiledView?: CompiledHeroView
  /**
   * Variant mode:
   * - 'main': Exposes canvasRef for external rendering control, requires compiledView
   * - 'thumbnail': Self-contained WebGPU rendering, requires config + palette
   */
  variant?: 'main' | 'thumbnail'
  /**
   * HeroViewConfig for WebGPU rendering (required for thumbnail mode)
   */
  config?: HeroViewConfig
  /**
   * PrimitivePalette for WebGPU rendering (required for thumbnail mode)
   */
  palette?: PrimitivePalette
  /**
   * Optional intensity provider for RangeExpr resolution (thumbnail only)
   */
  intensityProvider?: IntensityProvider
}>()

// ============================================================
// Variant Detection
// ============================================================

const isThumbnail = computed(() => props.variant === 'thumbnail')

// ============================================================
// DOM Refs
// ============================================================

const canvasId = useId()
const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLElement | null>(null)
const frameRef = ref<HTMLElement | null>(null)
const titleRef = ref<HTMLElement | null>(null)
const descriptionRef = ref<HTMLElement | null>(null)

// ============================================================
// Thumbnail Mode: Self-contained WebGPU Rendering
// ============================================================

let renderer: TextureRenderer | null = null
let resizeObserver: ResizeObserver | null = null

// Thumbnail canvas dimensions (updated by ResizeObserver)
const thumbnailCanvasWidth = ref(PREVIEW_THUMBNAIL_WIDTH)
const thumbnailCanvasHeight = ref(PREVIEW_THUMBNAIL_HEIGHT)

// Calculate texture scale for thumbnail mode
const thumbnailTextureScale = computed(() => {
  return thumbnailCanvasWidth.value / PREVIEW_ORIGINAL_WIDTH
})

// Render for thumbnail mode
const renderThumbnail = async () => {
  if (!renderer || !isThumbnail.value) return
  if (!props.config || !props.palette) return

  await renderHeroConfig(renderer, props.config, props.palette, {
    scale: thumbnailTextureScale.value,
    intensityProvider: props.intensityProvider,
  })
}

// Update canvas size for thumbnail mode
const updateThumbnailCanvasSize = () => {
  if (!isThumbnail.value) return

  const canvas = canvasRef.value
  if (!canvas) return

  canvas.width = thumbnailCanvasWidth.value
  canvas.height = thumbnailCanvasHeight.value

  // Re-initialize renderer with new size
  if (renderer) {
    renderer.destroy()
    renderer = null
  }

  TextureRenderer.create(canvas).then(r => {
    renderer = r
    renderThumbnail()
  }).catch(e => {
    console.error('WebGPU not available:', e)
  })
}

// ============================================================
// Main Mode: Responsive Scale
// ============================================================

const scale = useResponsiveScale(containerRef, {
  originalWidth: HERO_CANVAS_WIDTH,
  originalHeight: HERO_CANVAS_HEIGHT,
  padding: isThumbnail.value ? 0 : PREVIEW_CONTAINER_PADDING,
})

const positionedGroups = computed(() => {
  if (!props.compiledView) return []
  return layoutCompiledForeground(props.compiledView.foreground)
})

/**
 * Get inline style for an element.
 * All values are pre-resolved in CompiledPositionedElement.
 */
const getElementStyle = (el: CompiledPositionedElement): Record<string, string> => {
  const style: Record<string, string> = {}

  // All values are pre-resolved in compiledView
  style.fontFamily = el.fontFamily
  // Convert rem to px for consistent rendering at base size
  style.fontSize = `${el.fontSize * BASE_FONT_SIZE_PX}px`
  style.fontWeight = String(el.fontWeight)
  style.letterSpacing = `${el.letterSpacing}em`
  style.lineHeight = String(el.lineHeight)
  style.color = el.color

  return style
}

// Computed style for the scaled frame
const frameStyle = computed(() => ({
  width: `${HERO_CANVAS_WIDTH}px`,
  height: `${HERO_CANVAS_HEIGHT}px`,
  transform: `scale(${scale.value})`,
  transformOrigin: 'top left',
}))

// Computed style for the wrapper (maintains aspect ratio in layout)
const wrapperStyle = computed(() => ({
  width: `${HERO_CANVAS_WIDTH * scale.value}px`,
  height: `${HERO_CANVAS_HEIGHT * scale.value}px`,
}))

/**
 * Get element bounds in canvas coordinate system (HERO_CANVAS_WIDTH x HERO_CANVAS_HEIGHT)
 * The frame is scaled for display, so we need to convert DOM coordinates back to canvas space
 */
const getElementBounds = (type: ForegroundElementType): ElementBounds | null => {
  const elementRef = type === 'title' ? titleRef.value : descriptionRef.value
  const frame = frameRef.value
  if (!elementRef || !frame) return null

  const elementRect = elementRef.getBoundingClientRect()
  const frameRect = frame.getBoundingClientRect()

  // Convert from screen coordinates to canvas coordinates
  // The frame is displayed at scale.value * BASE dimensions
  const x = (elementRect.left - frameRect.left) / scale.value
  const y = (elementRect.top - frameRect.top) / scale.value
  const width = elementRect.width / scale.value
  const height = elementRect.height / scale.value

  return { x, y, width, height }
}

/**
 * Set element ref based on type (used by template)
 * Note: Ignore null to prevent old element unmount from overwriting new ref
 */
const setElementRef = (el: HTMLElement | null, type: ForegroundElementType) => {
  if (!el) return // Ignore unmount callbacks
  if (type === 'title') {
    titleRef.value = el
  } else if (type === 'description') {
    descriptionRef.value = el
  }
}

// ============================================================
// Lifecycle: Thumbnail Mode Initialization
// ============================================================

onMounted(async () => {
  if (!isThumbnail.value) return

  const canvas = canvasRef.value
  const container = containerRef.value
  if (!canvas || !container) return

  // Set up ResizeObserver for responsive sizing
  resizeObserver = new ResizeObserver(entries => {
    const entry = entries[0]
    if (!entry) return
    const { width } = entry.contentRect
    if (width > 0) {
      thumbnailCanvasWidth.value = Math.round(width)
      thumbnailCanvasHeight.value = Math.round(width * 9 / 16)
      updateThumbnailCanvasSize()
    }
  })
  resizeObserver.observe(container)

  // Initial size
  const rect = container.getBoundingClientRect()
  if (rect.width > 0) {
    thumbnailCanvasWidth.value = Math.round(rect.width)
    thumbnailCanvasHeight.value = Math.round(rect.width * 9 / 16)
  }

  canvas.width = thumbnailCanvasWidth.value
  canvas.height = thumbnailCanvasHeight.value

  try {
    renderer = await TextureRenderer.create(canvas)
    await renderThumbnail()
  } catch (e) {
    console.error('WebGPU not available:', e)
  }
})

onUnmounted(() => {
  if (!isThumbnail.value) return
  resizeObserver?.disconnect()
  renderer?.destroy()
  renderer = null
})

// Re-render when config, palette, or intensityProvider changes (thumbnail mode only)
watch(
  () => [props.config, props.palette, props.intensityProvider],
  () => {
    if (isThumbnail.value) {
      renderThumbnail()
    }
  },
  { deep: true }
)

// ============================================================
// Expose (main mode only needs canvasRef and getElementBounds)
// ============================================================

defineExpose({
  canvasRef,
  getElementBounds,
})
</script>

<template>
  <!-- Thumbnail variant: simpler structure with responsive canvas -->
  <div
    v-if="isThumbnail"
    ref="containerRef"
    class="hero-preview-container thumbnail"
  >
    <canvas :id="canvasId" ref="canvasRef" class="hero-preview-canvas" />
  </div>

  <!-- Main variant: full preview with scaled frame -->
  <div
    v-else
    ref="containerRef"
    class="hero-preview-container"
  >
    <div class="hero-preview-wrapper" :style="wrapperStyle">
      <div ref="frameRef" class="hero-preview-frame hero-palette-preview context-canvas" :style="frameStyle">
        <!-- 後景: テクスチャ or カスタム画像 (Canvas に描画) -->
        <canvas ref="canvasRef" class="layer-background" :width="HERO_CANVAS_WIDTH" :height="HERO_CANVAS_HEIGHT" />

        <!-- 中景: グラフィック（後で実装） -->
        <div class="layer-midground">
          <!-- 画像やグラフィックテキスト -->
        </div>

        <!-- 前景: CTA + テキスト (9-grid layout) -->
        <div class="layer-foreground foreground-grid">
          <div
            v-for="group in positionedGroups"
            :key="group.position"
            class="grid-cell"
            :class="`position-${group.position}`"
          >
            <component
              v-for="(el, i) in group.elements"
              :key="i"
              :is="el.tag"
              :ref="(r: Element | ComponentPublicInstance | null) => setElementRef(r as HTMLElement | null, el.type)"
              :class="el.className"
              :style="getElementStyle(el)"
            >{{ el.content }}</component>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ============================================================
   Main Variant Styles
   ============================================================ */

/* Generator Preview */
.hero-preview-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  overflow: hidden;
}

/* ============================================================
   Thumbnail Variant Styles
   ============================================================ */

.hero-preview-container.thumbnail {
  padding: 0;
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

/* ============================================================
   Shared Styles
   ============================================================ */

.hero-preview-wrapper {
  position: relative;
  flex-shrink: 0;
}

.hero-preview-frame {
  position: relative;
  border-radius: 0.5rem;
  overflow: hidden;
  border: 1px solid oklch(0.85 0.01 260);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
}

:global(.dark) .hero-preview-frame {
  border-color: oklch(0.25 0.02 260);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

/* context-canvasのbackground-colorを上書きしてテクスチャを見せる */
.hero-preview-frame.context-canvas {
  background-color: transparent;
}

/* Layer System */
.layer-background,
.layer-midground,
.layer-foreground {
  position: absolute;
  inset: 0;
}

.layer-background {
  z-index: 0;
  width: 100%;
  height: 100%;
}

.layer-midground {
  z-index: 1;
  pointer-events: none;
}

.layer-foreground {
  z-index: 2;
  display: flex;
  padding: 80px;
}

/* Foreground 9-Grid Layout */
.foreground-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 1fr 1fr 1fr;
  grid-template-areas:
    "top-left top-center top-right"
    "middle-left middle-center middle-right"
    "bottom-left bottom-center bottom-right";
}

.grid-cell {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: visible;
}

/* Foreground text elements - no wrap, overflow allowed */
.grid-cell :deep(.scp-title),
.grid-cell :deep(.scp-body) {
  white-space: nowrap;
}

/* Position classes - grid area assignment */
.position-top-left { grid-area: top-left; align-items: flex-start; justify-content: flex-start; }
.position-top-center { grid-area: top-center; align-items: center; justify-content: flex-start; text-align: center; }
.position-top-right { grid-area: top-right; align-items: flex-end; justify-content: flex-start; text-align: right; }

.position-middle-left { grid-area: middle-left; align-items: flex-start; justify-content: center; }
.position-middle-center { grid-area: middle-center; align-items: center; justify-content: center; text-align: center; }
.position-middle-right { grid-area: middle-right; align-items: flex-end; justify-content: center; text-align: right; }

.position-bottom-left { grid-area: bottom-left; align-items: flex-start; justify-content: flex-end; }
.position-bottom-center { grid-area: bottom-center; align-items: center; justify-content: flex-end; text-align: center; }
.position-bottom-right { grid-area: bottom-right; align-items: flex-end; justify-content: flex-end; text-align: right; }
</style>
