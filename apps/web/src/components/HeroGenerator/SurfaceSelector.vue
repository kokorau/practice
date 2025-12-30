<script setup lang="ts">
/**
 * SurfaceSelector
 *
 * 共通のSurface選択UI（画像アップロード + テクスチャパターン）
 * Background, Mask Surface両方で使用
 */

export interface PatternItem {
  label: string
  type?: string
}

const props = defineProps<{
  // 画像
  customImage: string | null
  customFileName: string | null
  // テクスチャパターン
  patterns: PatternItem[]
  selectedIndex: number | null
  // オプション: べた塗りを最初に表示するか
  showSolidOption?: boolean
}>()

const emit = defineEmits<{
  'upload-image': [file: File]
  'clear-image': []
  'select-pattern': [index: number | null]
}>()

const handleFileChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) {
    emit('upload-image', file)
  }
}

const getPatternIcon = (pattern: PatternItem): string => {
  if (!pattern.type) return '▣'
  switch (pattern.type) {
    case 'stripe': return '▤'
    case 'grid': return '▦'
    case 'polkaDot': return '⚬'
    default: return '▣'
  }
}
</script>

<template>
  <div class="surface-selector">
    <!-- 画像アップロード -->
    <p class="section-label">画像</p>
    <div class="image-upload-section">
      <template v-if="customImage">
        <div class="uploaded-image-preview">
          <img :src="customImage" alt="Uploaded image" />
          <div class="uploaded-image-info">
            <span class="uploaded-image-name">{{ customFileName }}</span>
            <button class="image-clear-button" @click="emit('clear-image')">削除</button>
          </div>
        </div>
      </template>
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
    </div>

    <!-- テクスチャパターン -->
    <p class="section-label" style="margin-top: 1rem;">テクスチャ</p>
    <div class="pattern-grid">
      <!-- べた塗り (オプション) -->
      <button
        v-if="showSolidOption"
        class="pattern-button"
        :class="{ active: !customImage && selectedIndex === null }"
        :disabled="!!customImage"
        @click="emit('select-pattern', null)"
      >
        <span class="pattern-none">Solid</span>
        <span class="pattern-label">べた塗り</span>
      </button>

      <!-- パターン -->
      <button
        v-for="(pattern, i) in patterns"
        :key="i"
        class="pattern-button"
        :class="{ active: !customImage && selectedIndex === i }"
        :disabled="!!customImage"
        @click="emit('select-pattern', i)"
      >
        <canvas data-thumbnail-canvas class="pattern-canvas" />
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
  border: 2px dashed oklch(0.35 0.02 260);
  border-radius: 0.5rem;
  background: oklch(0.18 0.02 260);
  color: oklch(0.60 0.02 260);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.image-upload-button:hover {
  border-color: oklch(0.55 0.20 250);
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

.uploaded-image-preview {
  border: 2px solid oklch(0.55 0.20 250);
  border-radius: 0.5rem;
  overflow: hidden;
  background: oklch(0.22 0.02 260);
}

.uploaded-image-preview img {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  display: block;
}

.uploaded-image-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem;
  border-top: 1px solid oklch(0.30 0.02 260);
}

.uploaded-image-name {
  font-size: 0.625rem;
  color: oklch(0.70 0.02 260);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 10rem;
}

.image-clear-button {
  padding: 0.25rem 0.5rem;
  border: none;
  border-radius: 0.25rem;
  background: oklch(0.35 0.10 25);
  color: oklch(0.95 0.02 260);
  font-size: 0.625rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}

.image-clear-button:hover {
  background: oklch(0.45 0.15 25);
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
  border: 2px solid oklch(0.30 0.02 260);
  border-radius: 0.5rem;
  background: transparent;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.pattern-button:hover:not(:disabled) {
  border-color: oklch(0.40 0.02 260);
}

.pattern-button.active {
  border-color: oklch(0.55 0.20 250);
  background: oklch(0.55 0.20 250 / 0.1);
}

.pattern-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pattern-button:disabled:hover {
  border-color: oklch(0.30 0.02 260);
}

.pattern-canvas {
  width: 100%;
  aspect-ratio: 16 / 9;
}

.pattern-none {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: oklch(0.22 0.02 260);
  color: oklch(0.60 0.02 260);
  font-size: 0.875rem;
}

.pattern-label {
  padding: 0.375rem 0.5rem;
  font-size: 0.75rem;
  color: oklch(0.70 0.02 260);
  text-align: left;
}
</style>
