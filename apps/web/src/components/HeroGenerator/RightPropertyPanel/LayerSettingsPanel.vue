<script setup lang="ts">
import { computed } from 'vue'
import type { PrimitivePalette } from '@practice/semantic-color-palette/Domain'
import type { ObjectSchema } from '@practice/schema'
import type { ColorValue } from '@practice/section-visual'
import { resolveKeyToRgba, isCustomColor } from '@practice/section-visual'
import type { RGBA } from '@practice/texture'
import PresetSelector from '../PresetSelector.vue'
import PatternThumbnail from '../PatternThumbnail.vue'
import { type PatternItem } from '../SurfaceSelector.vue'
import SchemaFields from '../../SchemaFields.vue'
import GradientStopEditor, { type GradientStop } from '../GradientStopEditor.vue'

const props = defineProps<{
  layerType: 'base' | 'surface'
  primitivePalette: PrimitivePalette
  patterns: PatternItem[]
  selectedIndex: number | null
  surfaceSchema: ObjectSchema | null
  surfaceParams: Record<string, unknown> | null
  /** Raw params with PropertyValue preserved (for DSL display) */
  rawSurfaceParams?: Record<string, unknown> | null
}>()

const emit = defineEmits<{
  (e: 'select-pattern', index: number | null): void
  /** Single param update - preserves other PropertyValue types */
  (e: 'update:surfaceParam', key: string, value: unknown): void
  /** Full params update - for gradient stops */
  (e: 'update:surfaceParams', value: Record<string, unknown>): void
}>()

// Surface params should be shown when schema and params exist
const shouldShowSurfaceParams = (): boolean => {
  return !!props.surfaceSchema && !!props.surfaceParams
}

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
// Note: CustomSurfaceParams uses 'id' field (converted from 'type' in SurfaceMapper)
const isGradientSurface = computed(() =>
  GRADIENT_SURFACE_TYPES.includes(props.surfaceParams?.id as typeof GRADIENT_SURFACE_TYPES[number])
)

// Convert ColorValue to RGBA
const colorValueToRgba = (color: ColorValue): RGBA => {
  if (typeof color === 'string') {
    if (color === 'auto') {
      // Auto color - use brand color as default
      return resolveKeyToRgba(props.primitivePalette, 'B')
    }
    if (color === 'transparent') {
      return [0, 0, 0, 0]
    }
    return resolveKeyToRgba(props.primitivePalette, color)
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
  <div class="layer-settings">
    <!-- Texture selection (Preset) -->
    <div class="settings-section">
      <PresetSelector
        label="Texture"
        :items="patterns"
        :selected-index="selectedIndex"
        :show-null-option="layerType === 'base'"
        null-label="べた塗り"
        @select="emit('select-pattern', $event)"
      >
        <template #selected>
          <PatternThumbnail
            v-if="selectedIndex !== null && patterns[selectedIndex]"
            :create-spec="patterns[selectedIndex]!.createSpec"
          />
          <span v-else class="solid-preview">Solid</span>
        </template>
        <template #null>
          <span class="solid-preview">Solid</span>
        </template>
        <template #item="{ item }">
          <PatternThumbnail :create-spec="item.createSpec" />
        </template>
      </PresetSelector>
    </div>

    <!-- Surface params (Parameters including colors) -->
    <div v-if="shouldShowSurfaceParams()" class="settings-section">
      <p class="settings-label">Parameters</p>
      <SchemaFields
        :schema="surfaceSchema!"
        :model-value="surfaceParams!"
        :raw-params="rawSurfaceParams"
        :palette="primitivePalette"
        :columns="1"
        :exclude="isGradientSurface ? ['color1', 'color2'] : []"
        @update:field="(key, value) => emit('update:surfaceParam', key, value)"
      />
      <!-- Gradient Stop Editor for gradient surfaces -->
      <GradientStopEditor
        v-if="isGradientSurface"
        :model-value="gradientStops"
        :palette="primitivePalette"
        @update:model-value="updateGradientStops"
      />
    </div>
  </div>
</template>

<style scoped>
.layer-settings {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.settings-section {
  padding: 0.5rem 0;
}

.settings-section:not(:last-child) {
  border-bottom: 1px solid oklch(0.90 0.01 260);
}

:global(.dark) .settings-section:not(:last-child) {
  border-bottom-color: oklch(0.22 0.02 260);
}

.settings-label {
  margin: 0 0 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: oklch(0.40 0.02 260);
}

:global(.dark) .settings-label {
  color: oklch(0.70 0.02 260);
}

.solid-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: oklch(0.92 0.01 260);
  color: oklch(0.50 0.02 260);
  font-size: 0.625rem;
  font-weight: 500;
}

:global(.dark) .solid-preview {
  background: oklch(0.22 0.02 260);
  color: oklch(0.60 0.02 260);
}
</style>
