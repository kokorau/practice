<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  layerId: string
  imageId: string
  mode: 'cover' | 'positioned'
  position: {
    x: number
    y: number
    width: number
    height: number
    rotation?: number
    opacity?: number
  } | undefined
  imageUrl: string | null
  isLoading: boolean
}>()

const emit = defineEmits<{
  (e: 'upload-image', file: File): void
  (e: 'clear-image'): void
  (e: 'load-random', query?: string): void
  (e: 'update:mode', value: 'cover' | 'positioned'): void
  (e: 'update:position', value: {
    x: number
    y: number
    width: number
    height: number
    rotation?: number
    opacity?: number
  }): void
}>()

const hasImage = computed(() => !!props.imageId && !!props.imageUrl)

const positionX = computed({
  get: () => (props.position?.x ?? 0.1) * 100,
  set: (v: number) => emitPosition({ x: v / 100 }),
})

const positionY = computed({
  get: () => (props.position?.y ?? 0.1) * 100,
  set: (v: number) => emitPosition({ y: v / 100 }),
})

const positionWidth = computed({
  get: () => (props.position?.width ?? 0.5) * 100,
  set: (v: number) => emitPosition({ width: v / 100 }),
})

const positionHeight = computed({
  get: () => (props.position?.height ?? 0.5) * 100,
  set: (v: number) => emitPosition({ height: v / 100 }),
})

const rotation = computed({
  get: () => props.position?.rotation ?? 0,
  set: (v: number) => emitPosition({ rotation: v }),
})

const opacity = computed({
  get: () => (props.position?.opacity ?? 1) * 100,
  set: (v: number) => emitPosition({ opacity: v / 100 }),
})

function emitPosition(updates: Partial<{
  x: number
  y: number
  width: number
  height: number
  rotation: number
  opacity: number
}>) {
  const current = props.position ?? {
    x: 0.1,
    y: 0.1,
    width: 0.5,
    height: 0.5,
    rotation: 0,
    opacity: 1,
  }
  emit('update:position', { ...current, ...updates })
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files?.[0]) {
    emit('upload-image', input.files[0])
    input.value = ''
  }
}

function handleLoadRandom() {
  emit('load-random', 'nature')
}
</script>

<template>
  <div class="image-layer-settings">
    <!-- Image Upload Section -->
    <div class="settings-section">
      <p class="settings-label">Image</p>

      <!-- Image Preview -->
      <div v-if="hasImage" class="image-preview">
        <img :src="imageUrl!" alt="Layer image" class="preview-img" />
        <button class="clear-btn" @click="emit('clear-image')" title="Clear image">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <!-- Upload Controls -->
      <div class="upload-controls">
        <label class="upload-btn">
          <input type="file" accept="image/*" @change="handleFileSelect" />
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Upload
        </label>
        <button
          class="random-btn"
          :disabled="isLoading"
          @click="handleLoadRandom"
        >
          <svg v-if="!isLoading" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="16 3 21 3 21 8" />
            <line x1="4" y1="20" x2="21" y2="3" />
            <polyline points="21 16 21 21 16 21" />
            <line x1="15" y1="15" x2="21" y2="21" />
            <line x1="4" y1="4" x2="9" y2="9" />
          </svg>
          <span v-if="isLoading" class="loading-spinner" />
          {{ isLoading ? 'Loading...' : 'Random' }}
        </button>
      </div>
    </div>

    <!-- Mode Selection -->
    <div class="settings-section">
      <p class="settings-label">Mode</p>
      <div class="mode-selector">
        <button
          :class="['mode-btn', { active: mode === 'cover' }]"
          @click="emit('update:mode', 'cover')"
        >
          Cover
        </button>
        <button
          :class="['mode-btn', { active: mode === 'positioned' }]"
          @click="emit('update:mode', 'positioned')"
        >
          Positioned
        </button>
      </div>
    </div>

    <!-- Position Controls (only for positioned mode) -->
    <div v-if="mode === 'positioned'" class="settings-section">
      <p class="settings-label">Position</p>
      <div class="position-controls">
        <div class="control-row">
          <label class="control-label">X</label>
          <input
            v-model.number="positionX"
            type="range"
            min="0"
            max="100"
            step="1"
            class="slider"
          />
          <span class="control-value">{{ Math.round(positionX) }}%</span>
        </div>
        <div class="control-row">
          <label class="control-label">Y</label>
          <input
            v-model.number="positionY"
            type="range"
            min="0"
            max="100"
            step="1"
            class="slider"
          />
          <span class="control-value">{{ Math.round(positionY) }}%</span>
        </div>
        <div class="control-row">
          <label class="control-label">Width</label>
          <input
            v-model.number="positionWidth"
            type="range"
            min="5"
            max="100"
            step="1"
            class="slider"
          />
          <span class="control-value">{{ Math.round(positionWidth) }}%</span>
        </div>
        <div class="control-row">
          <label class="control-label">Height</label>
          <input
            v-model.number="positionHeight"
            type="range"
            min="5"
            max="100"
            step="1"
            class="slider"
          />
          <span class="control-value">{{ Math.round(positionHeight) }}%</span>
        </div>
        <div class="control-row">
          <label class="control-label">Rotation</label>
          <input
            v-model.number="rotation"
            type="range"
            min="-180"
            max="180"
            step="1"
            class="slider"
          />
          <span class="control-value">{{ rotation }}°</span>
        </div>
        <div class="control-row">
          <label class="control-label">Opacity</label>
          <input
            v-model.number="opacity"
            type="range"
            min="0"
            max="100"
            step="1"
            class="slider"
          />
          <span class="control-value">{{ Math.round(opacity) }}%</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.image-layer-settings {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.settings-section {
  padding: 0.5rem 0;
}

.settings-section:not(:last-child) {
  border-bottom: 1px solid oklch(0.90 0.01 260);
}

:global(.dark) .settings-section:not(:last-child) {
  border-bottom-color: oklch(0.22 0.02 260);
}

.settings-label {
  margin: 0 0 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: oklch(0.40 0.02 260);
}

:global(.dark) .settings-label {
  color: oklch(0.70 0.02 260);
}

/* Image Preview */
.image-preview {
  position: relative;
  width: 100%;
  aspect-ratio: 16/9;
  margin-bottom: 0.5rem;
  border-radius: 0.375rem;
  overflow: hidden;
  background: oklch(0.88 0.01 260);
}

:global(.dark) .image-preview {
  background: oklch(0.25 0.02 260);
}

.preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.clear-btn {
  position: absolute;
  top: 0.25rem;
  right: 0.25rem;
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: oklch(0 0 0 / 0.6);
  color: white;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s;
}

.image-preview:hover .clear-btn {
  opacity: 1;
}

.clear-btn:hover {
  background: oklch(0.5 0.2 25);
}

/* Upload Controls */
.upload-controls {
  display: flex;
  gap: 0.5rem;
}

.upload-btn,
.random-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  padding: 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.15s;
}

