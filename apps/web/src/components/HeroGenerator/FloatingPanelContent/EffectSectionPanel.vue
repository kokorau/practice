<script setup lang="ts">
/**
 * EffectSectionPanel
 *
 * エフェクト設定パネルのコンテンツ
 *
 * @deprecated Use EffectorSectionPanel instead
 * This component is kept for backward compatibility
 */
import { computed, type WritableComputedRef } from 'vue'
import SchemaFields from '../../SchemaFields.vue'
import HeroPreviewThumbnail from '../HeroPreviewThumbnail.vue'
import {
  VignetteBaseSchema,
  ChromaticAberrationEffectSchema,
  DotHalftoneEffectSchema,
  LineHalftoneEffectSchema,
  BlurEffectSchema,
  createDefaultEffectConfig,
  extractEnabledEffects,
  type FilterType,
  type LayerNodeConfig,
  type GroupLayerNodeConfig,
  type ProcessorNodeConfig,
} from '@practice/section-visual'
import type { HeroViewConfig, LayerEffectConfig } from '@practice/section-visual'
import type { PrimitivePalette } from '@practice/semantic-color-palette/Domain'
import type {
  VignetteConfigParams,
  ChromaticConfigParams,
  DotHalftoneConfigParams,
  LineHalftoneConfigParams,
  BlurConfigParams,
  PixelateConfigParams,
  HexagonMosaicConfigParams,
  VoronoiMosaicConfigParams,
} from '../../../composables/useFilterEditor'
import { useVignetteEditor } from '../../../composables/useVignetteEditor'

/** Filter props object - WritableComputedRef for direct binding */
interface FilterProps {
  selectedType: WritableComputedRef<FilterType>
  vignetteConfig: WritableComputedRef<VignetteConfigParams>
  chromaticConfig: WritableComputedRef<ChromaticConfigParams>
  dotHalftoneConfig: WritableComputedRef<DotHalftoneConfigParams>
  lineHalftoneConfig: WritableComputedRef<LineHalftoneConfigParams>
  blurConfig: WritableComputedRef<BlurConfigParams>
  pixelateConfig?: WritableComputedRef<PixelateConfigParams>
  hexagonMosaicConfig?: WritableComputedRef<HexagonMosaicConfigParams>
  voronoiMosaicConfig?: WritableComputedRef<VoronoiMosaicConfigParams>
}

const props = defineProps<{
  filter: FilterProps
  // Hero preview props
  baseConfig?: HeroViewConfig
  palette?: PrimitivePalette
  showPreview?: boolean
}>()

// Use vignette editor composable for common vignette logic
const {
  migratedConfig: migratedVignetteConfig,
  shapeSchema: vignetteShapeSchema,
  shapeParams: vignetteShapeParams,
  colorHex: vignetteColorHex,
  handleBaseUpdate: handleVignetteBaseUpdate,
  handleShapeUpdate: handleVignetteShapeUpdate,
  handleColorChange,
} = useVignetteEditor({ vignetteConfig: props.filter.vignetteConfig })

/**
 * Update processor modifiers with effects
 */
const updateProcessorWithEffects = (
  layers: LayerNodeConfig[],
  effects: LayerEffectConfig
): LayerNodeConfig[] => {
  const effectConfigs = extractEnabledEffects(effects)

  return layers.map(layer => {
    // Find processor in background-group or at root level
    if (layer.type === 'group' && layer.id === 'background-group') {
      const group = layer as GroupLayerNodeConfig
      return {
        ...group,
        children: group.children.map(child => {
          if (child.type === 'processor') {
            const processor = child as ProcessorNodeConfig
            // Keep non-effect modifiers (like masks), replace effects
            const nonEffectModifiers = processor.modifiers.filter(m => m.type !== 'effect')
            return {
              ...processor,
              modifiers: [...effectConfigs, ...nonEffectModifiers],
            }
          }
          return child
        }),
      }
    }
    // Handle root-level processors (like bg-processor)
    if (layer.type === 'processor' && layer.id === 'bg-processor') {
      const processor = layer as ProcessorNodeConfig
      const nonEffectModifiers = processor.modifiers.filter(m => m.type !== 'effect')
      return {
        ...processor,
        modifiers: [...effectConfigs, ...nonEffectModifiers],
      }
    }
    return layer
  })
}

/**
 * Create a config with specific effect enabled
 */
