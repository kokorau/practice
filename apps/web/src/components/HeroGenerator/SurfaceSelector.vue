<script setup lang="ts">
/**
 * SurfaceSelector
 *
 * 共通のSurface選択UI（画像アップロード + テクスチャパターン）
 * Background, Mask Surface両方で使用
 *
 * previewMode:
 * - 'pattern': 従来のPatternThumbnailを使用
 * - 'hero': HeroPreviewThumbnailで完全なHeroViewプレビューを表示
 */

import { computed } from 'vue'
import PatternThumbnail, { type SpecCreator } from './PatternThumbnail.vue'
import HeroPreviewThumbnail from './HeroPreviewThumbnail.vue'
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
  'upload-image': [file: File]
  'clear-image': []
  'select-pattern': [index: number | null]
  'load-random': []
}>()

const props = defineProps<{
  // 画像
  customImage: string | null
  customFileName: string | null
  // テクスチャパターン
  patterns: PatternItem[]
  selectedIndex: number | null
  // オプション: べた塗りを最初に表示するか
  showSolidOption?: boolean
  // オプション: Random Photo ボタンを表示するか
  showRandomButton?: boolean
  isLoadingRandom?: boolean
  // Hero preview mode
  previewMode?: 'pattern' | 'hero'
  baseConfig?: HeroViewConfig
  palette?: PrimitivePalette
  // Target layer type for preview ('base' for Background, 'surface' for Main Group)
  targetLayerType?: 'base' | 'surface'
}>()

const handleFileChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) {
    emit('upload-image', file)
  }
}

const handleSelectPattern = (index: number | null) => {
  // 画像が設定されている場合はクリアしてからパターンを選択
  if (props.customImage) {
    emit('clear-image')
  }
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
    <!-- 画像アップロード -->
    <p class="section-label">画像</p>
    <div class="image-upload-section">
      <!-- 画像プレビュー -->
      <div v-if="customImage" class="uploaded-image-preview">
        <img :src="customImage" alt="Uploaded image" />
      </div>
      <!-- アップロードボタン -->
      <label v-else class="image-upload-button">
        <input
          type="file"
          accept="image/*"
          class="image-upload-input"
          @change="handleFileChange"
        />
        <span class="image-upload-icon">📷</span>
        <span class="image-upload-text">画像をアップロード</span>
      </label>
      <!-- Random Photo ボタン (常に表示) -->
      <button
        v-if="showRandomButton"
        class="random-photo-button"
        :disabled="isLoadingRandom"
        @click="emit('load-random')"
      >
        {{ isLoadingRandom ? 'Loading...' : 'Random Photo' }}
      </button>
    </div>

    <!-- テクスチャパターン -->
    <p class="section-label" style="margin-top: 1rem;">テクスチャ</p>
    <div class="pattern-grid">
      <!-- べた塗り (オプション) -->
      <button
        v-if="showSolidOption"
        class="pattern-button"
        :class="{ active: !customImage && selectedIndex === null }"
        @click="handleSelectPattern(null)"
      >
        <HeroPreviewThumbnail
          v-if="isHeroMode && solidPreviewConfig && palette"
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
        :class="{ active: !customImage && selectedIndex === i }"
        @click="handleSelectPattern(i)"
      >
        <HeroPreviewThumbnail
          v-if="isHeroMode && previewConfigs && previewConfigs[i] && palette"
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
.section-label {
  margin: 0 0 0.5rem;
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: oklch(0.50 0.02 260);
}

/* Image Upload */
.image-upload-section {
  margin-bottom: 0.5rem;
}

.image-upload-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 1.5rem;
  border: 2px dashed oklch(0.75 0.01 260);
  border-radius: 0.5rem;
  background: oklch(0.94 0.01 260);
  color: oklch(0.50 0.02 260);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

:global(.dark) .image-upload-button {
  border-color: oklch(0.35 0.02 260);
  background: oklch(0.18 0.02 260);
  color: oklch(0.60 0.02 260);
}

.image-upload-button:hover {
  border-color: oklch(0.55 0.20 250);
  background: oklch(0.90 0.01 260);
}

:global(.dark) .image-upload-button:hover {
  background: oklch(0.22 0.02 260);
}

.image-upload-input {
  display: none;
}

.image-upload-icon {
  font-size: 1.5rem;
}

.image-upload-text {
  font-size: 0.75rem;
  font-weight: 500;
}

.random-photo-button {
  width: 100%;
  margin-top: 0.5rem;
  padding: 0.625rem 1rem;
  border: none;
  border-radius: 0.5rem;
  background: oklch(0.45 0.15 145);
  color: oklch(0.98 0.02 260);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.random-photo-button:hover:not(:disabled) {
  background: oklch(0.50 0.18 145);
}

.random-photo-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.uploaded-image-preview {
  border: 2px solid oklch(0.55 0.20 250);
  border-radius: 0.5rem;
  overflow: hidden;
  background: oklch(0.92 0.01 260);
}

:global(.dark) .uploaded-image-preview {
  background: oklch(0.22 0.02 260);
}

.uploaded-image-preview img {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  display: block;
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
