<script setup lang="ts">
import { computed } from 'vue'
import {
  VignetteBaseSchema,
  VignetteShapeSchemas,
  ChromaticAberrationEffectSchema,
  DotHalftoneEffectSchema,
  LineHalftoneEffectSchema,
  BlurBaseSchema,
  BlurMaskShapeSchemas,
  migrateVignetteConfig,
  migrateBlurConfig,
  createVignetteConfigForShape,
  createBlurConfigForShape,
  type VignetteShape,
  type VignetteConfig,
  type BlurMaskShape,
  type BlurConfig,
} from '../../../modules/HeroScene'
import SchemaFields from '../../SchemaFields.vue'

export type FilterType = 'void' | 'vignette' | 'chromaticAberration' | 'dotHalftone' | 'lineHalftone' | 'blur'

const props = defineProps<{
  selectedFilterType: FilterType
  vignetteConfig: Record<string, unknown>
  chromaticConfig: Record<string, unknown>
  dotHalftoneConfig: Record<string, unknown>
  lineHalftoneConfig: Record<string, unknown>
  blurConfig: Record<string, unknown>
}>()

const emit = defineEmits<{
  'update:selectedFilterType': [value: FilterType]
  'update:vignetteConfig': [value: Record<string, unknown>]
  'update:chromaticConfig': [value: Record<string, unknown>]
  'update:dotHalftoneConfig': [value: Record<string, unknown>]
  'update:lineHalftoneConfig': [value: Record<string, unknown>]
  'update:blurConfig': [value: Record<string, unknown>]
}>()

// Migrate legacy config to new format
const migratedVignetteConfig = computed<VignetteConfig>(() =>
  migrateVignetteConfig(props.vignetteConfig as unknown as VignetteConfig)
)

// Migrate legacy blur config to new format
const migratedBlurConfig = computed<BlurConfig>(() =>
  migrateBlurConfig(props.blurConfig as unknown as BlurConfig)
)

const handleFilterTypeChange = (type: FilterType) => {
  emit('update:selectedFilterType', type)
}

// Get shape-specific schema based on current vignette shape
const vignetteShapeSchema = computed(() => {
  const shape = migratedVignetteConfig.value.shape as VignetteShape
  return VignetteShapeSchemas[shape] ?? VignetteShapeSchemas.ellipse
})

// Extract shape-specific params for SchemaFields
const vignetteShapeParams = computed(() => {
  const { enabled, shape, intensity, softness, color, ...shapeParams } = migratedVignetteConfig.value
  return shapeParams
})

// Handle vignette base params update
const handleVignetteBaseUpdate = (update: Record<string, unknown>) => {
  // Check if shape is changing
  if ('shape' in update && update.shape !== migratedVignetteConfig.value.shape) {
    // Create new config with proper defaults for the new shape
    const newConfig = createVignetteConfigForShape(
      update.shape as VignetteShape,
      migratedVignetteConfig.value
    )
    emit('update:vignetteConfig', { ...newConfig, ...update })
  } else {
    emit('update:vignetteConfig', { ...migratedVignetteConfig.value, ...update })
  }
}

// Handle vignette shape-specific params update
const handleVignetteShapeUpdate = (update: Record<string, unknown>) => {
  emit('update:vignetteConfig', { ...migratedVignetteConfig.value, ...update })
}

// Get mask-shape-specific schema based on current blur mask shape
const blurMaskShapeSchema = computed(() => {
  const maskShape = migratedBlurConfig.value.maskShape as BlurMaskShape
  if (maskShape === 'none') return null
  return BlurMaskShapeSchemas[maskShape] ?? null
})

// Extract mask-shape-specific params for SchemaFields
const blurMaskShapeParams = computed(() => {
  const { enabled, radius, maskShape, invert, ...shapeParams } = migratedBlurConfig.value
  return shapeParams
})

