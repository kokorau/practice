<script setup lang="ts">
/**
 * @deprecated Use EffectorSettingsPanel instead
 * This component is kept for backward compatibility
 */
import { type WritableComputedRef } from 'vue'
import {
  VignetteBaseSchema,
  ChromaticAberrationEffectSchema,
  DotHalftoneEffectSchema,
  LineHalftoneEffectSchema,
  BlurEffectSchema,
  type FilterType,
} from '@practice/section-visual'
import type {
  VignetteConfigParams,
  ChromaticConfigParams,
  DotHalftoneConfigParams,
  LineHalftoneConfigParams,
  BlurConfigParams,
} from '../../../composables/useFilterEditor'
import { useVignetteEditor } from '../../../composables/useVignetteEditor'
import SchemaFields from '../../SchemaFields.vue'

const props = defineProps<{
  selectedFilterType: WritableComputedRef<FilterType>
  vignetteConfig: WritableComputedRef<VignetteConfigParams>
  chromaticConfig: WritableComputedRef<ChromaticConfigParams>
  dotHalftoneConfig: WritableComputedRef<DotHalftoneConfigParams>
  lineHalftoneConfig: WritableComputedRef<LineHalftoneConfigParams>
  blurConfig: WritableComputedRef<BlurConfigParams>
}>()

// Use vignette editor composable for common vignette logic
const {
  shapeSchema: vignetteShapeSchema,
  shapeParams: vignetteShapeParams,
  colorHex: vignetteColorHex,
  handleBaseUpdate: handleVignetteBaseUpdate,
  handleShapeUpdate: handleVignetteShapeUpdate,
  handleColorChange,
} = useVignetteEditor({ vignetteConfig: props.vignetteConfig })

const handleFilterTypeChange = (type: FilterType) => {
  props.selectedFilterType.value = type
}
</script>

