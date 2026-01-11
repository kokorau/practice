<script setup lang="ts">
import {
  VignetteEffectSchema,
  ChromaticAberrationEffectSchema,
  DotHalftoneEffectSchema,
  LineHalftoneEffectSchema,
} from '../../../modules/HeroScene'
import SchemaFields from '../../SchemaFields.vue'

export type FilterType = 'void' | 'vignette' | 'chromaticAberration' | 'dotHalftone' | 'lineHalftone'

defineProps<{
  selectedFilterType: FilterType
  vignetteConfig: Record<string, unknown>
  chromaticConfig: Record<string, unknown>
  dotHalftoneConfig: Record<string, unknown>
  lineHalftoneConfig: Record<string, unknown>
}>()

const emit = defineEmits<{
  'update:selectedFilterType': [value: FilterType]
  'update:vignetteConfig': [value: Record<string, unknown>]
  'update:chromaticConfig': [value: Record<string, unknown>]
  'update:dotHalftoneConfig': [value: Record<string, unknown>]
  'update:lineHalftoneConfig': [value: Record<string, unknown>]
}>()

const handleFilterTypeChange = (type: FilterType) => {
  emit('update:selectedFilterType', type)
}
</script>

<template>
  <div class="processor-settings">
    <!-- Effect params (shown when effect is active) -->
    <div v-if="selectedFilterType === 'vignette'" class="filter-params">
      <SchemaFields
        :schema="VignetteEffectSchema"
        :model-value="vignetteConfig"
        :exclude="['enabled']"
        @update:model-value="emit('update:vignetteConfig', $event)"
      />
    </div>
    <div v-else-if="selectedFilterType === 'chromaticAberration'" class="filter-params">
      <SchemaFields
        :schema="ChromaticAberrationEffectSchema"
        :model-value="chromaticConfig"
        :exclude="['enabled']"
        @update:model-value="emit('update:chromaticConfig', $event)"
      />
    </div>
    <div v-else-if="selectedFilterType === 'dotHalftone'" class="filter-params">
      <SchemaFields
        :schema="DotHalftoneEffectSchema"
        :model-value="dotHalftoneConfig"
        :exclude="['enabled']"
        @update:model-value="emit('update:dotHalftoneConfig', $event)"
      />
    </div>
    <div v-else-if="selectedFilterType === 'lineHalftone'" class="filter-params">
      <SchemaFields
        :schema="LineHalftoneEffectSchema"
        :model-value="lineHalftoneConfig"
        :exclude="['enabled']"
        @update:model-value="emit('update:lineHalftoneConfig', $event)"
      />
    </div>

    <!-- Filter type selection -->
    <div class="filter-options">
      <label class="filter-option" :class="{ active: selectedFilterType === 'void' }">
        <input
          type="radio"
          :checked="selectedFilterType === 'void'"
          @change="handleFilterTypeChange('void')"
        />
        <span class="filter-name">None</span>
      </label>
      <label class="filter-option" :class="{ active: selectedFilterType === 'vignette' }">
        <input
          type="radio"
          :checked="selectedFilterType === 'vignette'"
          @change="handleFilterTypeChange('vignette')"
        />
        <span class="filter-name">Vignette</span>
      </label>
      <label class="filter-option" :class="{ active: selectedFilterType === 'chromaticAberration' }">
        <input
          type="radio"
          :checked="selectedFilterType === 'chromaticAberration'"
          @change="handleFilterTypeChange('chromaticAberration')"
        />
        <span class="filter-name">Chromatic Aberration</span>
      </label>
      <label class="filter-option" :class="{ active: selectedFilterType === 'dotHalftone' }">
        <input
          type="radio"
          :checked="selectedFilterType === 'dotHalftone'"
          @change="handleFilterTypeChange('dotHalftone')"
        />
        <span class="filter-name">Dot Halftone</span>
      </label>
      <label class="filter-option" :class="{ active: selectedFilterType === 'lineHalftone' }">
        <input
          type="radio"
          :checked="selectedFilterType === 'lineHalftone'"
          @change="handleFilterTypeChange('lineHalftone')"
        />
        <span class="filter-name">Line Halftone</span>
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
</style>
