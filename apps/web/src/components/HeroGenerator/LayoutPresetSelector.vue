<script setup lang="ts">
/**
 * LayoutPresetSelector
 *
 * レイアウトプリセットを選択するUI
 * 各プリセットのプレビューをHeroPreviewと同じ仕組みでレンダリング
 */

import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { $Oklch } from '@practice/color'
import type { Oklch } from '@practice/color'
import {
  TextureRenderer,
  createSolidSpec,
  createStripeSpec,
  createGridSpec,
  createPolkaDotSpec,
  createCheckerSpec,
  createCircleMaskSpec,
  createRectMaskSpec,
  createBlobMaskSpec,
  createPerlinMaskSpec,
  type TextureRenderSpec,
  type Viewport,
  type RGBA,
} from '@practice/texture'
import type { HeroViewPreset, MaskShapeConfig, SurfaceLayerNodeConfig } from '../../modules/HeroScene'
import type { PrimitivePalette } from '../../modules/SemanticColorPalette/Domain'
import { createPrimitivePalette } from '../../modules/SemanticColorPalette/Infra'
import { hsvToRgb } from '../SiteBuilder/utils/colorConversion'
import {
  compileForegroundLayout,
  DEFAULT_FOREGROUND_CONFIG,
  type ForegroundConfig,
  type PositionedElement,
} from '../../composables/SiteBuilder'
import { ensureFontLoaded } from '@practice/font'

// Preview dimensions (smaller than full HeroPreview)
const PREVIEW_WIDTH = 384
const PREVIEW_HEIGHT = 216
const PREVIEW_FONT_SCALE = 0.3 // Scale down fonts for preview

// Original HeroPreview width for scaling textures
const ORIGINAL_WIDTH = 1280
const TEXTURE_SCALE = PREVIEW_WIDTH / ORIGINAL_WIDTH // ~0.3

const props = defineProps<{
  presets: HeroViewPreset[]
  selectedPresetId: string | null
}>()

const emit = defineEmits<{
  'select-preset': [presetId: string]
}>()

// Canvas refs for each preset
const canvasRefs = ref<Map<string, HTMLCanvasElement>>(new Map())
const renderers = ref<Map<string, TextureRenderer>>(new Map())

/**
 * Convert HSV preset color to Oklch
 */
const hsvToOklch = (h: number, s: number, v: number): Oklch => {
  const [r, g, b] = hsvToRgb(h, s, v)
  return $Oklch.fromSrgb({ r: r / 255, g: g / 255, b: b / 255 })
}

/**
 * Convert Oklch to RGBA for texture rendering
 */
const oklchToRgba = (oklch: Oklch, alpha = 1): RGBA => {
  const srgb = $Oklch.toSrgb(oklch)
  return [
    Math.max(0, Math.min(1, srgb.r)),
    Math.max(0, Math.min(1, srgb.g)),
    Math.max(0, Math.min(1, srgb.b)),
    alpha,
  ]
}

/**
 * Convert Oklch to CSS color string
 */
const oklchToCss = (oklch: Oklch): string => $Oklch.toCss(oklch)

/**
 * Create primitive palette from preset's colorPreset
 */
const createPaletteFromPreset = (preset: HeroViewPreset): PrimitivePalette | null => {
  if (!preset.colorPreset) return null
  const { brand, accent, foundation } = preset.colorPreset
  return createPrimitivePalette({
    brand: hsvToOklch(brand.hue, brand.saturation, brand.value),
    foundation: hsvToOklch(foundation.hue, foundation.saturation, foundation.value),
    accent: hsvToOklch(accent.hue, accent.saturation, accent.value),
  })
}

/**
 * Get color from palette by key
 */
const getColorFromPalette = (palette: PrimitivePalette, key: string): RGBA => {
  const oklch = (palette as Record<string, Oklch>)[key]
  if (oklch) {
    return oklchToRgba(oklch)
  }
  return [0.5, 0.5, 0.5, 1]
}

/**
 * Get Oklch color from palette by key
 */
