<script setup lang="ts">
/**
 * ClipGroupShapePanel
 *
 * クリップグループ形状選択パネルのコンテンツ
 *
 * previewMode:
 * - 'mask': 従来のMaskPatternThumbnailを使用
 * - 'hero': HeroPreviewThumbnailで完全なHeroViewプレビューを表示
 */
import { computed } from 'vue'
import type { ObjectSchema } from '@practice/schema'
import type { MaskPattern, TextureRenderSpec, RGBA } from '@practice/texture'
import SchemaFields from '../../SchemaFields.vue'
import MaskPatternThumbnail from '../MaskPatternThumbnail.vue'
import HeroPreviewThumbnail from '../HeroPreviewThumbnail.vue'
import type { HeroViewConfig, MaskShapeConfig, MaskProcessorConfig } from '../../../modules/HeroScene'
import type { PrimitivePalette } from '../../../modules/SemanticColorPalette/Domain'

const props = defineProps<{
  // Shape params
  shapeSchema: ObjectSchema | null
  shapeParams: Record<string, unknown> | null
  // Patterns
  patterns: MaskPattern[]
  selectedIndex: number | null
  // Colors for thumbnail
  maskOuterColor: RGBA
  maskInnerColor: RGBA
  // Background thumbnail spec creator
  createBackgroundThumbnailSpec: (viewport: { width: number; height: number }) => TextureRenderSpec | null
  // Hero preview mode
  previewMode?: 'mask' | 'hero'
  baseConfig?: HeroViewConfig
  palette?: PrimitivePalette
}>()

const emit = defineEmits<{
  (e: 'update:shapeParams', value: Record<string, unknown>): void
  (e: 'update:selectedIndex', value: number): void
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

  return props.patterns.map(pattern => {
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
  <!-- Shape params (shown when mask is selected) -->
  <div v-if="shapeSchema && shapeParams" class="shape-params">
    <SchemaFields
      :schema="shapeSchema"
      :model-value="shapeParams"
      :exclude="['cutout']"
      @update:model-value="emit('update:shapeParams', $event)"
    />
  </div>
  <div class="pattern-grid">
    <button
      v-for="(pattern, i) in patterns"
      :key="i"
      class="pattern-button"
      :class="{ active: selectedIndex === i }"
      @click="emit('update:selectedIndex', i)"
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
</template>

<style scoped>
.shape-params {
  padding: 0.75rem;
  background: oklch(0.94 0.01 260);
  border-radius: 0.5rem;
  margin-bottom: 0.75rem;
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
</style>
