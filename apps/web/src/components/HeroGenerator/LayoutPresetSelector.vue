<script setup lang="ts">
/**
 * LayoutPresetSelector
 *
 * レイアウトプリセットを選択するUI
 * 各プリセットのプレビューをWebGPUでレンダリング
 */

import { ref, onMounted, onUnmounted, watch } from 'vue'
import { TextureRenderer, createSolidSpec, createStripeSpec, createGridSpec, createPolkaDotSpec, createCheckerSpec, type TextureRenderSpec, type Viewport, type RGBA } from '@practice/texture'
import type { HeroViewPreset } from '../../modules/HeroScene'

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

// Default colors for preview (neutral gray tones)
const previewColor1: RGBA = [0.3, 0.35, 0.4, 1]
const previewColor2: RGBA = [0.85, 0.87, 0.9, 1]

/**
 * Create a render spec from preset background surface config
 */
const createSpecFromPreset = (preset: HeroViewPreset, viewport: Viewport): TextureRenderSpec | null => {
  const surface = preset.config.background.surface

  if (surface.type === 'solid') {
    return createSolidSpec({ color: previewColor2 })
  }
  if (surface.type === 'stripe') {
    return createStripeSpec({
      color1: previewColor1,
      color2: previewColor2,
      width1: surface.width1,
      width2: surface.width2,
      angle: surface.angle,
    })
  }
  if (surface.type === 'grid') {
    return createGridSpec({
      lineColor: previewColor1,
      bgColor: previewColor2,
      lineWidth: surface.lineWidth,
      cellSize: surface.cellSize,
    })
  }
  if (surface.type === 'polkaDot') {
    return createPolkaDotSpec({
      dotColor: previewColor1,
      bgColor: previewColor2,
      dotRadius: surface.dotRadius,
      spacing: surface.spacing,
      rowOffset: surface.rowOffset,
    })
  }
  if (surface.type === 'checker') {
    return createCheckerSpec({
      color1: previewColor1,
      color2: previewColor2,
      cellSize: surface.cellSize,
      angle: surface.angle,
    })
  }

  // Fallback for image type
  return createSolidSpec({ color: previewColor2 })
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
  const spec = createSpecFromPreset(preset, viewport)
  if (spec) {
    renderer.render(spec)
  }
}

const initRenderers = async () => {
  for (const preset of props.presets) {
    const canvas = canvasRefs.value.get(preset.id)
    if (!canvas) continue

    canvas.width = 192
    canvas.height = 108

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

onMounted(() => {
  // Wait for DOM to be ready
  setTimeout(initRenderers, 50)
})

onUnmounted(() => {
  destroyRenderers()
})

// Re-render when presets change
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
        <canvas
          :ref="(el) => setCanvasRef(preset.id, el as HTMLCanvasElement)"
          class="preset-canvas"
        />
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

.preset-canvas {
  width: 100%;
  aspect-ratio: 16 / 9;
  background: oklch(0.92 0.01 260);
}

:global(.dark) .preset-canvas {
  background: oklch(0.22 0.02 260);
}

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