const getOklchFromPalette = (palette: PrimitivePalette, key: string): Oklch => {
  const oklch = (palette as Record<string, Oklch>)[key]
  if (oklch) {
    return oklch
  }
  return { L: 0.5, C: 0, H: 0 }
}

/**
 * Scale a value for preview size
 */
const scaleForPreview = (value: number): number => Math.max(1, Math.round(value * TEXTURE_SCALE))

/**
 * Create background texture spec from preset
 */
const createBackgroundSpec = (
  preset: HeroViewPreset,
  palette: PrimitivePalette,
  _viewport: Viewport
): TextureRenderSpec | null => {
  const baseLayer = preset.config.layers.find(l => l.type === 'base')
  if (!baseLayer || !('surface' in baseLayer)) return null
  const surface = baseLayer.surface

  const colors = preset.config.colors
  const color1 = getColorFromPalette(palette, colors?.background?.primary ?? 'BN4')
  const color2 = getColorFromPalette(palette, colors?.background?.secondary ?? 'BN2')

  if (surface.type === 'solid') {
    return createSolidSpec({ color: color1 })
  }
  if (surface.type === 'stripe') {
    return createStripeSpec({
      color1, color2,
      width1: scaleForPreview(surface.width1),
      width2: scaleForPreview(surface.width2),
      angle: surface.angle,
    })
  }
  if (surface.type === 'grid') {
    return createGridSpec({
      lineColor: color1, bgColor: color2,
      lineWidth: scaleForPreview(surface.lineWidth),
      cellSize: scaleForPreview(surface.cellSize),
    })
  }
  if (surface.type === 'polkaDot') {
    return createPolkaDotSpec({
      dotColor: color1, bgColor: color2,
      dotRadius: scaleForPreview(surface.dotRadius),
      spacing: scaleForPreview(surface.spacing),
      rowOffset: surface.rowOffset,
    })
  }
  if (surface.type === 'checker') {
    return createCheckerSpec({
      color1, color2,
      cellSize: scaleForPreview(surface.cellSize),
      angle: surface.angle,
    })
  }
  return createSolidSpec({ color: color1 })
}

/**
 * Find surface layer from preset (may be nested in group)
 */
const findSurfaceLayer = (preset: HeroViewPreset): SurfaceLayerNodeConfig | null => {
  for (const layer of preset.config.layers) {
    if (layer.type === 'surface') return layer as SurfaceLayerNodeConfig
    if (layer.type === 'group' && 'children' in layer && layer.children) {
      const nested = layer.children.find(c => c.type === 'surface')
      if (nested) return nested as SurfaceLayerNodeConfig
    }
  }
  return null
}

/**
 * Create mask shape spec from preset
 */
const createMaskShapeSpec = (
  shape: MaskShapeConfig,
  innerColor: RGBA,
  outerColor: RGBA,
  viewport: Viewport
): TextureRenderSpec | null => {
  const cutout = shape.cutout ?? true

  if (shape.type === 'circle') {
    return createCircleMaskSpec(
      { centerX: shape.centerX, centerY: shape.centerY, radius: shape.radius, innerColor, outerColor, cutout },
      viewport
    )
  }
  if (shape.type === 'rect') {
    return createRectMaskSpec(
      {
        left: shape.left, right: shape.right, top: shape.top, bottom: shape.bottom,
        radiusTopLeft: shape.radiusTopLeft, radiusTopRight: shape.radiusTopRight,
        radiusBottomLeft: shape.radiusBottomLeft, radiusBottomRight: shape.radiusBottomRight,
        innerColor, outerColor, cutout,
      },
      viewport
    )
  }
  if (shape.type === 'blob') {
    return createBlobMaskSpec(
      {
        centerX: shape.centerX, centerY: shape.centerY, baseRadius: shape.baseRadius,
        amplitude: shape.amplitude, frequency: 0, octaves: shape.octaves, seed: shape.seed,
        innerColor, outerColor, cutout,
      },
      viewport
    )
  }
  if (shape.type === 'perlin') {
    return createPerlinMaskSpec(
      { seed: shape.seed, threshold: shape.threshold, scale: shape.scale, octaves: shape.octaves, innerColor, outerColor },
      viewport
    )
  }
  return null
}

