<script setup lang="ts">
/**
 * Unified Effector Settings Panel
 *
 * Combines Effect and Mask editing into a single component.
 * Displays different UI based on effectorType prop.
 */
import {
  VignetteBaseSchema,
  ChromaticAberrationEffectSchema,
  DotHalftoneEffectSchema,
  LineHalftoneEffectSchema,
  BlurEffectSchema,
  type FilterType,
} from '../../../modules/HeroScene'
import type {
  ChromaticConfigParams,
  DotHalftoneConfigParams,
  LineHalftoneConfigParams,
  BlurConfigParams,
} from '../../../composables/useFilterEditor'
import type { EffectorType, FilterProps, MaskProps } from '../../../composables/useEffectorManager'
import { useVignetteEditor } from '../../../composables/useVignetteEditor'
import SchemaFields from '../../SchemaFields.vue'
import MaskPatternThumbnail from '../MaskPatternThumbnail.vue'

// ============================================================
// Props
// ============================================================

const props = defineProps<{
  /** Current effector type being edited */
  effectorType: EffectorType
  /** Filter props for effect editing */
  filterProps: FilterProps
  /** Mask props for mask editing */
  maskProps: MaskProps
}>()

// ============================================================
// Emits
// ============================================================

const emit = defineEmits<{
  'update:selectedMaskIndex': [value: number]
  'update:maskShapeParams': [value: Record<string, unknown>]
}>()

// ============================================================
// Effect Logic (from EffectSettingsPanel)
// ============================================================

// Use vignette editor composable for common vignette logic
const {
  shapeSchema: vignetteShapeSchema,
  shapeParams: vignetteShapeParams,
  colorHex: vignetteColorHex,
  handleBaseUpdate: handleVignetteBaseUpdate,
  handleShapeUpdate: handleVignetteShapeUpdate,
  handleColorChange,
} = useVignetteEditor({ vignetteConfig: props.filterProps.vignetteConfig })

const handleFilterTypeChange = (type: FilterType) => {
  props.filterProps.selectedType.value = type
}
</script>

