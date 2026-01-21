<script setup lang="ts">
import { ref, computed, type ComponentPublicInstance } from 'vue'
import {
  compileForegroundLayout,
  DEFAULT_FOREGROUND_CONFIG,
  type ForegroundConfig,
  type PositionedElement,
  type ForegroundElementType,
} from '../../composables/SiteBuilder'
import { ensureFontLoaded } from '@practice/font'
import { HERO_CANVAS_WIDTH, HERO_CANVAS_HEIGHT } from '@practice/section-visual'
import { useResponsiveScale } from '../../composables/useResponsiveScale'
import { PREVIEW_CONTAINER_PADDING, BASE_FONT_SIZE_PX } from '../../constants/preview'

/**
 * Element bounds in canvas coordinate system
 */
export type ElementBounds = {
  x: number
  y: number
  width: number
  height: number
}

const props = withDefaults(defineProps<{
  foregroundConfig?: ForegroundConfig
  titleColor?: string
  bodyColor?: string
  elementColors?: Map<string, string>
}>(), {
  foregroundConfig: () => DEFAULT_FOREGROUND_CONFIG,
  titleColor: undefined,
  bodyColor: undefined,
  elementColors: undefined,
})

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLElement | null>(null)
const frameRef = ref<HTMLElement | null>(null)
const titleRef = ref<HTMLElement | null>(null)
const descriptionRef = ref<HTMLElement | null>(null)

const scale = useResponsiveScale(containerRef, {
  originalWidth: HERO_CANVAS_WIDTH,
  originalHeight: HERO_CANVAS_HEIGHT,
  padding: PREVIEW_CONTAINER_PADDING,
})

const positionedGroups = computed(() => compileForegroundLayout(props.foregroundConfig))

/**
 * Get inline style for an element, including font-family, fontSize, fontWeight, letterSpacing, lineHeight, and color
 */
const getElementStyle = (el: PositionedElement): Record<string, string> => {
  const style: Record<string, string> = {}
  const fontFamily = ensureFontLoaded(el.fontId)
  if (fontFamily) {
    style.fontFamily = fontFamily
  }
  if (el.fontSize !== undefined) {
    // Convert rem to px for consistent rendering at base size
    style.fontSize = `${el.fontSize * BASE_FONT_SIZE_PX}px`
  }
  if (el.fontWeight !== undefined) {
    style.fontWeight = String(el.fontWeight)
  }
  if (el.letterSpacing !== undefined) {
    style.letterSpacing = `${el.letterSpacing}em`
  }
  if (el.lineHeight !== undefined) {
    style.lineHeight = String(el.lineHeight)
  }
  // Apply color: first check element-specific color from elementColors map
  if (props.elementColors?.has(el.id)) {
    style.color = props.elementColors.get(el.id)!
  } else if (el.type === 'title' && props.titleColor) {
    // Fallback to type-based color
    style.color = props.titleColor
  } else if (el.type === 'description' && props.bodyColor) {
    style.color = props.bodyColor
  }
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

defineExpose({
  canvasRef,
  getElementBounds,
})
</script>

<template>
  <div ref="containerRef" class="hero-preview-container">
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
/* Generator Preview */
.hero-preview-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  overflow: hidden;
}

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
