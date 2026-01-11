<script setup lang="ts">
/**
 * BackgroundSectionPanel
 *
 * 背景テクスチャ選択パネルのコンテンツ
 */
import type { ObjectSchema } from '@practice/schema'
import type { PrimitivePalette, PrimitiveKey } from '../../../modules/SemanticColorPalette/Domain'
import type { HeroViewConfig } from '../../../modules/HeroScene'
import type { PatternItem } from '../SurfaceSelector.vue'
import PrimitiveColorPicker from '../PrimitiveColorPicker.vue'
import SchemaFields from '../../SchemaFields.vue'
import SurfaceSelector from '../SurfaceSelector.vue'

defineProps<{
  // Color keys
  colorKey1: PrimitiveKey
  colorKey2: PrimitiveKey | 'auto'
  palette: PrimitivePalette
  // Surface params
  surfaceSchema: ObjectSchema | null
  surfaceParams: Record<string, unknown> | null
  // Patterns
  patterns: PatternItem[]
  selectedIndex: number | null
  // Custom image
  customImage: string | null
  customFileName: string | null
  // Random loading
  isLoadingRandom: boolean
  // Hero preview mode
  previewMode?: 'pattern' | 'hero'
  baseConfig?: HeroViewConfig
}>()

const emit = defineEmits<{
  (e: 'update:colorKey1', value: PrimitiveKey | 'auto'): void
  (e: 'update:colorKey2', value: PrimitiveKey | 'auto'): void
  (e: 'update:surfaceParams', value: Record<string, unknown>): void
  (e: 'upload-image', file: File): void
  (e: 'clear-image'): void
  (e: 'select-pattern', index: number | null): void
  (e: 'load-random'): void
}>()
</script>

<template>
  <!-- Color selection (at top for easy access) -->
  <div class="color-selection-section no-border">
    <PrimitiveColorPicker
      :model-value="colorKey1"
      :palette="palette"
      label="Primary Color"
      @update:model-value="emit('update:colorKey1', $event)"
    />
    <PrimitiveColorPicker
      :model-value="colorKey2"
      :palette="palette"
      label="Secondary Color"
      :show-auto="true"
      @update:model-value="emit('update:colorKey2', $event)"
    />
  </div>
  <!-- Background surface params (shown when non-solid pattern is selected) -->
  <div v-if="surfaceSchema && surfaceParams && surfaceParams.type !== 'solid'" class="surface-params">
    <SchemaFields
      :schema="surfaceSchema"
      :model-value="surfaceParams"
      @update:model-value="emit('update:surfaceParams', $event)"
    />
  </div>
  <SurfaceSelector
    :custom-image="customImage"
    :custom-file-name="customFileName"
    :patterns="patterns"
    :selected-index="selectedIndex"
    :show-random-button="true"
    :is-loading-random="isLoadingRandom"
    :preview-mode="previewMode"
    :base-config="baseConfig"
    :palette="palette"
    @upload-image="emit('upload-image', $event)"
    @clear-image="emit('clear-image')"
    @select-pattern="emit('select-pattern', $event)"
    @load-random="emit('load-random')"
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