<template>
  <div class="effector-settings">
    <!-- ============================================== -->
    <!-- Effect Settings (when effectorType === 'effect') -->
    <!-- ============================================== -->
    <template v-if="effectorType === 'effect'">
      <!-- Effect params (shown when effect is active) -->
      <div v-if="filterProps.selectedType.value === 'vignette'" class="filter-params">
        <!-- Base vignette params (shape, intensity, softness) -->
        <SchemaFields
          :schema="VignetteBaseSchema"
          :model-value="filterProps.vignetteConfig.value as Record<string, unknown>"
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
      <div v-else-if="filterProps.selectedType.value === 'chromaticAberration'" class="filter-params">
        <SchemaFields
          :schema="ChromaticAberrationEffectSchema"
          :model-value="filterProps.chromaticConfig.value as Record<string, unknown>"
          :exclude="['enabled']"
          @update:model-value="(v) => filterProps.chromaticConfig.value = v as ChromaticConfigParams"
        />
      </div>
      <div v-else-if="filterProps.selectedType.value === 'dotHalftone'" class="filter-params">
        <SchemaFields
          :schema="DotHalftoneEffectSchema"
          :model-value="filterProps.dotHalftoneConfig.value as Record<string, unknown>"
          :exclude="['enabled']"
          @update:model-value="(v) => filterProps.dotHalftoneConfig.value = v as DotHalftoneConfigParams"
        />
      </div>
      <div v-else-if="filterProps.selectedType.value === 'lineHalftone'" class="filter-params">
        <SchemaFields
          :schema="LineHalftoneEffectSchema"
          :model-value="filterProps.lineHalftoneConfig.value as Record<string, unknown>"
          :exclude="['enabled']"
          @update:model-value="(v) => filterProps.lineHalftoneConfig.value = v as LineHalftoneConfigParams"
        />
      </div>
      <div v-else-if="filterProps.selectedType.value === 'blur'" class="filter-params">
        <SchemaFields
          :schema="BlurEffectSchema"
          :model-value="filterProps.blurConfig.value as Record<string, unknown>"
          :exclude="['enabled']"
          @update:model-value="(v) => filterProps.blurConfig.value = v as BlurConfigParams"
        />
      </div>

      <!-- Filter type selection -->
      <div class="filter-options">
        <label class="filter-option" :class="{ active: filterProps.selectedType.value === 'void' }">
          <input
            type="radio"
            name="filter-type"
            :checked="filterProps.selectedType.value === 'void'"
            @change="handleFilterTypeChange('void')"
          />
          <span class="filter-name">None</span>
        </label>
        <label class="filter-option" :class="{ active: filterProps.selectedType.value === 'vignette' }">
          <input
            type="radio"
            name="filter-type"
            :checked="filterProps.selectedType.value === 'vignette'"
            @change="handleFilterTypeChange('vignette')"
          />
          <span class="filter-name">Vignette</span>
        </label>
        <label class="filter-option" :class="{ active: filterProps.selectedType.value === 'chromaticAberration' }">
          <input
            type="radio"
            name="filter-type"
            :checked="filterProps.selectedType.value === 'chromaticAberration'"
            @change="handleFilterTypeChange('chromaticAberration')"
          />
          <span class="filter-name">Chromatic Aberration</span>
        </label>
        <label class="filter-option" :class="{ active: filterProps.selectedType.value === 'dotHalftone' }">
          <input
            type="radio"
            name="filter-type"
            :checked="filterProps.selectedType.value === 'dotHalftone'"
            @change="handleFilterTypeChange('dotHalftone')"
          />
          <span class="filter-name">Dot Halftone</span>
        </label>
        <label class="filter-option" :class="{ active: filterProps.selectedType.value === 'lineHalftone' }">
          <input
            type="radio"
            name="filter-type"
            :checked="filterProps.selectedType.value === 'lineHalftone'"
            @change="handleFilterTypeChange('lineHalftone')"
          />
          <span class="filter-name">Line Halftone</span>
        </label>
        <label class="filter-option" :class="{ active: filterProps.selectedType.value === 'blur' }">
          <input
            type="radio"
            name="filter-type"
            :checked="filterProps.selectedType.value === 'blur'"
            @change="handleFilterTypeChange('blur')"
          />
          <span class="filter-name">Blur</span>
        </label>
      </div>
    </template>

    <!-- ============================================== -->
    <!-- Mask Settings (when effectorType === 'mask') -->
    <!-- ============================================== -->
    <template v-else-if="effectorType === 'mask'">
      <!-- Shape params (shown when mask is selected) -->
      <div v-if="maskProps.shapeSchema && maskProps.shapeParams" class="shape-params">
        <SchemaFields
          :schema="maskProps.shapeSchema"
          :model-value="maskProps.shapeParams"
          :exclude="['cutout']"
          @update:model-value="emit('update:maskShapeParams', $event)"
        />
      </div>
      <div class="pattern-grid">
        <button
          v-for="(pattern, i) in maskProps.shapePatterns"
          :key="i"
          class="pattern-button"
          :class="{ active: maskProps.selectedShapeIndex === i }"
          @click="emit('update:selectedMaskIndex', i)"
        >
          <MaskPatternThumbnail
            :create-background-spec="maskProps.createBackgroundThumbnailSpec"
            :create-mask-spec="pattern.createSpec"
            :mask-color1="maskProps.outerColor"
            :mask-color2="maskProps.innerColor"
          />
          <span class="pattern-label">{{ pattern.label }}</span>
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.effector-settings {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* ============================================== */
/* Effect Styles */
/* ============================================== */

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

/* ============================================== */
/* Mask Styles */
/* ============================================== */

.shape-params {
  padding: 0.5rem 0;
  border-bottom: 1px solid oklch(0.90 0.01 260);
}

:global(.dark) .shape-params {
  border-bottom-color: oklch(0.22 0.02 260);
}

.pattern-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.pattern-button {
  display: flex;
  flex-direction: column;
  width: 100%;
  border: 2px solid oklch(0.85 0.01 260);
  border-radius: 0.5rem;
  background: transparent;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

:global(.dark) .pattern-button {
  border-color: oklch(0.30 0.02 260);
}

.pattern-button:hover {
  border-color: oklch(0.75 0.01 260);
}

:global(.dark) .pattern-button:hover {
  border-color: oklch(0.40 0.02 260);
}

.pattern-button.active {
  border-color: oklch(0.55 0.20 250);
  background: oklch(0.55 0.20 250 / 0.1);
}

.pattern-label {
  padding: 0.375rem 0.5rem;
  font-size: 0.75rem;
  color: oklch(0.40 0.02 260);
  text-align: left;
}

:global(.dark) .pattern-label {
  color: oklch(0.70 0.02 260);
}
</style>