const createEffectPreviewConfig = (
  base: HeroViewConfig,
  effectType: FilterType,
  effectConfig?: LayerEffectConfig
): HeroViewConfig => {
  const defaultEffects = createDefaultEffectConfig()

  // Create effects config based on type
  const effects: LayerEffectConfig = {
    vignette: { ...defaultEffects.vignette, enabled: effectType === 'vignette' },
    chromaticAberration: { ...defaultEffects.chromaticAberration, enabled: effectType === 'chromaticAberration' },
    dotHalftone: { ...defaultEffects.dotHalftone, enabled: effectType === 'dotHalftone' },
    lineHalftone: { ...defaultEffects.lineHalftone, enabled: effectType === 'lineHalftone' },
    blur: { ...defaultEffects.blur, enabled: effectType === 'blur' },
    pixelate: { ...defaultEffects.pixelate, enabled: effectType === 'pixelate' },
    hexagonMosaic: { ...defaultEffects.hexagonMosaic, enabled: effectType === 'hexagonMosaic' },
    voronoiMosaic: { ...defaultEffects.voronoiMosaic, enabled: effectType === 'voronoiMosaic' },
  }

  // Apply current config values if provided
  if (effectConfig) {
    if (effectType === 'vignette') {
      effects.vignette = { ...effectConfig.vignette, enabled: true }
    } else if (effectType === 'chromaticAberration') {
      effects.chromaticAberration = { ...effectConfig.chromaticAberration, enabled: true }
    } else if (effectType === 'dotHalftone') {
      effects.dotHalftone = { ...effectConfig.dotHalftone, enabled: true }
    } else if (effectType === 'lineHalftone') {
      effects.lineHalftone = { ...effectConfig.lineHalftone, enabled: true }
    } else if (effectType === 'blur') {
      effects.blur = { ...effectConfig.blur, enabled: true }
    } else if (effectType === 'pixelate') {
      effects.pixelate = { ...effectConfig.pixelate, enabled: true }
    } else if (effectType === 'hexagonMosaic') {
      effects.hexagonMosaic = { ...effectConfig.hexagonMosaic, enabled: true }
    } else if (effectType === 'voronoiMosaic') {
      effects.voronoiMosaic = { ...effectConfig.voronoiMosaic, enabled: true }
    }
  }

  return {
    ...base,
    layers: updateProcessorWithEffects(base.layers, effects),
  }
}

const defaultEffectsForCurrent = createDefaultEffectConfig()

// Current effect config for preview
const currentEffectConfig = computed((): LayerEffectConfig => ({
  vignette: migratedVignetteConfig.value,
  chromaticAberration: props.filter.chromaticConfig.value as LayerEffectConfig['chromaticAberration'],
  dotHalftone: props.filter.dotHalftoneConfig.value as LayerEffectConfig['dotHalftone'],
  lineHalftone: props.filter.lineHalftoneConfig.value as LayerEffectConfig['lineHalftone'],
  blur: props.filter.blurConfig.value as LayerEffectConfig['blur'],
  pixelate: props.filter.pixelateConfig?.value as LayerEffectConfig['pixelate'] ?? defaultEffectsForCurrent.pixelate,
  hexagonMosaic: props.filter.hexagonMosaicConfig?.value as LayerEffectConfig['hexagonMosaic'] ?? defaultEffectsForCurrent.hexagonMosaic,
  voronoiMosaic: props.filter.voronoiMosaicConfig?.value as LayerEffectConfig['voronoiMosaic'] ?? defaultEffectsForCurrent.voronoiMosaic,
}))

// Preview configs for each effect type
const previewConfigs = computed(() => {
  if (!props.baseConfig) return null

  return {
    void: props.baseConfig,
    vignette: createEffectPreviewConfig(props.baseConfig, 'vignette', currentEffectConfig.value),
    chromaticAberration: createEffectPreviewConfig(props.baseConfig, 'chromaticAberration', currentEffectConfig.value),
    dotHalftone: createEffectPreviewConfig(props.baseConfig, 'dotHalftone', currentEffectConfig.value),
    lineHalftone: createEffectPreviewConfig(props.baseConfig, 'lineHalftone', currentEffectConfig.value),
    blur: createEffectPreviewConfig(props.baseConfig, 'blur', currentEffectConfig.value),
  }
})
</script>