/**
 * Compile foreground layout for a preset
 */
const getPresetForeground = (preset: HeroViewPreset) => {
  const fg = preset.config.foreground ?? DEFAULT_FOREGROUND_CONFIG
  return compileForegroundLayout(fg as ForegroundConfig)
}

/**
 * Get ink color for foreground text based on semantic context
 */
const getPresetInkColor = (preset: HeroViewPreset, palette: PrimitivePalette): string => {
  const context = preset.config.colors?.semanticContext ?? 'canvas'
  // Simple heuristic: use dark ink for light contexts, light ink for dark contexts
  const foundationL = getOklchFromPalette(palette, 'F0').L
  const isLight = foundationL > 0.5
  if (context === 'sectionContrast') {
    return isLight ? oklchToCss(getOklchFromPalette(palette, 'BN0')) : oklchToCss(getOklchFromPalette(palette, 'BN9'))
  }
  return isLight ? oklchToCss(getOklchFromPalette(palette, 'BN9')) : oklchToCss(getOklchFromPalette(palette, 'BN0'))
}

/**
 * Get inline style for foreground element
 */
const getElementStyle = (el: PositionedElement, inkColor: string): Record<string, string> => {
  const style: Record<string, string> = {}
  const fontFamily = ensureFontLoaded(el.fontId)
  if (fontFamily) style.fontFamily = fontFamily
  if (el.fontSize !== undefined) {
    style.fontSize = `${el.fontSize * 16 * PREVIEW_FONT_SCALE}px`
  }
  style.color = inkColor
  return style
}

const setCanvasRef = (presetId: string, el: HTMLCanvasElement | null) => {
  if (el) {
    canvasRefs.value.set(presetId, el)
  } else {
    canvasRefs.value.delete(presetId)
  }
}

const renderPreset = async (presetId: string) => {
  const renderer = renderers.value.get(presetId)
  const preset = props.presets.find(p => p.id === presetId)
  if (!renderer || !preset) return

  const viewport = renderer.getViewport()
  const palette = createPaletteFromPreset(preset)
  if (!palette) return

  const colors = preset.config.colors

  // 1. Render background texture
  const bgSpec = createBackgroundSpec(preset, palette, viewport)
  if (bgSpec) {
    renderer.render(bgSpec)
  }

  // 2. Find surface layer and render mask shape
  const surfaceLayer = findSurfaceLayer(preset)
  if (surfaceLayer) {
    const maskProcessor = surfaceLayer.processors.find(p => p.type === 'mask')
    if (maskProcessor && 'shape' in maskProcessor) {
      const shape = maskProcessor.shape as MaskShapeConfig
      const cutout = shape.cutout ?? true

      // Get mask colors from palette
      const maskPrimaryColor = getColorFromPalette(palette, colors?.mask?.primary ?? 'BN2')
      const transparent: RGBA = [0, 0, 0, 0]

      // Match useHeroScene rendering logic:
      // cutout = true: inner = transparent (bg shows through), outer = mask color
      // cutout = false: inner = mask color, outer = transparent (bg shows through)
      const innerColor = cutout ? transparent : maskPrimaryColor
      const outerColor = cutout ? maskPrimaryColor : transparent
      const maskSpec = createMaskShapeSpec(shape, innerColor, outerColor, viewport)
      if (maskSpec) {
        renderer.render(maskSpec, { clear: false })
      }
    }
  }
}

const initRenderers = async () => {
  for (const preset of props.presets) {
    const canvas = canvasRefs.value.get(preset.id)
    if (!canvas) continue

    canvas.width = PREVIEW_WIDTH
    canvas.height = PREVIEW_HEIGHT

    try {
      const renderer = await TextureRenderer.create(canvas)
      renderers.value.set(preset.id, renderer)
      await renderPreset(preset.id)
    } catch (e) {
      console.error('WebGPU not available:', e)
    }
  }
}

const destroyRenderers = () => {
  for (const renderer of renderers.value.values()) {
    renderer.destroy()
  }
  renderers.value.clear()
}

