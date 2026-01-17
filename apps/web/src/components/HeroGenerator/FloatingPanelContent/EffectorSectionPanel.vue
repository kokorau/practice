<script setup lang="ts">
/**
 * EffectorSectionPanel
 *
 * Effect/Mask統合設定パネル
 * タブ切り替えでEffect設定とMask Shape設定を切り替え
 */
import { computed } from 'vue'
import type { MaskPattern } from '@practice/texture'
import SchemaFields from '../../SchemaFields.vue'
import MaskPatternThumbnail from '../MaskPatternThumbnail.vue'
import HeroPreviewThumbnail from '../HeroPreviewThumbnail.vue'
import {
  VignetteBaseSchema,
  ChromaticAberrationEffectSchema,
  DotHalftoneEffectSchema,
  LineHalftoneEffectSchema,
  BlurEffectSchema,
  createDefaultEffectConfig,
  getLayerFilters,
  type FilterType,
  type HeroViewConfig,
  type LayerEffectConfig,
  type MaskShapeConfig,
  type MaskProcessorConfig,
} from '../../../modules/HeroScene'
import type { PrimitivePalette } from '../../../modules/SemanticColorPalette/Domain'
import type {
  ChromaticConfigParams,
  DotHalftoneConfigParams,
  LineHalftoneConfigParams,
  BlurConfigParams,
} from '../../../composables/useFilterEditor'
import type { EffectorType, FilterProps, MaskProps } from '../../../composables/useEffectorManager'
import { useVignetteEditor } from '../../../composables/useVignetteEditor'

// ============================================================
// Props
// ============================================================

const props = defineProps<{
  /** Current effector type tab */
  effectorType: EffectorType
  /** Filter props for effect editing */
  filterProps: FilterProps
  /** Mask props for mask editing */
  maskProps: MaskProps
  /** Mask patterns for shape selection */
  maskPatterns: MaskPattern[]
  // Hero preview props
  baseConfig?: HeroViewConfig
  palette?: PrimitivePalette
  showPreview?: boolean
}>()

// ============================================================
// Emits
// ============================================================

const emit = defineEmits<{
  'update:effectorType': [value: EffectorType]
  'update:selectedMaskIndex': [value: number]
  'update:maskShapeParams': [value: Record<string, unknown>]
}>()

// ============================================================
// Effect Logic (from EffectSectionPanel)
// ============================================================

const {
  migratedConfig: migratedVignetteConfig,
  shapeSchema: vignetteShapeSchema,
  shapeParams: vignetteShapeParams,
  colorHex: vignetteColorHex,
  handleBaseUpdate: handleVignetteBaseUpdate,
  handleShapeUpdate: handleVignetteShapeUpdate,
  handleColorChange,
} = useVignetteEditor({ vignetteConfig: props.filterProps.vignetteConfig })

/**
 * Create a config with specific effect enabled
 */
const createEffectPreviewConfig = (
  base: HeroViewConfig,
  effectType: FilterType,
  effectConfig?: LayerEffectConfig
): HeroViewConfig => {
  const defaultEffects = createDefaultEffectConfig()

  const effects: LayerEffectConfig = {
    vignette: { ...defaultEffects.vignette, enabled: effectType === 'vignette' },
    chromaticAberration: { ...defaultEffects.chromaticAberration, enabled: effectType === 'chromaticAberration' },
    dotHalftone: { ...defaultEffects.dotHalftone, enabled: effectType === 'dotHalftone' },
    lineHalftone: { ...defaultEffects.lineHalftone, enabled: effectType === 'lineHalftone' },
    blur: { ...defaultEffects.blur, enabled: effectType === 'blur' },
    pixelation: { ...defaultEffects.pixelation, enabled: effectType === 'pixelation' },
  }

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
    } else if (effectType === 'pixelation') {
      effects.pixelation = { ...effectConfig.pixelation, enabled: true }
    }
  }

  return {
    ...base,
    layers: base.layers.map(layer => {
      if (layer.type === 'base') {
        return {
          ...layer,
          filters: getLayerFilters(layer).map(f => {
            if (f.type === 'effect') {
              return { ...f, enabled: true, config: effects }
            }
            return f
          }),
        }
      }
      return layer
    }),
  }
}