<template>
  <div class="filter-section">
    <!-- Effect params (shown when effect is active) -->
    <div v-if="filter.selectedType.value === 'vignette'" class="filter-params">
      <!-- Base vignette params (shape, intensity, softness) -->
      <SchemaFields
        :schema="VignetteBaseSchema"
        :model-value="filter.vignetteConfig.value as Record<string, unknown>"
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
    <div v-else-if="filter.selectedType.value === 'chromaticAberration'" class="filter-params">
      <SchemaFields
        :schema="ChromaticAberrationEffectSchema"
        :model-value="filter.chromaticConfig.value as Record<string, unknown>"
        :exclude="['enabled']"
        @update:model-value="(v) => filter.chromaticConfig.value = v as ChromaticConfigParams"
      />
    </div>
    <div v-else-if="filter.selectedType.value === 'dotHalftone'" class="filter-params">
      <SchemaFields
        :schema="DotHalftoneEffectSchema"
        :model-value="filter.dotHalftoneConfig.value as Record<string, unknown>"
        :exclude="['enabled']"
        @update:model-value="(v) => filter.dotHalftoneConfig.value = v as DotHalftoneConfigParams"
      />
    </div>
    <div v-else-if="filter.selectedType.value === 'lineHalftone'" class="filter-params">
      <SchemaFields
        :schema="LineHalftoneEffectSchema"
        :model-value="filter.lineHalftoneConfig.value as Record<string, unknown>"
        :exclude="['enabled']"
        @update:model-value="(v) => filter.lineHalftoneConfig.value = v as LineHalftoneConfigParams"
      />
    </div>
    <div v-else-if="filter.selectedType.value === 'blur'" class="filter-params">
      <SchemaFields
        :schema="BlurEffectSchema"
        :model-value="filter.blurConfig.value as Record<string, unknown>"
        :exclude="['enabled']"
        @update:model-value="(v) => filter.blurConfig.value = v as BlurConfigParams"
      />
    </div>

    <!-- Filter type selection -->
    <div class="filter-options">
      <button
        class="filter-option"
        :class="{ active: filter.selectedType.value === 'void' }"
        @click="filter.selectedType.value = 'void'"
      >
        <HeroPreviewThumbnail
          v-if="showPreview && previewConfigs && palette"
          :config="previewConfigs.void"
          :palette="palette"
        />
        <span class="filter-name">None</span>
      </button>
      <button
        class="filter-option"
        :class="{ active: filter.selectedType.value === 'vignette' }"
        @click="filter.selectedType.value = 'vignette'"
      >
        <HeroPreviewThumbnail
          v-if="showPreview && previewConfigs && palette"
          :config="previewConfigs.vignette"
          :palette="palette"
        />
        <span class="filter-name">Vignette</span>
      </button>
      <button
        class="filter-option"
        :class="{ active: filter.selectedType.value === 'chromaticAberration' }"
        @click="filter.selectedType.value = 'chromaticAberration'"
      >
        <HeroPreviewThumbnail
          v-if="showPreview && previewConfigs && palette"
          :config="previewConfigs.chromaticAberration"
          :palette="palette"
        />
        <span class="filter-name">Chromatic Aberration</span>
      </button>
      <button
        class="filter-option"
        :class="{ active: filter.selectedType.value === 'dotHalftone' }"
        @click="filter.selectedType.value = 'dotHalftone'"
      >
        <HeroPreviewThumbnail
          v-if="showPreview && previewConfigs && palette"
          :config="previewConfigs.dotHalftone"
          :palette="palette"
        />
        <span class="filter-name">Dot Halftone</span>
      </button>
      <button
        class="filter-option"
        :class="{ active: filter.selectedType.value === 'lineHalftone' }"
        @click="filter.selectedType.value = 'lineHalftone'"
      >
        <HeroPreviewThumbnail
          v-if="showPreview && previewConfigs && palette"
          :config="previewConfigs.lineHalftone"
          :palette="palette"
        />
        <span class="filter-name">Line Halftone</span>
      </button>
      <button
        class="filter-option"
        :class="{ active: filter.selectedType.value === 'blur' }"
        @click="filter.selectedType.value = 'blur'"
      >
        <HeroPreviewThumbnail
          v-if="showPreview && previewConfigs && palette"
          :config="previewConfigs.blur"
          :palette="palette"
        />
        <span class="filter-name">Blur</span>
      </button>
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
  flex-direction: column;
  width: 100%;
  padding: 0;
  background: transparent;
  border: 2px solid oklch(0.85 0.01 260);
  border-radius: 0.5rem;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.15s, background 0.15s;
}

:global(.dark) .filter-option {
  border-color: oklch(0.30 0.02 260);
}

.filter-option:hover {
  border-color: oklch(0.75 0.01 260);
}

:global(.dark) .filter-option:hover {
  border-color: oklch(0.40 0.02 260);
}

.filter-option.active {
  border-color: oklch(0.55 0.20 250);
  background: oklch(0.55 0.20 250 / 0.1);
}

.filter-name {
  padding: 0.5rem 0.625rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: oklch(0.40 0.02 260);
  text-align: left;
}

:global(.dark) .filter-name {
  color: oklch(0.70 0.02 260);
}

.filter-params {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
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
