<script setup lang="ts">
/**
 * EffectSectionPanel
 *
 * エフェクト設定パネルのコンテンツ
 */
import { computed } from 'vue'
import SchemaFields from '../../SchemaFields.vue'
import HeroPreviewThumbnail from '../HeroPreviewThumbnail.vue'
import {
  VignetteBaseSchema,
  VignetteShapeSchemas,
  ChromaticAberrationEffectSchema,
  DotHalftoneEffectSchema,
  LineHalftoneEffectSchema,
  BlurEffectSchema,
  createDefaultEffectConfig,
  migrateVignetteConfig,
  type VignetteShape,
  type VignetteConfig,
} from '../../../modules/HeroScene'
import type { HeroViewConfig, LayerEffectConfig } from '../../../modules/HeroScene'
import type { PrimitivePalette } from '../../../modules/SemanticColorPalette/Domain'

export type FilterType = 'void' | 'vignette' | 'chromaticAberration' | 'dotHalftone' | 'lineHalftone' | 'blur'

const props = defineProps<{
  selectedFilterType: FilterType
  vignetteConfig: Record<string, unknown>
  chromaticConfig: Record<string, unknown>
  dotHalftoneConfig: Record<string, unknown>
  lineHalftoneConfig: Record<string, unknown>
  blurConfig: Record<string, unknown>
  // Hero preview props
  baseConfig?: HeroViewConfig
  palette?: PrimitivePalette
  showPreview?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:selectedFilterType', value: FilterType): void
  (e: 'update:vignetteConfig', value: Record<string, unknown>): void
  (e: 'update:chromaticConfig', value: Record<string, unknown>): void
  (e: 'update:dotHalftoneConfig', value: Record<string, unknown>): void
  (e: 'update:lineHalftoneConfig', value: Record<string, unknown>): void
  (e: 'update:blurConfig', value: Record<string, unknown>): void
}>()

// Migrate legacy config to new format
const migratedVignetteConfig = computed<VignetteConfig>(() =>
  migrateVignetteConfig(props.vignetteConfig as unknown as VignetteConfig)
)

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
  emit('update:vignetteConfig', { ...migratedVignetteConfig.value, ...update })
}

// Handle vignette shape-specific params update
const handleVignetteShapeUpdate = (update: Record<string, unknown>) => {
  emit('update:vignetteConfig', { ...migratedVignetteConfig.value, ...update })
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
    }
  }

  return {
    ...base,
    layers: base.layers.map(layer => {
      if (layer.type === 'base') {
        return {
          ...layer,
          processors: (layer.processors ?? []).map(p => {
            if (p.type === 'effect') {
              return { ...p, enabled: true, config: effects }
            }
            return p
          }),
        }
      }
      return layer
    }),
  }
}

// Current effect config for preview
const currentEffectConfig = computed((): LayerEffectConfig => ({
  vignette: migratedVignetteConfig.value,
  chromaticAberration: props.chromaticConfig as LayerEffectConfig['chromaticAberration'],
  dotHalftone: props.dotHalftoneConfig as LayerEffectConfig['dotHalftone'],
  lineHalftone: props.lineHalftoneConfig as LayerEffectConfig['lineHalftone'],
  blur: props.blurConfig as LayerEffectConfig['blur'],
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
      <SchemaFields
        :schema="BlurEffectSchema"
        :model-value="blurConfig"
        :exclude="['enabled']"
        @update:model-value="emit('update:blurConfig', $event)"
      />
    </div>

    <!-- Filter type selection -->
    <div class="filter-options">
      <button
        class="filter-option"
        :class="{ active: selectedFilterType === 'void' }"
        @click="emit('update:selectedFilterType', 'void')"
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
        :class="{ active: selectedFilterType === 'vignette' }"
        @click="emit('update:selectedFilterType', 'vignette')"
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
        :class="{ active: selectedFilterType === 'chromaticAberration' }"
        @click="emit('update:selectedFilterType', 'chromaticAberration')"
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
        :class="{ active: selectedFilterType === 'dotHalftone' }"
        @click="emit('update:selectedFilterType', 'dotHalftone')"
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
        :class="{ active: selectedFilterType === 'lineHalftone' }"
        @click="emit('update:selectedFilterType', 'lineHalftone')"
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
        :class="{ active: selectedFilterType === 'blur' }"
        @click="emit('update:selectedFilterType', 'blur')"
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
