<script setup lang="ts">
/**
 * Unified Effector Settings Panel
 *
 * Combines Effect and Mask editing into a single component.
 * Displays different UI based on effectorType prop.
 * Uses PresetSelector for both Effect and Mask type selection with thumbnail previews.
 */
import { computed } from 'vue'
import {
  VignetteBaseSchema,
  ChromaticAberrationEffectSchema,
  DotHalftoneEffectSchema,
  LineHalftoneEffectSchema,
  BlurEffectSchema,
  PixelateEffectSchema,
  HexagonMosaicEffectSchema,
  VoronoiMosaicEffectSchema,
  createSingleEffectConfig,
  type FilterType,
  type SingleEffectConfig,
} from '@practice/section-visual'
import type {
  ChromaticConfigParams,
  DotHalftoneConfigParams,
  LineHalftoneConfigParams,
  BlurConfigParams,
} from '../../../composables/useFilterEditor'
import type { EffectorType, FilterProps, MaskProps } from '../../../composables/useEffectorManager'
import { useVignetteEditor } from '../../../composables/useVignetteEditor'
import SchemaFields from '../../SchemaFields.vue'
import PresetSelector from '../PresetSelector.vue'
import MaskPatternThumbnail from '../MaskPatternThumbnail.vue'
import EffectPatternThumbnail from '../EffectPatternThumbnail.vue'

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
  'update:maskShapeRawValue': [key: string, value: unknown]
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

// Note: handleFilterTypeChange removed - using handleEffectSelect with PresetSelector instead

// ============================================================
// Effect Patterns for PresetSelector
// ============================================================

interface EffectPatternItem {
  label: string
  effectType: FilterType
  /** Pre-built SingleEffectConfig for preview */
  effectConfig: SingleEffectConfig
}

/**
 * Effect patterns with preview configs
 * Each item contains the effect type and a default config for thumbnail preview
 */
const effectPatterns = computed<EffectPatternItem[]>(() => [
  {
    label: 'Vignette',
    effectType: 'vignette' as FilterType,
    effectConfig: createSingleEffectConfig('vignette'),
  },
  {
    label: 'Chromatic Aberration',
    effectType: 'chromaticAberration' as FilterType,
    effectConfig: createSingleEffectConfig('chromaticAberration'),
  },
  {
    label: 'Dot Halftone',
    effectType: 'dotHalftone' as FilterType,
    effectConfig: createSingleEffectConfig('dotHalftone'),
  },
  {
    label: 'Line Halftone',
    effectType: 'lineHalftone' as FilterType,
    effectConfig: createSingleEffectConfig('lineHalftone'),
  },
  {
    label: 'Blur',
    effectType: 'blur' as FilterType,
    effectConfig: createSingleEffectConfig('blur'),
  },
  {
    label: 'Pixelate',
    effectType: 'pixelate' as FilterType,
    effectConfig: createSingleEffectConfig('pixelate'),
  },
  {
    label: 'Hexagon Mosaic',
    effectType: 'hexagonMosaic' as FilterType,
    effectConfig: createSingleEffectConfig('hexagonMosaic'),
  },
  {
    label: 'Voronoi Mosaic',
    effectType: 'voronoiMosaic' as FilterType,
    effectConfig: createSingleEffectConfig('voronoiMosaic'),
  },
])

/**
 * Selected effect index for PresetSelector
 * Returns null when 'void' (None) is selected
 */
const selectedEffectIndex = computed(() => {
  const type = props.filterProps.selectedType.value
  if (type === 'void') return null
  return effectPatterns.value.findIndex(p => p.effectType === type)
})

/**
 * Handle effect selection from PresetSelector
 */
const handleEffectSelect = (index: number | null) => {
  if (index === null) {
    props.filterProps.selectedType.value = 'void'
  } else {
    const pattern = effectPatterns.value[index]
    if (pattern) {
      props.filterProps.selectedType.value = pattern.effectType
    }
  }
}

/**
 * Get the current effect config for the selected effect preview
 */
const currentEffectConfig = computed<SingleEffectConfig | null>(() => {
  const index = selectedEffectIndex.value
  if (index === null || index < 0) return null
  return effectPatterns.value[index]?.effectConfig ?? null
})

/**
 * Check if pipeline preview is available for effect
 */
const canUseEffectPipelinePreview = computed(() => {
  return !!(
    props.maskProps.surface &&
    props.maskProps.palette &&
    currentEffectConfig.value
  )
})

// ============================================================
// Effect Patterns for PresetSelector
// ============================================================

interface EffectPatternItem {
  label: string
  effectType: FilterType
  /** Pre-built SingleEffectConfig for preview */
  effectConfig: SingleEffectConfig
}