// Computed foreground layouts and ink colors for each preset
const presetLayouts = computed(() => {
  const result = new Map<string, { groups: ReturnType<typeof compileForegroundLayout>, inkColor: string }>()
  for (const preset of props.presets) {
    const palette = createPaletteFromPreset(preset)
    if (palette) {
      result.set(preset.id, {
        groups: getPresetForeground(preset),
        inkColor: getPresetInkColor(preset, palette),
      })
    }
  }
  return result
})

onMounted(() => {
  setTimeout(initRenderers, 50)
})

onUnmounted(() => {
  destroyRenderers()
})

watch(() => props.presets, async () => {
  destroyRenderers()
  await initRenderers()
}, { deep: true })
</script>

<template>
  <div class="layout-preset-selector">
    <div class="preset-list">
      <button
        v-for="preset in presets"
        :key="preset.id"
        class="preset-item"
        :class="{ active: selectedPresetId === preset.id }"
        @click="emit('select-preset', preset.id)"
      >
        <div class="preset-preview">
          <!-- Canvas for background and mask -->
          <canvas
            :ref="(el) => setCanvasRef(preset.id, el as HTMLCanvasElement)"
            class="preset-canvas"
          />
          <!-- HTML overlay for foreground text -->
          <div class="preset-foreground foreground-grid">
            <template v-if="presetLayouts.get(preset.id)">
              <div
                v-for="group in presetLayouts.get(preset.id)!.groups"
                :key="group.position"
                class="grid-cell"
                :class="`position-${group.position}`"
              >
                <component
                  v-for="(el, i) in group.elements"
                  :key="i"
                  :is="el.tag"
                  :class="el.className"
                  :style="getElementStyle(el, presetLayouts.get(preset.id)!.inkColor)"
                >{{ el.content }}</component>
              </div>
            </template>
          </div>
        </div>
        <div class="preset-info">
          <span class="preset-name">{{ preset.name }}</span>
        </div>
      </button>
    </div>
  </div>
</template>

<style scoped>
.layout-preset-selector {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.preset-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.preset-item {
  display: flex;
  flex-direction: column;
  width: 100%;
  border: 2px solid oklch(0.85 0.01 260);
  border-radius: 0.5rem;
  background: transparent;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

:global(.dark) .preset-item {
  border-color: oklch(0.30 0.02 260);
}

.preset-item:hover {
  border-color: oklch(0.75 0.01 260);
}

:global(.dark) .preset-item:hover {
  border-color: oklch(0.40 0.02 260);
}

.preset-item.active {
  border-color: oklch(0.55 0.20 250);
  background: oklch(0.55 0.20 250 / 0.1);
}

.preset-preview {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
}

.preset-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  background: oklch(0.92 0.01 260);
}

:global(.dark) .preset-canvas {
  background: oklch(0.22 0.02 260);
}

.preset-foreground {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

/* Foreground grid layout (same as HeroPreview) */
.foreground-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 1fr 1fr 1fr;
  width: 100%;
  height: 100%;
  padding: 4%;
  box-sizing: border-box;
}

.grid-cell {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.position-top-left { align-items: flex-start; justify-content: flex-start; }
.position-top-center { align-items: center; justify-content: flex-start; }
.position-top-right { align-items: flex-end; justify-content: flex-start; }
.position-middle-left { align-items: flex-start; justify-content: center; }
.position-middle-center { align-items: center; justify-content: center; text-align: center; }
.position-middle-right { align-items: flex-end; justify-content: center; }
.position-bottom-left { align-items: flex-start; justify-content: flex-end; }
.position-bottom-center { align-items: center; justify-content: flex-end; text-align: center; }
.position-bottom-right { align-items: flex-end; justify-content: flex-end; text-align: right; }

.preset-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.625rem;
}

.preset-name {
  font-size: 0.8125rem;
  font-weight: 500;
  color: oklch(0.30 0.02 260);
}

:global(.dark) .preset-name {
  color: oklch(0.85 0.02 260);
}
</style>