<template>
  <div class="processor-settings">
    <!-- Effect params (shown when effect is active) -->
    <div v-if="selectedFilterType.value === 'vignette'" class="filter-params">
      <!-- Base vignette params (shape, intensity, softness) -->
      <SchemaFields
        :schema="VignetteBaseSchema"
        :model-value="vignetteConfig.value as Record<string, unknown>"
        :exclude="['enabled']"
        @update:model-value="handleVignetteBaseUpdate"
      />
      <!-- Shape-specific params -->
      <SchemaFields
        :schema="vignetteShapeSchema"
        :model-value="vignetteShapeParams"
        @update:model-value="handleVignetteShapeUpdate"
      />
      <!-- Color picker -->
      <div class="color-picker-group">
        <label class="color-picker-label">Color</label>
        <input
          type="color"
          class="color-picker-input"
          :value="vignetteColorHex"
          @input="handleColorChange"
        />
      </div>
    </div>
    <div v-else-if="selectedFilterType.value === 'chromaticAberration'" class="filter-params">
      <SchemaFields
        :schema="ChromaticAberrationEffectSchema"
        :model-value="chromaticConfig.value as Record<string, unknown>"
        :exclude="['enabled']"
        @update:model-value="(v) => chromaticConfig.value = v as ChromaticConfigParams"
      />
    </div>
    <div v-else-if="selectedFilterType.value === 'dotHalftone'" class="filter-params">
      <SchemaFields
        :schema="DotHalftoneEffectSchema"
        :model-value="dotHalftoneConfig.value as Record<string, unknown>"
        :exclude="['enabled']"
        @update:model-value="(v) => dotHalftoneConfig.value = v as DotHalftoneConfigParams"
      />
    </div>
    <div v-else-if="selectedFilterType.value === 'lineHalftone'" class="filter-params">
      <SchemaFields
        :schema="LineHalftoneEffectSchema"
        :model-value="lineHalftoneConfig.value as Record<string, unknown>"
        :exclude="['enabled']"
        @update:model-value="(v) => lineHalftoneConfig.value = v as LineHalftoneConfigParams"
      />
    </div>
    <div v-else-if="selectedFilterType.value === 'blur'" class="filter-params">
      <SchemaFields
        :schema="BlurEffectSchema"
        :model-value="blurConfig.value as Record<string, unknown>"
        :exclude="['enabled']"
        @update:model-value="(v) => blurConfig.value = v as BlurConfigParams"
      />
    </div>

    <!-- Filter type selection -->
    <div class="filter-options">
      <label class="filter-option" :class="{ active: selectedFilterType.value === 'void' }">
        <input
          type="radio"
          name="filter-type"
          :checked="selectedFilterType.value === 'void'"
          @change="handleFilterTypeChange('void')"
        />
        <span class="filter-name">None</span>
      </label>
      <label class="filter-option" :class="{ active: selectedFilterType.value === 'vignette' }">
        <input
          type="radio"
          name="filter-type"
          :checked="selectedFilterType.value === 'vignette'"
          @change="handleFilterTypeChange('vignette')"
        />
        <span class="filter-name">Vignette</span>
      </label>
      <label class="filter-option" :class="{ active: selectedFilterType.value === 'chromaticAberration' }">
        <input
          type="radio"
          name="filter-type"
          :checked="selectedFilterType.value === 'chromaticAberration'"
          @change="handleFilterTypeChange('chromaticAberration')"
        />
        <span class="filter-name">Chromatic Aberration</span>
      </label>
      <label class="filter-option" :class="{ active: selectedFilterType.value === 'dotHalftone' }">
        <input
          type="radio"
          name="filter-type"
          :checked="selectedFilterType.value === 'dotHalftone'"
          @change="handleFilterTypeChange('dotHalftone')"
        />
        <span class="filter-name">Dot Halftone</span>
      </label>
      <label class="filter-option" :class="{ active: selectedFilterType.value === 'lineHalftone' }">
        <input
          type="radio"
          name="filter-type"
          :checked="selectedFilterType.value === 'lineHalftone'"
          @change="handleFilterTypeChange('lineHalftone')"
        />
        <span class="filter-name">Line Halftone</span>
      </label>
      <label class="filter-option" :class="{ active: selectedFilterType.value === 'blur' }">
        <input
          type="radio"
          name="filter-type"
          :checked="selectedFilterType.value === 'blur'"
          @change="handleFilterTypeChange('blur')"
        />
        <span class="filter-name">Blur</span>
      </label>
    </div>
  </div>
</template>

<style scoped>
.processor-settings {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.filter-params {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid oklch(0.90 0.01 260);
}

:global(.dark) .filter-params {
  border-bottom-color: oklch(0.22 0.02 260);
}

.filter-options {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.filter-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.625rem;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: background 0.15s;
}

.filter-option:hover {
  background: oklch(0.94 0.01 260);
}

:global(.dark) .filter-option:hover {
  background: oklch(0.20 0.02 260);
}

.filter-option.active {
  background: oklch(0.55 0.15 250 / 0.15);
}

:global(.dark) .filter-option.active {
  background: oklch(0.55 0.15 250 / 0.25);
}

.filter-option input[type="radio"] {
  width: 1rem;
  height: 1rem;
  accent-color: oklch(0.55 0.20 250);
}

.filter-name {
  font-size: 0.8125rem;
  color: oklch(0.30 0.02 260);
}

:global(.dark) .filter-name {
  color: oklch(0.85 0.02 260);
}

.color-picker-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.color-picker-label {
  font-size: 0.75rem;
  color: oklch(0.40 0.02 260);
  min-width: 4rem;
}

:global(.dark) .color-picker-label {
  color: oklch(0.70 0.02 260);
}

.color-picker-input {
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: 1px solid oklch(0.85 0.01 260);
  border-radius: 0.25rem;
  cursor: pointer;
}

:global(.dark) .color-picker-input {
  border-color: oklch(0.30 0.02 260);
}
</style>