/**
 * Effect patterns with preview configs
 * Each item contains the effect type and a default config for thumbnail preview
 */
const effectPatterns = computed<EffectPatternItem[]>(() => [
  {
    label: 'Vignette',
    effectType: 'vignette' as FilterType,
    effectConfig: createSingleEffectConfig('vignette'),
  },
  {
    label: 'Chromatic Aberration',
    effectType: 'chromaticAberration' as FilterType,
    effectConfig: createSingleEffectConfig('chromaticAberration'),
  },
  {
    label: 'Dot Halftone',
    effectType: 'dotHalftone' as FilterType,
    effectConfig: createSingleEffectConfig('dotHalftone'),
  },
  {
    label: 'Line Halftone',
    effectType: 'lineHalftone' as FilterType,
    effectConfig: createSingleEffectConfig('lineHalftone'),
  },
  {
    label: 'Blur',
    effectType: 'blur' as FilterType,
    effectConfig: createSingleEffectConfig('blur'),
  },
])

/**
 * Selected effect index for PresetSelector
 * Returns null when 'void' (None) is selected
 */
const selectedEffectIndex = computed(() => {
  const type = props.filterProps.selectedType.value
  if (type === 'void') return null
  return effectPatterns.value.findIndex(p => p.effectType === type)
})

/**
 * Handle effect selection from PresetSelector
 */
const handleEffectSelect = (index: number | null) => {
  if (index === null) {
    props.filterProps.selectedType.value = 'void'
  } else {
    const pattern = effectPatterns.value[index]
    if (pattern) {
      props.filterProps.selectedType.value = pattern.effectType
    }
  }
}

/**
 * Get the current effect config for the selected effect preview
 */
const currentEffectConfig = computed<SingleEffectConfig | null>(() => {
  const index = selectedEffectIndex.value
  if (index === null || index < 0) return null
  return effectPatterns.value[index]?.effectConfig ?? null
})

/**
 * Check if pipeline preview is available for effect
 */
const canUseEffectPipelinePreview = computed(() => {
  return !!(
    props.maskProps.surface &&
    props.maskProps.palette &&
    currentEffectConfig.value
  )
})

// ============================================================
// Mask Preview (for pipeline-based mini preview)
// ============================================================

/**
 * Get the current mask config for preview
 */
const currentMaskConfig = computed(() => {
  if (props.maskProps.selectedShapeIndex === null) return null
  return props.maskProps.shapePatternsWithConfig?.[props.maskProps.selectedShapeIndex]?.maskConfig ?? null
})

/**
 * Check if pipeline preview is available
 */
