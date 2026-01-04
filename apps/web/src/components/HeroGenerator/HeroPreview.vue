<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, type ComponentPublicInstance } from 'vue'
import {
  compileForegroundLayout,
  DEFAULT_FOREGROUND_CONFIG,
  type ForegroundConfig,
  type PositionedElement,
  type ForegroundElementType,
} from '../../composables/SiteBuilder'
import { ensureFontLoaded } from '@practice/font'

// Fixed base dimensions for consistent rendering
const BASE_WIDTH = 1920
const BASE_HEIGHT = 1080
const BASE_FONT_SIZE = 16 // px per rem for consistent sizing

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
}>(), {
  foregroundConfig: () => DEFAULT_FOREGROUND_CONFIG,
  titleColor: undefined,
  bodyColor: undefined,
})

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLElement | null>(null)
const frameRef = ref<HTMLElement | null>(null)
const titleRef = ref<HTMLElement | null>(null)
const descriptionRef = ref<HTMLElement | null>(null)
const scale = ref(1)

// ResizeObserver to track container width and calculate scale
let resizeObserver: ResizeObserver | null = null

const updateScale = () => {
  if (!containerRef.value) return
  const containerWidth = containerRef.value.clientWidth
  // Calculate scale based on available width (with some padding)
  const availableWidth = containerWidth - 32 // 16px padding on each side
  scale.value = Math.min(1, availableWidth / BASE_WIDTH)
}

onMounted(() => {
  if (containerRef.value) {
    resizeObserver = new ResizeObserver(updateScale)
    resizeObserver.observe(containerRef.value)
    updateScale()
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})

const positionedGroups = computed(() => compileForegroundLayout(props.foregroundConfig))

/**
 * Get inline style for an element, including font-family, fontSize, and color
 */
const getElementStyle = (el: PositionedElement): Record<string, string> => {
  const style: Record<string, string> = {}
  const fontFamily = ensureFontLoaded(el.fontId)
  if (fontFamily) {
    style.fontFamily = fontFamily
  }
  if (el.fontSize !== undefined) {
    // Convert rem to px for consistent rendering at base size
    style.fontSize = `${el.fontSize * BASE_FONT_SIZE}px`
  }
  // Apply color based on element type (title uses titleColor, description uses bodyColor)
  if (el.type === 'title' && props.titleColor) {
    style.color = props.titleColor
  } else if (el.type === 'description' && props.bodyColor) {
    style.color = props.bodyColor
  }
  return style
}

// Computed style for the scaled frame
const frameStyle = computed(() => ({
  width: `${BASE_WIDTH}px`,
  height: `${BASE_HEIGHT}px`,
  transform: `scale(${scale.value})`,
  transformOrigin: 'top left',
}))

// Computed style for the wrapper (maintains aspect ratio in layout)
const wrapperStyle = computed(() => ({
  width: `${BASE_WIDTH * scale.value}px`,
  height: `${BASE_HEIGHT * scale.value}px`,
}))

/**
 * Get element bounds in canvas coordinate system (BASE_WIDTH x BASE_HEIGHT)
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
 */
const setElementRef = (el: HTMLElement | null, type: ForegroundElementType) => {
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
        <canvas ref="canvasRef" class="layer-background" :width="BASE_WIDTH" :height="BASE_HEIGHT" />

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

<!-- Styles are defined in HeroViewGeneratorView.css -->
