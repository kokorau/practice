<script setup lang="ts">
/**
 * BackgroundSectionPanel
 *
 * 背景テクスチャ選択パネルのコンテンツ
 * Colors are now displayed via SchemaFields as part of surface params
 */
import type { ObjectSchema } from '@practice/schema'
import type { PrimitivePalette } from '@practice/semantic-color-palette/Domain'
import type { HeroViewConfig } from '@practice/section-visual'
import type { PatternItem } from '../SurfaceSelector.vue'
import SchemaFields from '../../SchemaFields.vue'
import SurfaceSelector from '../SurfaceSelector.vue'

defineProps<{
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
</script>

<template>
  <!-- Background surface params including colors -->
  <div v-if="surfaceSchema && surfaceParams" class="surface-params">
    <SchemaFields
      :schema="surfaceSchema"
      :model-value="surfaceParams"
      :palette="palette"
      :columns="1"
      @update:model-value="emit('update:surfaceParams', $event)"
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
