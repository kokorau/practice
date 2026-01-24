<script setup lang="ts">
/**
 * SurfaceSelector
 *
 * 共通のSurface選択UI（テクスチャパターン選択）
 * Background, Mask Surface両方で使用
 *
 * previewMode:
 * - 'pattern': 従来のPatternThumbnailを使用
 * - 'hero': HeroPreview (thumbnail variant) で完全なHeroViewプレビューを表示
 */

import { computed } from 'vue'
import PatternThumbnail, { type SpecCreator } from './PatternThumbnail.vue'
import HeroPreview from './HeroPreview.vue'
import type { HeroViewConfig, AnySurfaceConfig, NormalizedSurfaceConfig, LayerNodeConfig } from '@practice/section-visual'
import { normalizeSurfaceConfig, isNormalizedSurfaceConfig } from '@practice/section-visual'
import type { PrimitivePalette } from '@practice/semantic-color-palette/Domain'

export interface PatternItem {
  label: string
  type?: string
  createSpec: SpecCreator
  /** Surface config for hero preview mode (legacy flat format or normalized) */
  surfaceConfig?: AnySurfaceConfig
}

const emit = defineEmits<{
  'select-pattern': [index: number | null]
}>()

const props = defineProps<{
  // テクスチャパターン
  patterns: PatternItem[]
  selectedIndex: number | null
  // オプション: べた塗りを最初に表示するか
  showSolidOption?: boolean
  // Hero preview mode
  previewMode?: 'pattern' | 'hero'
  baseConfig?: HeroViewConfig
  palette?: PrimitivePalette
  // Target layer type for preview ('base' for Background, 'surface' for Main Group)
  targetLayerType?: 'base' | 'surface'
}>()

const handleSelectPattern = (index: number | null) => {
  emit('select-pattern', index)
}

// Check if hero preview mode is enabled
const isHeroMode = computed(() => props.previewMode === 'hero' && props.baseConfig && props.palette)

/**
 * Create a preview config with a specific surface
 * Filters to show only the target layer type
 */
const createSurfacePreviewConfig = (base: HeroViewConfig, surface: NormalizedSurfaceConfig): HeroViewConfig => {
  const targetType = props.targetLayerType ?? 'base'

  return {
    ...base,
    layers: base.layers
      .filter(layer => layer.type === targetType)
      .map(layer => ({ ...layer, surface }) as LayerNodeConfig),
  }
}

// Preview configs for each pattern (hero mode only)
const previewConfigs = computed(() => {
  if (!props.baseConfig) return null

  const configs: (HeroViewConfig | null)[] = props.patterns.map(pattern => {
    if (pattern.surfaceConfig) {
      // Convert to normalized format if legacy flat format
      const normalized = isNormalizedSurfaceConfig(pattern.surfaceConfig)
        ? pattern.surfaceConfig
        : normalizeSurfaceConfig(pattern.surfaceConfig)
      return createSurfacePreviewConfig(props.baseConfig!, normalized)
    }
    return null
  })

  return configs
})

// Solid preview config (hero mode only)
const solidPreviewConfig = computed(() => {
  if (!props.baseConfig) return null
  return createSurfacePreviewConfig(props.baseConfig, { id: 'solid', params: {} })
})
</script>

<template>
  <div class="surface-selector">
    <!-- テクスチャパターン -->
    <div class="pattern-grid">
      <!-- べた塗り (オプション) -->
      <button
        v-if="showSolidOption"
        class="pattern-button"
        :class="{ active: selectedIndex === null }"
        @click="handleSelectPattern(null)"
      >
        <HeroPreview
          v-if="isHeroMode && solidPreviewConfig && palette"
          variant="thumbnail"
          :config="solidPreviewConfig"
          :palette="palette"
        />
        <span v-else class="pattern-none">Solid</span>
        <span class="pattern-label">べた塗り</span>
      </button>

      <!-- パターン -->
      <button
        v-for="(pattern, i) in patterns"
        :key="i"
        class="pattern-button"
        :class="{ active: selectedIndex === i }"
        @click="handleSelectPattern(i)"
      >
        <HeroPreview
          v-if="isHeroMode && previewConfigs && previewConfigs[i] && palette"
          variant="thumbnail"
          :config="previewConfigs[i]!"
          :palette="palette"
        />
        <PatternThumbnail v-else :create-spec="pattern.createSpec" />
        <span class="pattern-label">{{ pattern.label }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
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

.pattern-button:hover:not(:disabled) {
  border-color: oklch(0.75 0.01 260);
}

:global(.dark) .pattern-button:hover:not(:disabled) {
  border-color: oklch(0.40 0.02 260);
}

.pattern-button.active {
  border-color: oklch(0.55 0.20 250);
  background: oklch(0.55 0.20 250 / 0.1);
}

.pattern-none {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: oklch(0.92 0.01 260);
  color: oklch(0.50 0.02 260);
  font-size: 0.875rem;
}

:global(.dark) .pattern-none {
  background: oklch(0.22 0.02 260);
  color: oklch(0.60 0.02 260);
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