const canUsePipelinePreview = computed(() => {
  return !!(
    props.maskProps.surface &&
    props.maskProps.processor &&
    props.maskProps.palette &&
    currentMaskConfig.value
  )
})
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
      <div v-else-if="filterProps.selectedType.value === 'pixelate'" class="filter-params">
        <SchemaFields
          :schema="PixelateEffectSchema"
          :model-value="filterProps.pixelateConfig?.value as Record<string, unknown>"
          :exclude="['enabled']"
          @update:model-value="(v) => { if (filterProps.pixelateConfig) filterProps.pixelateConfig.value = v as Record<string, unknown> }"
        />
      </div>
      <div v-else-if="filterProps.selectedType.value === 'hexagonMosaic'" class="filter-params">
        <SchemaFields
          :schema="HexagonMosaicEffectSchema"
          :model-value="filterProps.hexagonMosaicConfig?.value as Record<string, unknown>"
          :exclude="['enabled']"
          @update:model-value="(v) => { if (filterProps.hexagonMosaicConfig) filterProps.hexagonMosaicConfig.value = v as Record<string, unknown> }"
        />
      </div>
      <div v-else-if="filterProps.selectedType.value === 'voronoiMosaic'" class="filter-params">
        <SchemaFields
          :schema="VoronoiMosaicEffectSchema"
          :model-value="filterProps.voronoiMosaicConfig?.value as Record<string, unknown>"
          :exclude="['enabled']"
          @update:model-value="(v) => { if (filterProps.voronoiMosaicConfig) filterProps.voronoiMosaicConfig.value = v as Record<string, unknown> }"
        />
      </div>

      <!-- Effect type selection with PresetSelector -->
      <PresetSelector
        label="Effect"
        :items="effectPatterns"
        :selected-index="selectedEffectIndex"
        :show-null-option="true"
        null-label="None"
        @select="handleEffectSelect"
      >
        <template #selected>
          <EffectPatternThumbnail
            v-if="canUseEffectPipelinePreview && currentEffectConfig"
            :surface="maskProps.surface"
            :preview-effect="currentEffectConfig"
            :palette="maskProps.palette"
          />
        </template>
        <template #item="{ item }">
          <EffectPatternThumbnail
            v-if="maskProps.surface && maskProps.palette"
            :surface="maskProps.surface"
            :preview-effect="(item as EffectPatternItem).effectConfig"
            :palette="maskProps.palette"
          />
        </template>
        <template #null>
          <div class="effect-none-preview">
            <span class="effect-none-text">No Effect</span>
          </div>
        </template>
      </PresetSelector>
    </template>

    <!-- ============================================== -->
    <!-- Mask Settings (when effectorType === 'mask') -->
    <!-- ============================================== -->
    <template v-else-if="effectorType === 'mask'">
      <!-- Mini Preview (shows current mask result) -->
      <div v-if="canUsePipelinePreview" class="mini-preview-section">
        <MaskPatternThumbnail
          :surface="maskProps.surface"
          :processor="maskProps.processor"
          :preview-mask="currentMaskConfig ?? undefined"
          :palette="maskProps.palette"
          :create-background-spec="maskProps.createBackgroundThumbnailSpec"
          :create-mask-spec="maskProps.shapePatterns[maskProps.selectedShapeIndex!]?.createSpec"
          :mask-color1="maskProps.outerColor"
          :mask-color2="maskProps.innerColor"
          :preceding-effect-specs="maskProps.precedingEffectSpecs"
        />
      </div>
      <!-- Shape params (shown when mask is selected) -->
      <div v-if="maskProps.shapeSchema && maskProps.shapeParams" class="shape-params">
        <SchemaFields
          :schema="maskProps.shapeSchema"
          :model-value="maskProps.shapeParams"
          :raw-params="maskProps.rawShapeParams"
          :exclude="['cutout']"
          @update:model-value="emit('update:maskShapeParams', $event)"
          @update:raw-value="(key, value) => emit('update:maskShapeRawValue', key, value)"
        />
      </div>
      <PresetSelector
        label="Shape"
        :items="maskProps.shapePatternsWithConfig ?? maskProps.shapePatterns"
        :selected-index="maskProps.selectedShapeIndex"
        @select="(index) => index !== null && emit('update:selectedMaskIndex', index)"
      >
        <template #selected>
          <MaskPatternThumbnail
            v-if="maskProps.selectedShapeIndex !== null && (maskProps.shapePatternsWithConfig ?? maskProps.shapePatterns)[maskProps.selectedShapeIndex]"
            :surface="maskProps.surface"
            :processor="maskProps.processor"
            :preview-mask="maskProps.shapePatternsWithConfig?.[maskProps.selectedShapeIndex]?.maskConfig"
            :palette="maskProps.palette"
            :create-background-spec="maskProps.createBackgroundThumbnailSpec"
            :create-mask-spec="maskProps.shapePatterns[maskProps.selectedShapeIndex]!.createSpec"
            :mask-color1="maskProps.outerColor"
            :mask-color2="maskProps.innerColor"
            :preceding-effect-specs="maskProps.precedingEffectSpecs"
          />
        </template>
        <template #item="{ item, index }">
          <MaskPatternThumbnail
            :surface="maskProps.surface"
            :processor="maskProps.processor"
            :preview-mask="maskProps.shapePatternsWithConfig?.[index]?.maskConfig"
            :palette="maskProps.palette"
            :create-background-spec="maskProps.createBackgroundThumbnailSpec"
            :create-mask-spec="item.createSpec"
            :mask-color1="maskProps.outerColor"
            :mask-color2="maskProps.innerColor"
            :preceding-effect-specs="maskProps.precedingEffectSpecs"
          />
        </template>
      </PresetSelector>
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

/* Effect none preview (for PresetSelector null option) */
.effect-none-preview {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: oklch(0.94 0.01 260);
}

:global(.dark) .effect-none-preview {
  background: oklch(0.18 0.02 260);
}

.effect-none-text {
  font-size: 0.625rem;
  color: oklch(0.50 0.02 260);
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

:global(.dark) .effect-none-text {
  color: oklch(0.55 0.02 260);
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

.mini-preview-section {
  width: 100%;
  height: 4rem;
  border-radius: 0.375rem;
  overflow: hidden;
  background: oklch(0.95 0.01 260);
}

:global(.dark) .mini-preview-section {
  background: oklch(0.18 0.02 260);
}

.mini-preview-section :deep(canvas) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.shape-params {
  padding: 0.5rem 0;
  border-bottom: 1px solid oklch(0.90 0.01 260);
}

:global(.dark) .shape-params {
  border-bottom-color: oklch(0.22 0.02 260);
}
</style>
