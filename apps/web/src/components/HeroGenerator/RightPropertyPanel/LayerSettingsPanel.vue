<script setup lang="ts">
import type { PrimitivePalette } from '@practice/semantic-color-palette/Domain'
import type { ObjectSchema } from '@practice/schema'
import PresetSelector from '../PresetSelector.vue'
import PatternThumbnail from '../PatternThumbnail.vue'
import { type PatternItem } from '../SurfaceSelector.vue'
import SchemaFields from '../../SchemaFields.vue'

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
}>()

// Surface params should be shown when schema and params exist
const shouldShowSurfaceParams = (): boolean => {
  return !!props.surfaceSchema && !!props.surfaceParams
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
        @update:field="(key, value) => emit('update:surfaceParam', key, value)"
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
