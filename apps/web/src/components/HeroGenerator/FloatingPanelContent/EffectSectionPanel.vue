<script setup lang="ts">
/**
 * EffectSectionPanel
 *
 * エフェクト設定パネルのコンテンツ
 */
import SchemaFields from '../../SchemaFields.vue'
import {
  VignetteEffectSchema,
  ChromaticAberrationEffectSchema,
  DotHalftoneEffectSchema,
  LineHalftoneEffectSchema,
} from '../../../modules/HeroScene'

export type FilterType = 'void' | 'vignette' | 'chromaticAberration' | 'dotHalftone' | 'lineHalftone'

defineProps<{
  selectedFilterType: FilterType
  vignetteConfig: Record<string, unknown>
  chromaticConfig: Record<string, unknown>
  dotHalftoneConfig: Record<string, unknown>
  lineHalftoneConfig: Record<string, unknown>
}>()

const emit = defineEmits<{
  (e: 'update:selectedFilterType', value: FilterType): void
  (e: 'update:vignetteConfig', value: Record<string, unknown>): void
  (e: 'update:chromaticConfig', value: Record<string, unknown>): void
  (e: 'update:dotHalftoneConfig', value: Record<string, unknown>): void
  (e: 'update:lineHalftoneConfig', value: Record<string, unknown>): void
}>()
</script>

<template>
  <div class="filter-section">
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
        <input type="radio" :checked="selectedFilterType === 'void'" @change="emit('update:selectedFilterType', 'void')" />
        <span class="filter-name">None</span>
      </label>
      <label class="filter-option" :class="{ active: selectedFilterType === 'vignette' }">
        <input type="radio" :checked="selectedFilterType === 'vignette'" @change="emit('update:selectedFilterType', 'vignette')" />
        <span class="filter-name">Vignette</span>
      </label>
      <label class="filter-option" :class="{ active: selectedFilterType === 'chromaticAberration' }">
        <input type="radio" :checked="selectedFilterType === 'chromaticAberration'" @change="emit('update:selectedFilterType', 'chromaticAberration')" />
        <span class="filter-name">Chromatic Aberration</span>
      </label>
      <label class="filter-option" :class="{ active: selectedFilterType === 'dotHalftone' }">
        <input type="radio" :checked="selectedFilterType === 'dotHalftone'" @change="emit('update:selectedFilterType', 'dotHalftone')" />
        <span class="filter-name">Dot Halftone</span>
      </label>
      <label class="filter-option" :class="{ active: selectedFilterType === 'lineHalftone' }">
        <input type="radio" :checked="selectedFilterType === 'lineHalftone'" @change="emit('update:selectedFilterType', 'lineHalftone')" />
        <span class="filter-name">Line Halftone</span>
      </label>
    </div>
  </div>
</template>

<style scoped>
.filter-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: oklch(0.92 0.01 260);
  border: 2px solid transparent;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

:global(.dark) .filter-option {
  background: oklch(0.20 0.02 260);
}

.filter-option:hover {
  background: oklch(0.88 0.01 260);
}

:global(.dark) .filter-option:hover {
  background: oklch(0.24 0.02 260);
}

.filter-option.active {
  border-color: oklch(0.55 0.20 250);
  background: oklch(0.55 0.20 250 / 0.15);
}

.filter-option input[type="radio"] {
  width: 1rem;
  height: 1rem;
  accent-color: oklch(0.55 0.20 250);
}

.filter-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: oklch(0.25 0.02 260);
}

:global(.dark) .filter-name {
  color: oklch(0.85 0.02 260);
}

.filter-params {
  padding: 0.75rem;
  background: oklch(0.94 0.01 260);
  border-radius: 0.5rem;
  margin-bottom: 0.5rem;
}

:global(.dark) .filter-params {
  background: oklch(0.18 0.02 260);
}

.filter-options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
</style>
