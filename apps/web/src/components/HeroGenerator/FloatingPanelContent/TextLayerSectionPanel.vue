<script setup lang="ts">
/**
 * TextLayerSectionPanel
 *
 * テキストレイヤー設定パネルのコンテンツ
 */

export interface TextLayerConfig {
  text: string
  fontFamily: string
  fontSize: number
  fontWeight: number
  letterSpacing: number
  lineHeight: number
  color: string
  position: {
    x: number
    y: number
    anchor: string
  }
  rotation: number
}

export interface TextLayerUpdates {
  text?: string
  fontFamily?: string
  fontSize?: number
  fontWeight?: number
  letterSpacing?: number
  lineHeight?: number
  color?: string
  x?: number
  y?: number
  anchor?: string
  rotation?: number
}

defineProps<{
  config: TextLayerConfig | null
}>()

const emit = defineEmits<{
  (e: 'update:config', updates: TextLayerUpdates): void
}>()

const handleUpdate = (updates: TextLayerUpdates) => {
  emit('update:config', updates)
}
</script>

<template>
  <div v-if="config" class="text-layer-section">
    <div class="text-layer-field">
      <label class="text-layer-label">Text</label>
      <textarea
        :value="config.text"
        @input="handleUpdate({ text: ($event.target as HTMLTextAreaElement).value })"
        class="text-layer-textarea"
        placeholder="Enter text..."
        rows="3"
      />
    </div>

    <div class="text-layer-field">
      <label class="text-layer-label">Font Family</label>
      <select
        :value="config.fontFamily"
        @change="handleUpdate({ fontFamily: ($event.target as HTMLSelectElement).value })"
        class="text-layer-select"
      >
        <option value="sans-serif">Sans Serif</option>
        <option value="serif">Serif</option>
        <option value="monospace">Monospace</option>
        <option value="'Noto Sans JP', sans-serif">Noto Sans JP</option>
        <option value="'Noto Serif JP', serif">Noto Serif JP</option>
      </select>
    </div>

    <div class="text-layer-row">
      <div class="text-layer-field">
        <label class="text-layer-label">Size (px)</label>
        <input
          type="number"
          :value="config.fontSize"
          @input="handleUpdate({ fontSize: Number(($event.target as HTMLInputElement).value) })"
          class="text-layer-input"
          min="8"
          max="200"
        />
      </div>

      <div class="text-layer-field">
        <label class="text-layer-label">Weight</label>
        <select
          :value="config.fontWeight"
          @change="handleUpdate({ fontWeight: Number(($event.target as HTMLSelectElement).value) })"
          class="text-layer-select"
        >
          <option :value="100">Thin</option>
          <option :value="300">Light</option>
          <option :value="400">Regular</option>
          <option :value="500">Medium</option>
          <option :value="700">Bold</option>
          <option :value="900">Black</option>
        </select>
      </div>
    </div>

    <div class="text-layer-row">
      <div class="text-layer-field">
        <label class="text-layer-label">Letter Spacing (em)</label>
        <input
          type="number"
          :value="config.letterSpacing"
          @input="handleUpdate({ letterSpacing: Number(($event.target as HTMLInputElement).value) })"
          class="text-layer-input"
          min="-0.2"
          max="1"
          step="0.01"
        />
      </div>

      <div class="text-layer-field">
        <label class="text-layer-label">Line Height</label>
        <input
          type="number"
          :value="config.lineHeight"
          @input="handleUpdate({ lineHeight: Number(($event.target as HTMLInputElement).value) })"
          class="text-layer-input"
          min="0.5"
          max="3"
          step="0.1"
        />
      </div>
    </div>

    <div class="text-layer-field">
      <label class="text-layer-label">Color</label>
      <input
        type="color"
        :value="config.color"
        @input="handleUpdate({ color: ($event.target as HTMLInputElement).value })"
        class="text-layer-color"
      />
    </div>

    <div class="text-layer-row">
      <div class="text-layer-field">
        <label class="text-layer-label">Position X</label>
        <input
          type="range"
          :value="config.position.x"
          @input="handleUpdate({ x: Number(($event.target as HTMLInputElement).value) })"
          class="text-layer-slider"
          min="0"
          max="1"
          step="0.01"
        />
      </div>

      <div class="text-layer-field">
        <label class="text-layer-label">Position Y</label>
        <input
          type="range"
          :value="config.position.y"
          @input="handleUpdate({ y: Number(($event.target as HTMLInputElement).value) })"
          class="text-layer-slider"
          min="0"
          max="1"
          step="0.01"
        />
      </div>
    </div>

    <div class="text-layer-field">
      <label class="text-layer-label">Anchor</label>
      <select
        :value="config.position.anchor"
        @change="handleUpdate({ anchor: ($event.target as HTMLSelectElement).value })"
        class="text-layer-select"
      >
        <option value="top-left">Top Left</option>
        <option value="top-center">Top Center</option>
        <option value="top-right">Top Right</option>
        <option value="center-left">Center Left</option>
        <option value="center">Center</option>
        <option value="center-right">Center Right</option>
        <option value="bottom-left">Bottom Left</option>
        <option value="bottom-center">Bottom Center</option>
        <option value="bottom-right">Bottom Right</option>
      </select>
    </div>

    <div class="text-layer-field">
      <label class="text-layer-label">Rotation (deg)</label>
      <input
        type="range"
        :value="config.rotation * (180 / Math.PI)"
        @input="handleUpdate({ rotation: Number(($event.target as HTMLInputElement).value) * (Math.PI / 180) })"
        class="text-layer-slider"
        min="-180"
        max="180"
        step="1"
      />
    </div>
  </div>
