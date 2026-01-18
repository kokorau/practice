<script setup lang="ts">
/**
 * LayoutPresetSelector
 *
 * レイアウトプリセットを選択するUI
 * 各プリセットのプレビューをrenderHeroConfigでレンダリング（HeroPreviewと同じロジック）
 */

import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { $Oklch } from '@practice/color'
import type { Oklch } from '@practice/color'
import { TextureRenderer } from '@practice/texture'
import type { HeroViewPreset } from '@practice/hero-scene'
import { renderHeroConfig } from '@practice/hero-scene'
import type { PrimitivePalette } from '@practice/semantic-color-palette/Domain'
import { createPrimitivePalette } from '@practice/semantic-color-palette/Infra'
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
 * Uses container query width (cqw) for responsive font sizing
 */
const getElementStyle = (el: PositionedElement, inkColor: string): Record<string, string> => {
  const style: Record<string, string> = {}
  const fontFamily = ensureFontLoaded(el.fontId)
  if (fontFamily) style.fontFamily = fontFamily
  if (el.fontSize !== undefined) {
    // Calculate font size relative to container width using cqw
    // Base: fontSize * 16 * PREVIEW_FONT_SCALE at PREVIEW_WIDTH (384px)
    const fontSizePx = el.fontSize * 16 * PREVIEW_FONT_SCALE
    const fontSizeCqw = (fontSizePx / PREVIEW_WIDTH) * 100
    style.fontSize = `${fontSizeCqw}cqw`
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

/**
 * Render preset using shared renderHeroConfig function
 */
const renderPreset = async (presetId: string) => {
  const renderer = renderers.value.get(presetId)
  const preset = props.presets.find(p => p.id === presetId)
  if (!renderer || !preset) return

  const palette = createPaletteFromPreset(preset)
  if (!palette) return

  // Use shared renderHeroConfig with scale for preview size
  await renderHeroConfig(renderer, preset.config, palette, {
    scale: TEXTURE_SCALE,
  })
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
  container-type: inline-size; /* Enable container queries for responsive font sizing */
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