.upload-btn {
  background: oklch(0.55 0.15 260);
  color: white;
  border: none;
}

.upload-btn:hover {
  background: oklch(0.50 0.15 260);
}

.upload-btn input {
  display: none;
}

.random-btn {
  background: oklch(0.92 0.01 260);
  color: oklch(0.30 0.02 260);
  border: 1px solid oklch(0.85 0.01 260);
}

.random-btn:hover:not(:disabled) {
  background: oklch(0.88 0.01 260);
}

.random-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

:global(.dark) .random-btn {
  background: oklch(0.25 0.02 260);
  color: oklch(0.80 0.01 260);
  border-color: oklch(0.30 0.02 260);
}

:global(.dark) .random-btn:hover:not(:disabled) {
  background: oklch(0.30 0.02 260);
}

.loading-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Mode Selector */
.mode-selector {
  display: flex;
  gap: 0.25rem;
  background: oklch(0.92 0.01 260);
  padding: 0.125rem;
  border-radius: 0.375rem;
}

:global(.dark) .mode-selector {
  background: oklch(0.22 0.02 260);
}

.mode-btn {
  flex: 1;
  padding: 0.375rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  background: transparent;
  color: oklch(0.45 0.02 260);
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: all 0.15s;
}

.mode-btn:hover:not(.active) {
  background: oklch(0.88 0.01 260);
}

.mode-btn.active {
  background: white;
  color: oklch(0.30 0.02 260);
  box-shadow: 0 1px 2px oklch(0 0 0 / 0.1);
}

:global(.dark) .mode-btn {
  color: oklch(0.65 0.01 260);
}

:global(.dark) .mode-btn:hover:not(.active) {
  background: oklch(0.28 0.02 260);
}

:global(.dark) .mode-btn.active {
  background: oklch(0.35 0.03 260);
  color: oklch(0.95 0.01 260);
}

/* Position Controls */
.position-controls {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.control-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.control-label {
  width: 3.5rem;
  font-size: 0.7rem;
  color: oklch(0.50 0.02 260);
}

:global(.dark) .control-label {
  color: oklch(0.60 0.01 260);
}

.slider {
  flex: 1;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: oklch(0.85 0.01 260);
  border-radius: 2px;
  cursor: pointer;
}

:global(.dark) .slider {
  background: oklch(0.30 0.02 260);
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  background: oklch(0.55 0.15 260);
  border-radius: 50%;
  cursor: pointer;
}

.slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  background: oklch(0.55 0.15 260);
  border: none;
  border-radius: 50%;
  cursor: pointer;
}

.control-value {
  width: 2.5rem;
  font-size: 0.7rem;
  text-align: right;
  color: oklch(0.45 0.02 260);
}

:global(.dark) .control-value {
  color: oklch(0.65 0.01 260);
}
</style>