</template>

<style scoped>
.text-layer-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.text-layer-field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.text-layer-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.text-layer-label {
  font-size: 0.6875rem;
  font-weight: 500;
  color: oklch(0.45 0.02 260);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

:global(.dark) .text-layer-label {
  color: oklch(0.65 0.02 260);
}

.text-layer-textarea {
  padding: 0.5rem 0.625rem;
  background: oklch(0.96 0.01 260);
  border: 1px solid oklch(0.85 0.01 260);
  border-radius: 0.375rem;
  color: oklch(0.20 0.02 260);
  font-size: 0.875rem;
  font-family: inherit;
  resize: vertical;
  min-height: 3rem;
}

:global(.dark) .text-layer-textarea {
  background: oklch(0.18 0.02 260);
  border-color: oklch(0.30 0.02 260);
  color: oklch(0.90 0.02 260);
}

.text-layer-textarea:focus {
  outline: none;
  border-color: oklch(0.55 0.20 250);
}

.text-layer-input {
  padding: 0.5rem 0.625rem;
  background: oklch(0.96 0.01 260);
  border: 1px solid oklch(0.85 0.01 260);
  border-radius: 0.375rem;
  color: oklch(0.20 0.02 260);
  font-size: 0.8125rem;
  font-family: inherit;
}

:global(.dark) .text-layer-input {
  background: oklch(0.18 0.02 260);
  border-color: oklch(0.30 0.02 260);
  color: oklch(0.90 0.02 260);
}

.text-layer-input:focus {
  outline: none;
  border-color: oklch(0.55 0.20 250);
}

.text-layer-select {
  padding: 0.5rem 0.625rem;
  background: oklch(0.96 0.01 260);
  border: 1px solid oklch(0.85 0.01 260);
  border-radius: 0.375rem;
  color: oklch(0.20 0.02 260);
  font-size: 0.8125rem;
  font-family: inherit;
  cursor: pointer;
}

:global(.dark) .text-layer-select {
  background: oklch(0.18 0.02 260);
  border-color: oklch(0.30 0.02 260);
  color: oklch(0.90 0.02 260);
}

.text-layer-select:focus {
  outline: none;
  border-color: oklch(0.55 0.20 250);
}

.text-layer-color {
  width: 100%;
  height: 2rem;
  padding: 0.125rem;
  background: oklch(0.96 0.01 260);
  border: 1px solid oklch(0.85 0.01 260);
  border-radius: 0.375rem;
  cursor: pointer;
}

:global(.dark) .text-layer-color {
  background: oklch(0.18 0.02 260);
  border-color: oklch(0.30 0.02 260);
}

.text-layer-slider {
  width: 100%;
  height: 4px;
  appearance: none;
  background: oklch(0.85 0.01 260);
  border-radius: 2px;
  cursor: pointer;
}

:global(.dark) .text-layer-slider {
  background: oklch(0.30 0.02 260);
}

.text-layer-slider::-webkit-slider-thumb {
  appearance: none;
  width: 14px;
  height: 14px;
  background: oklch(0.55 0.20 250);
  border-radius: 50%;
  cursor: pointer;
}

.text-layer-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  background: oklch(0.55 0.20 250);
  border: none;
  border-radius: 50%;
  cursor: pointer;
}
</style>
