<script setup lang="ts">
import type { PrimitivePalette, PrimitiveKey } from '@practice/semantic-color-palette/Domain'
import type { ObjectSchema } from '@practice/schema'
import PrimitiveColorPicker from '../PrimitiveColorPicker.vue'
import PresetSelector from '../PresetSelector.vue'
import PatternThumbnail from '../PatternThumbnail.vue'
import { type PatternItem } from '../SurfaceSelector.vue'
import SchemaFields from '../../SchemaFields.vue'

const props = withDefaults(defineProps<{
  layerType: 'base' | 'surface'
  primitivePalette: PrimitivePalette
  colorKey1: PrimitiveKey | 'auto'
  colorKey2: PrimitiveKey | 'auto'
  showAuto1?: boolean
  showAuto2?: boolean
  patterns: PatternItem[]
  selectedIndex: number | null
  surfaceSchema: ObjectSchema | null
  surfaceParams: Record<string, unknown> | null
}>(), {
  showAuto1: false,
  showAuto2: true,
})

const emit = defineEmits<{
  (e: 'update:colorKey1', value: PrimitiveKey | 'auto'): void
  (e: 'update:colorKey2', value: PrimitiveKey | 'auto'): void
  (e: 'select-pattern', index: number | null): void
  (e: 'update:surfaceParams', value: Record<string, unknown>): void
}>()

// Surface params should be shown:
// - For 'base': when schema exists, params exist, and type !== 'solid'
// - For 'surface': when schema exists and params exist (no type check)
const shouldShowSurfaceParams = (): boolean => {
  if (!props.surfaceSchema || !props.surfaceParams) return false
  if (props.layerType === 'base') {
    return props.surfaceParams.type !== 'solid'
  }
  return true
}
</script>

<template>
  <div class="layer-settings">
    <!-- Color selection -->
    <div class="settings-section">
      <p class="settings-label">Colors</p>
      <div class="colors-row">
        <PrimitiveColorPicker
          :model-value="colorKey1"
          :palette="primitivePalette"
          label="Primary"
          :show-auto="showAuto1"
          @update:model-value="emit('update:colorKey1', $event)"
        />
        <PrimitiveColorPicker
          :model-value="colorKey2"
          :palette="primitivePalette"
          label="Secondary"
          :show-auto="showAuto2"
          @update:model-value="emit('update:colorKey2', $event)"
        />
      </div>
    </div>

    <!-- Surface params -->
    <div v-if="shouldShowSurfaceParams()" class="settings-section">
      <p class="settings-label">Parameters</p>
      <SchemaFields
        :schema="surfaceSchema!"
        :model-value="surfaceParams!"
        @update:model-value="emit('update:surfaceParams', $event)"
      />
    </div>

    <!-- Texture selection -->
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
            :create-spec="patterns[selectedIndex].createSpec"
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

.colors-row {
  display: flex;
  gap: 0.5rem;
  width: 100%;
}

.colors-row > * {
  flex: 1;
  min-width: 0;
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
