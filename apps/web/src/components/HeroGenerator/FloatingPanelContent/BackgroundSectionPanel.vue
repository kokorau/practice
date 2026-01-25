<script setup lang="ts">
/**
 * BackgroundSectionPanel
 *
 * 背景テクスチャ選択パネルのコンテンツ
 * Colors are now displayed via SchemaFields as part of surface params
 */
import { computed } from 'vue'
import type { ObjectSchema } from '@practice/schema'
import type { PrimitivePalette } from '@practice/semantic-color-palette/Domain'
import type { HeroViewConfig, ColorValue } from '@practice/section-visual'
import { resolveKeyToRgba, isCustomColor } from '@practice/section-visual'
import type { RGBA } from '@practice/texture'
import type { PatternItem } from '../SurfaceSelector.vue'
import type { GradientStop } from '../GradientStopEditor.vue'
import SchemaFields from '../../SchemaFields.vue'
import SurfaceSelector from '../SurfaceSelector.vue'
import GradientStopEditor from '../GradientStopEditor.vue'

const props = defineProps<{
  palette: PrimitivePalette
  // Surface params (includes colors)
  surfaceSchema: ObjectSchema | null
  surfaceParams: Record<string, unknown> | null
  // Patterns
  patterns: PatternItem[]
  selectedIndex: number | null
  // Hero preview mode
  previewMode?: 'pattern' | 'hero'
  baseConfig?: HeroViewConfig
}>()

const emit = defineEmits<{
  (e: 'update:surfaceParams', value: Record<string, unknown>): void
  (e: 'select-pattern', index: number | null): void
}>()

// Gradient surface types that use GradientStopEditor
const GRADIENT_SURFACE_TYPES = [
  'linearGradient',
  'circularGradient',
  'conicGradient',
  'repeatLinearGradient',
  'perlinGradient',
  'curlGradient',
] as const

// Check if current surface is a gradient type (uses GradientStopEditor)
// Note: CustomBackgroundSurfaceParams uses 'id' field (converted from 'type' in SurfaceMapper)
const isGradientSurface = computed(() =>
  GRADIENT_SURFACE_TYPES.includes(props.surfaceParams?.id as typeof GRADIENT_SURFACE_TYPES[number])
)

// Convert ColorValue to RGBA
const colorValueToRgba = (color: ColorValue): RGBA => {
  if (typeof color === 'string') {
    if (color === 'auto') {
      // Auto color - use brand color as default
      return resolveKeyToRgba(props.palette, 'B')
    }
    return resolveKeyToRgba(props.palette, color)
  }
  if (isCustomColor(color)) {
    // Convert HSV to RGB
    const h = color.hue / 360
    const s = color.saturation / 100
    const v = color.value / 100
    const c = v * s
    const x = c * (1 - Math.abs((h * 6) % 2 - 1))
    const m = v - c
    let r = 0, g = 0, b = 0
    const hh = h * 6
    if (hh < 1) { r = c; g = x }
    else if (hh < 2) { r = x; g = c }
    else if (hh < 3) { g = c; b = x }
    else if (hh < 4) { g = x; b = c }
    else if (hh < 5) { r = x; b = c }
    else { r = c; b = x }
    return [r + m, g + m, b + m, 1]
  }
  return [0.5, 0.5, 0.5, 1]
}

// Get gradient stops from params or create default from colors
const gradientStops = computed<GradientStop[]>(() => {
  if (!isGradientSurface.value || !props.surfaceParams) return []

  // Check for custom stops (with ColorValue)
  const stopsData = props.surfaceParams.gradientStops as Array<{ id: string; color: ColorValue; position: number }> | undefined
  if (stopsData && stopsData.length >= 2) {
    return stopsData
  }

  // Fallback: create 2 stops from color1/color2
  const color1 = (props.surfaceParams.color1 as ColorValue) ?? 'B'
  const color2 = (props.surfaceParams.color2 as ColorValue) ?? 'auto'
  return [
    { id: 'stop-0', color: color1, position: 0 },
    { id: 'stop-1', color: color2, position: 1 },
  ]
})

// Update gradient stops and convert to RGBA for rendering
const updateGradientStops = (stops: GradientStop[]) => {
  if (!props.surfaceParams) return

  // Store ColorValue stops for UI editing
  const gradientStops = stops.map(s => ({
    id: s.id,
    color: s.color,
    position: s.position,
  }))

  // Convert to RGBA stops for rendering
  const rgbaStops = stops.map(s => ({
    color: colorValueToRgba(s.color),
    position: s.position,
  }))

  emit('update:surfaceParams', {
    ...props.surfaceParams,
    gradientStops,
    stops: rgbaStops, // RGBA version for shader
  })
}
</script>

<template>
  <!-- Background surface params including colors -->
  <div v-if="surfaceSchema && surfaceParams" class="surface-params">
    <SchemaFields
      :schema="surfaceSchema"
      :model-value="surfaceParams"
      :palette="palette"
      :columns="1"
      :exclude="isGradientSurface ? ['color1', 'color2'] : []"
      @update:model-value="emit('update:surfaceParams', $event)"
    />
    <!-- Gradient Stop Editor for gradient surfaces -->
    <GradientStopEditor
      v-if="isGradientSurface"
      :model-value="gradientStops"
      :palette="palette"
      @update:model-value="updateGradientStops"
    />
  </div>
  <SurfaceSelector
    :patterns="patterns"
    :selected-index="selectedIndex"
    :preview-mode="previewMode"
    :base-config="baseConfig"
    :palette="palette"
    @select-pattern="emit('select-pattern', $event)"
  />
</template>

<style scoped>
.surface-params {
  padding: 0.75rem;
  background: oklch(0.94 0.01 260);
  border-radius: 0.5rem;
  margin-bottom: 0.75rem;
}

:global(.dark) .surface-params {
  background: oklch(0.18 0.02 260);
}
</style>