const currentEffectConfig = computed((): LayerEffectConfig => ({
  vignette: migratedVignetteConfig.value,
  chromaticAberration: props.filterProps.chromaticConfig.value as LayerEffectConfig['chromaticAberration'],
  dotHalftone: props.filterProps.dotHalftoneConfig.value as LayerEffectConfig['dotHalftone'],
  lineHalftone: props.filterProps.lineHalftoneConfig.value as LayerEffectConfig['lineHalftone'],
  blur: props.filterProps.blurConfig.value as LayerEffectConfig['blur'],
  pixelation: props.filterProps.pixelationConfig.value as LayerEffectConfig['pixelation'],
}))

const effectPreviewConfigs = computed(() => {
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

// ============================================================
// Mask Logic (from ClipGroupShapePanel)
// ============================================================

const isHeroMode = computed(() => props.showPreview && props.baseConfig && props.palette)

const createMaskPreviewConfig = (base: HeroViewConfig, shape: MaskShapeConfig): HeroViewConfig => {
  return {
    ...base,
    layers: base.layers.map(layer => {
      // Update processor nodes that contain mask modifiers
      if (layer.type === 'processor') {
        return {
          ...layer,
          modifiers: layer.modifiers.map(m => {
            if (m.type === 'mask') {
              return { ...m, shape } as MaskProcessorConfig
            }
            return m
          }),
        }
      }
      // Filter out base layer for preview
      if (layer.type === 'base') {
        return null
      }
      return layer
    }).filter((layer): layer is NonNullable<typeof layer> => layer !== null),
  }
}

const maskPreviewConfigs = computed(() => {
  if (!props.baseConfig) return null

  return props.maskPatterns.map(pattern => {
    if (pattern.maskConfig) {
      const shape: MaskShapeConfig = {
        ...pattern.maskConfig,
        cutout: pattern.maskConfig.cutout ?? false,
      } as MaskShapeConfig
      return createMaskPreviewConfig(props.baseConfig!, shape)
    }
    return null
  })
})
</script>

<template>
  <div class="effector-section">
    <!-- Tab Selector -->
    <div class="effector-tabs">
      <button
        class="tab-button"
        :class="{ active: effectorType === 'effect' }"
        @click="emit('update:effectorType', 'effect')"
      >
        Effect
      </button>
      <button
        class="tab-button"
        :class="{ active: effectorType === 'mask' }"
        @click="emit('update:effectorType', 'mask')"
      >
        Mask
      </button>
    </div>

    <!-- Effect Section -->
    <template v-if="effectorType === 'effect'">
      <!-- Effect params -->
      <div v-if="filterProps.selectedType.value === 'vignette'" class="filter-params">
        <SchemaFields
          :schema="VignetteBaseSchema"
          :model-value="filterProps.vignetteConfig.value as Record<string, unknown>"
          :exclude="['enabled']"
          @update:model-value="handleVignetteBaseUpdate"
        />
        <SchemaFields
          :schema="vignetteShapeSchema"
          :model-value="vignetteShapeParams"
          @update:model-value="handleVignetteShapeUpdate"
        />
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

      <!-- Effect type selection -->
      <div class="filter-options">
        <button
          class="filter-option"
          :class="{ active: filterProps.selectedType.value === 'void' }"
          @click="filterProps.selectedType.value = 'void'"
        >
          <HeroPreviewThumbnail
            v-if="showPreview && effectPreviewConfigs && palette"
            :config="effectPreviewConfigs.void"
            :palette="palette"
          />
          <span class="filter-name">None</span>
        </button>
        <button
          class="filter-option"
          :class="{ active: filterProps.selectedType.value === 'vignette' }"
          @click="filterProps.selectedType.value = 'vignette'"
        >
          <HeroPreviewThumbnail
            v-if="showPreview && effectPreviewConfigs && palette"
            :config="effectPreviewConfigs.vignette"
            :palette="palette"
          />
          <span class="filter-name">Vignette</span>
        </button>
        <button
          class="filter-option"
          :class="{ active: filterProps.selectedType.value === 'chromaticAberration' }"
          @click="filterProps.selectedType.value = 'chromaticAberration'"
        >
          <HeroPreviewThumbnail
            v-if="showPreview && effectPreviewConfigs && palette"
            :config="effectPreviewConfigs.chromaticAberration"
            :palette="palette"
          />
          <span class="filter-name">Chromatic Aberration</span>
        </button>
        <button
          class="filter-option"
          :class="{ active: filterProps.selectedType.value === 'dotHalftone' }"
          @click="filterProps.selectedType.value = 'dotHalftone'"
        >
          <HeroPreviewThumbnail
            v-if="showPreview && effectPreviewConfigs && palette"
            :config="effectPreviewConfigs.dotHalftone"
            :palette="palette"
          />
          <span class="filter-name">Dot Halftone</span>
        </button>
        <button
          class="filter-option"
          :class="{ active: filterProps.selectedType.value === 'lineHalftone' }"
          @click="filterProps.selectedType.value = 'lineHalftone'"
        >
          <HeroPreviewThumbnail
            v-if="showPreview && effectPreviewConfigs && palette"
            :config="effectPreviewConfigs.lineHalftone"
            :palette="palette"
          />
          <span class="filter-name">Line Halftone</span>
        </button>
        <button
          class="filter-option"
          :class="{ active: filterProps.selectedType.value === 'blur' }"
          @click="filterProps.selectedType.value = 'blur'"
        >
          <HeroPreviewThumbnail
            v-if="showPreview && effectPreviewConfigs && palette"
            :config="effectPreviewConfigs.blur"
            :palette="palette"
          />
          <span class="filter-name">Blur</span>
        </button>
      </div>
    </template>

    <!-- Mask Section -->
    <template v-else-if="effectorType === 'mask'">
      <!-- Shape params -->
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
          v-for="(pattern, i) in maskPatterns"
          :key="i"
          class="pattern-button"
          :class="{ active: maskProps.selectedShapeIndex === i }"
          @click="emit('update:selectedMaskIndex', i)"
        >
          <HeroPreviewThumbnail
            v-if="isHeroMode && maskPreviewConfigs && maskPreviewConfigs[i] && palette"
            :config="maskPreviewConfigs[i]!"
            :palette="palette"
          />
          <MaskPatternThumbnail
            v-else
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
.effector-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* Tab Selector */
.effector-tabs {
  display: flex;
  gap: 0.25rem;
  padding: 0.25rem;
  background: oklch(0.92 0.01 260);
  border-radius: 0.5rem;
}

:global(.dark) .effector-tabs {
  background: oklch(0.20 0.02 260);
}

.tab-button {
  flex: 1;
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: oklch(0.45 0.02 260);
  background: transparent;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

:global(.dark) .tab-button {
  color: oklch(0.65 0.02 260);
}

.tab-button:hover {
  background: oklch(0.88 0.01 260);
}

:global(.dark) .tab-button:hover {
  background: oklch(0.25 0.02 260);
}

.tab-button.active {
  background: oklch(1.0 0 0);
  color: oklch(0.25 0.02 260);
  box-shadow: 0 1px 3px oklch(0 0 0 / 0.1);
}

:global(.dark) .tab-button.active {
  background: oklch(0.30 0.02 260);
  color: oklch(0.90 0.02 260);
}

/* Effect Styles */
.filter-params {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
  background: oklch(0.94 0.01 260);
  border-radius: 0.5rem;
}

:global(.dark) .filter-params {
  background: oklch(0.18 0.02 260);
}

.filter-options {
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

/* Mask Styles */
.shape-params {
  padding: 0.75rem;
  background: oklch(0.94 0.01 260);
  border-radius: 0.5rem;
}

:global(.dark) .shape-params {
  background: oklch(0.18 0.02 260);
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
