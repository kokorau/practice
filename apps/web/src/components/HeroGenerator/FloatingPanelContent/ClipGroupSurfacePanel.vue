<script setup lang="ts">
/**
 * ClipGroupSurfacePanel
 *
 * クリップグループテクスチャ選択パネルのコンテンツ
 */
import type { ObjectSchema } from '@practice/schema'
import type { PrimitivePalette } from '@practice/semantic-color-palette/Domain'
import type { HeroViewConfig, ColorValue } from '@practice/section-visual'
import type { PatternItem } from '../SurfaceSelector.vue'
import PrimitiveColorPicker from '../PrimitiveColorPicker.vue'
import SchemaFields from '../../SchemaFields.vue'
import SurfaceSelector from '../SurfaceSelector.vue'

defineProps<{
  // Color keys
  colorKey1: ColorValue
  colorKey2: ColorValue
  palette: PrimitivePalette
  // Surface params
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
  (e: 'update:colorKey1', value: ColorValue): void
  (e: 'update:colorKey2', value: ColorValue): void
  (e: 'update:surfaceParams', value: Record<string, unknown>): void
  (e: 'select-pattern', index: number | null): void
}>()
</script>

<template>
  <!-- Mask color selection (at top for easy access) -->
  <div class="color-selection-section no-border">
    <PrimitiveColorPicker
      :model-value="colorKey1"
      :palette="palette"
      label="Mask Primary Color"
      :show-auto="true"
      @update:model-value="emit('update:colorKey1', $event)"
    />
    <PrimitiveColorPicker
      :model-value="colorKey2"
      :palette="palette"
      label="Mask Secondary Color"
      :show-auto="true"
      @update:model-value="emit('update:colorKey2', $event)"
    />
  </div>
  <!-- Surface params (shown when texture is selected) -->
  <div v-if="surfaceSchema && surfaceParams" class="surface-params">
    <SchemaFields
      :schema="surfaceSchema"
      :model-value="surfaceParams"
      @update:model-value="emit('update:surfaceParams', $event)"
    />
  </div>
  <SurfaceSelector
    :patterns="patterns"
    :selected-index="selectedIndex"
    :preview-mode="previewMode"
    :base-config="baseConfig"
    :palette="palette"
    target-layer-type="surface"
    @select-pattern="emit('select-pattern', $event)"
  />
</template>

<style scoped>
.color-selection-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid oklch(0.85 0.01 260);
}

.color-selection-section.no-border {
  margin-top: 0;
  padding-top: 0;
  border-top: none;
  margin-bottom: 1rem;
}

:global(.dark) .color-selection-section {
  border-top-color: oklch(0.30 0.02 260);
}

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
