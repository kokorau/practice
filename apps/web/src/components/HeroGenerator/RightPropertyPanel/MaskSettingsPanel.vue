<script setup lang="ts">
import { computed } from 'vue'
import type { RGBA, MaskPattern } from '@practice/texture'
import type { ObjectSchema } from '@practice/schema'
import type { HeroViewConfig, MaskShapeConfig, MaskProcessorConfig } from '../../../modules/HeroScene'
import type { PrimitivePalette } from '../../../modules/SemanticColorPalette/Domain'
import SchemaFields from '../../SchemaFields.vue'
import MaskPatternThumbnail, {
  type BackgroundSpecCreator,
  type MaskSpecCreator,
} from '../MaskPatternThumbnail.vue'
import HeroPreviewThumbnail from '../HeroPreviewThumbnail.vue'

export interface MaskPatternItem {
  label: string
  createSpec: MaskSpecCreator
  /** Mask config for hero preview mode */
  maskConfig?: MaskPattern['maskConfig']
}

const props = defineProps<{
  maskPatterns: MaskPatternItem[]
  selectedMaskIndex: number | null
  maskShapeSchema: ObjectSchema | null
  maskShapeParams: Record<string, unknown> | null
  maskOuterColor: RGBA
  maskInnerColor: RGBA
  createBackgroundThumbnailSpec: BackgroundSpecCreator
  // Hero preview mode
  previewMode?: 'mask' | 'hero'
  baseConfig?: HeroViewConfig
  palette?: PrimitivePalette
}>()

const emit = defineEmits<{
  'update:selectedMaskIndex': [value: number]
  'update:maskShapeParams': [value: Record<string, unknown>]
}>()

// Check if hero preview mode is enabled
const isHeroMode = computed(() => props.previewMode === 'hero' && props.baseConfig && props.palette)

/**
 * Create a preview config with a specific mask shape
 * Updates only the surface layer's mask shape, keeping all other layers for composite preview
 */
const createMaskPreviewConfig = (base: HeroViewConfig, shape: MaskShapeConfig): HeroViewConfig => {
  return {
    ...base,
    layers: base.layers.map(layer => {
      // Only update mask shape for surface layers
      if (layer.type === 'surface') {
        return {
          ...layer,
          processors: layer.processors.map(p => {
            if (p.type === 'mask') {
              return { ...p, shape } as MaskProcessorConfig
            }
            return p
          }),
        }
      }
      return layer
    }),
  }
}

// Preview configs for each pattern (hero mode only)
const previewConfigs = computed(() => {
  if (!props.baseConfig) return null

  return props.maskPatterns.map(pattern => {
    if (pattern.maskConfig) {
      // Convert @practice/texture MaskShapeConfig to HeroViewConfig MaskShapeConfig
      // by ensuring cutout has a default value
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
  <div class="processor-settings">
    <!-- Shape params (shown when mask is selected) -->
    <div v-if="maskShapeSchema && maskShapeParams" class="shape-params">
      <SchemaFields
        :schema="maskShapeSchema"
        :model-value="maskShapeParams"
        :exclude="['cutout']"
        @update:model-value="emit('update:maskShapeParams', $event)"
      />
    </div>
    <div class="pattern-grid">
      <button
        v-for="(pattern, i) in maskPatterns"
        :key="i"
        class="pattern-button"
        :class="{ active: selectedMaskIndex === i }"
        @click="emit('update:selectedMaskIndex', i)"
      >
        <HeroPreviewThumbnail
          v-if="isHeroMode && previewConfigs && previewConfigs[i] && palette"
          :config="previewConfigs[i]!"
          :palette="palette"
        />
        <MaskPatternThumbnail
          v-else
          :create-background-spec="createBackgroundThumbnailSpec"
          :create-mask-spec="pattern.createSpec"
          :mask-color1="maskOuterColor"
          :mask-color2="maskInnerColor"
        />
        <span class="pattern-label">{{ pattern.label }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.processor-settings {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.shape-params {
  padding: 0.5rem 0;
  border-bottom: 1px solid oklch(0.90 0.01 260);
}

:global(.dark) .shape-params {
  border-bottom-color: oklch(0.22 0.02 260);
}

/* Pattern Grid */
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
