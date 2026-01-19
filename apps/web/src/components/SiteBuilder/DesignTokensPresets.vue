<script setup lang="ts">
import { computed } from 'vue'
import { getTokenPresetEntries, type TokenPresetEntry } from '@practice/design-tokens/Infra'

const props = defineProps<{
  selectedId: string
}>()

const emit = defineEmits<{
  'update:selectedId': [value: string]
}>()

const presets = getTokenPresetEntries()

const selectedPreset = computed(() =>
  presets.find((p) => p.id === props.selectedId) ?? presets[0]!
)

const handleSelect = (preset: TokenPresetEntry) => {
  emit('update:selectedId', preset.id)
}
</script>

<template>
  <div class="design-tokens-presets">
    <div class="presets-list">
      <button
        v-for="preset in presets"
        :key="preset.id"
        class="preset-item"
        :class="{ selected: preset.id === selectedId }"
        @click="handleSelect(preset)"
      >
        <div class="preset-header">
          <span class="preset-name">{{ preset.name }}</span>
          <span v-if="preset.id === selectedId" class="preset-check">✓</span>
        </div>
        <div class="preset-preview">
          <div class="preview-typography">
            <span
              class="preview-title"
              :style="{
                fontSize: preset.tokens.typography.title.size,
                fontWeight: preset.tokens.typography.title.weight,
              }"
            >Aa</span>
            <span
              class="preview-body"
              :style="{
                fontSize: preset.tokens.typography.body.size,
              }"
            >Body</span>
          </div>
          <div class="preview-spacing">
            <div
              class="preview-radius"
              :style="{ borderRadius: preset.tokens.radius.md }"
            />
            <span class="preview-label">{{ preset.tokens.spacing.md }}</span>
          </div>
        </div>
      </button>
    </div>

    <!-- Current preset details -->
    <div class="preset-details">
      <h4 class="details-title">{{ selectedPreset.name }} Details</h4>

      <div class="details-section">
        <h5 class="section-label">Typography</h5>
        <div class="details-grid">
          <div class="detail-item">
            <span class="detail-key">Title</span>
            <span class="detail-value">{{ selectedPreset.tokens.typography.title.size }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-key">Body</span>
            <span class="detail-value">{{ selectedPreset.tokens.typography.body.size }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-key">Meta</span>
            <span class="detail-value">{{ selectedPreset.tokens.typography.meta.size }}</span>
          </div>
        </div>
      </div>

      <div class="details-section">
        <h5 class="section-label">Radius</h5>
        <div class="radius-preview-row">
          <div
            v-for="scale in ['sm', 'md', 'lg'] as const"
            :key="scale"
            class="radius-item"
          >
            <div
              class="radius-box"
              :style="{ borderRadius: selectedPreset.tokens.radius[scale] }"
            />
            <span class="radius-label">{{ scale }}</span>
          </div>
        </div>
      </div>

      <div class="details-section">
        <h5 class="section-label">Spacing</h5>
        <div class="spacing-preview-row">
          <div
            v-for="scale in ['sm', 'md', 'lg'] as const"
            :key="scale"
            class="spacing-item"
          >
            <div
              class="spacing-bar"
              :style="{ width: selectedPreset.tokens.spacing[scale] }"
            />
            <span class="spacing-label">{{ scale }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.design-tokens-presets {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.presets-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.preset-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
  background: oklch(0.99 0.005 260);
  border: 2px solid transparent;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  text-align: left;
  width: 100%;
}

:global(.dark) .preset-item {
  background: oklch(0.18 0.02 260);
}

.preset-item:hover {
  background: oklch(0.97 0.01 260);
}

:global(.dark) .preset-item:hover {
  background: oklch(0.22 0.02 260);
}

.preset-item.selected {
  border-color: oklch(0.55 0.18 250);
  background: oklch(0.96 0.02 250);
}

:global(.dark) .preset-item.selected {
  border-color: oklch(0.55 0.16 250);
  background: oklch(0.22 0.04 250);
}

.preset-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.preset-name {
  font-size: 0.8rem;
  font-weight: 600;
  color: oklch(0.25 0.02 260);
}

:global(.dark) .preset-name {
  color: oklch(0.90 0.01 260);
}

.preset-check {
  font-size: 0.75rem;
  color: oklch(0.55 0.18 250);
}

.preset-preview {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.25rem;
}

.preview-typography {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.preview-title {
  color: oklch(0.30 0.02 260);
}

:global(.dark) .preview-title {
  color: oklch(0.85 0.01 260);
}

.preview-body {
  color: oklch(0.50 0.02 260);
}

:global(.dark) .preview-body {
  color: oklch(0.60 0.02 260);
}

.preview-spacing {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.preview-radius {
  width: 1.25rem;
  height: 1.25rem;
  background: oklch(0.55 0.18 250);
}

.preview-label {
  font-size: 0.65rem;
  font-family: 'SF Mono', Monaco, monospace;
  color: oklch(0.50 0.02 260);
}

:global(.dark) .preview-label {
  color: oklch(0.60 0.02 260);
}

/* Details Section */
.preset-details {
  padding: 0.75rem;
  background: oklch(0.96 0.005 260);
  border-radius: 0.5rem;
}

:global(.dark) .preset-details {
  background: oklch(0.16 0.02 260);
}

.details-title {
  margin: 0 0 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: oklch(0.35 0.02 260);
}

:global(.dark) .details-title {
  color: oklch(0.75 0.02 260);
}

.details-section {
  margin-bottom: 0.75rem;
}

.details-section:last-child {
  margin-bottom: 0;
}

.section-label {
  margin: 0 0 0.375rem;
  font-size: 0.65rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: oklch(0.50 0.02 260);
}

:global(.dark) .section-label {
  color: oklch(0.55 0.02 260);
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.detail-key {
  font-size: 0.6rem;
  color: oklch(0.50 0.02 260);
}

:global(.dark) .detail-key {
  color: oklch(0.55 0.02 260);
}

.detail-value {
  font-size: 0.7rem;
  font-family: 'SF Mono', Monaco, monospace;
  color: oklch(0.30 0.02 260);
}

:global(.dark) .detail-value {
  color: oklch(0.80 0.02 260);
}

/* Radius Preview */
.radius-preview-row {
  display: flex;
  gap: 0.75rem;
}

.radius-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.radius-box {
  width: 1.5rem;
  height: 1.5rem;
  background: oklch(0.55 0.18 250);
}

.radius-label {
  font-size: 0.6rem;
  color: oklch(0.50 0.02 260);
}

:global(.dark) .radius-label {
  color: oklch(0.55 0.02 260);
}

/* Spacing Preview */
.spacing-preview-row {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.spacing-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.spacing-bar {
  height: 0.375rem;
  background: oklch(0.55 0.18 250);
  border-radius: 2px;
}

.spacing-label {
  font-size: 0.6rem;
  color: oklch(0.50 0.02 260);
}

:global(.dark) .spacing-label {
  color: oklch(0.55 0.02 260);
}
</style>