// Handle blur base params update
const handleBlurBaseUpdate = (update: Record<string, unknown>) => {
  // Check if maskShape is changing
  if ('maskShape' in update && update.maskShape !== migratedBlurConfig.value.maskShape) {
    // Create new config with proper defaults for the new shape
    const newConfig = createBlurConfigForShape(
      update.maskShape as BlurMaskShape,
      migratedBlurConfig.value
    )
    emit('update:blurConfig', { ...newConfig, ...update })
  } else {
    emit('update:blurConfig', { ...migratedBlurConfig.value, ...update })
  }
}

// Handle blur mask-shape-specific params update
const handleBlurMaskShapeUpdate = (update: Record<string, unknown>) => {
  emit('update:blurConfig', { ...migratedBlurConfig.value, ...update })
}

// Color handling utilities
const vignetteColorHex = computed(() => {
  const [r, g, b] = migratedVignetteConfig.value.color
  return `#${Math.round(r * 255).toString(16).padStart(2, '0')}${Math.round(g * 255).toString(16).padStart(2, '0')}${Math.round(b * 255).toString(16).padStart(2, '0')}`
})

const handleColorChange = (event: Event) => {
  const hex = (event.target as HTMLInputElement).value
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const a = migratedVignetteConfig.value.color[3]
  emit('update:vignetteConfig', { ...migratedVignetteConfig.value, color: [r, g, b, a] })
}
</script>

<template>
  <div class="processor-settings">
    <!-- Effect params (shown when effect is active) -->
    <div v-if="selectedFilterType === 'vignette'" class="filter-params">
      <!-- Base vignette params (shape, intensity, softness) -->
      <SchemaFields
        :schema="VignetteBaseSchema"
        :model-value="vignetteConfig as Record<string, unknown>"
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
    <div v-else-if="selectedFilterType === 'blur'" class="filter-params">
      <!-- Base blur params (radius, maskShape, invert) -->
      <SchemaFields
        :schema="BlurBaseSchema"
        :model-value="blurConfig as Record<string, unknown>"
        :exclude="['enabled']"
        @update:model-value="handleBlurBaseUpdate"
      />
      <!-- Mask-shape-specific params -->
      <SchemaFields
        v-if="blurMaskShapeSchema"
        :schema="blurMaskShapeSchema"
        :model-value="blurMaskShapeParams"
        @update:model-value="handleBlurMaskShapeUpdate"
      />
    </div>

    <!-- Filter type selection -->
    <div class="filter-options">
      <label class="filter-option" :class="{ active: selectedFilterType === 'void' }">
        <input
          type="radio"
          name="filter-type"
          :checked="selectedFilterType === 'void'"
          @change="handleFilterTypeChange('void')"
        />
        <span class="filter-name">None</span>
      </label>
      <label class="filter-option" :class="{ active: selectedFilterType === 'vignette' }">
        <input
          type="radio"
          name="filter-type"
          :checked="selectedFilterType === 'vignette'"
          @change="handleFilterTypeChange('vignette')"
        />
        <span class="filter-name">Vignette</span>
      </label>
      <label class="filter-option" :class="{ active: selectedFilterType === 'chromaticAberration' }">
        <input
          type="radio"
          name="filter-type"
          :checked="selectedFilterType === 'chromaticAberration'"
          @change="handleFilterTypeChange('chromaticAberration')"
        />
        <span class="filter-name">Chromatic Aberration</span>
      </label>
      <label class="filter-option" :class="{ active: selectedFilterType === 'dotHalftone' }">
        <input
          type="radio"
          name="filter-type"
          :checked="selectedFilterType === 'dotHalftone'"
          @change="handleFilterTypeChange('dotHalftone')"
        />
        <span class="filter-name">Dot Halftone</span>
      </label>
      <label class="filter-option" :class="{ active: selectedFilterType === 'lineHalftone' }">
        <input
          type="radio"
          name="filter-type"
          :checked="selectedFilterType === 'lineHalftone'"
          @change="handleFilterTypeChange('lineHalftone')"
        />
        <span class="filter-name">Line Halftone</span>
      </label>
      <label class="filter-option" :class="{ active: selectedFilterType === 'blur' }">
        <input
          type="radio"
          name="filter-type"
          :checked="selectedFilterType === 'blur'"
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
