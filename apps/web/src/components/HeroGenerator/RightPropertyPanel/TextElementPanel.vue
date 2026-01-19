<script setup lang="ts">
import { $Oklch } from '@practice/color'
import type { PrimitivePalette, PrimitiveKey } from '@practice/semantic-color-palette/Domain'
import { NEUTRAL_KEYS } from '@practice/semantic-color-palette/Domain'
import type { GridPosition } from '@practice/section-visual'
import type { ContrastAnalysisResult } from '../../../modules/ContrastChecker'
import PrimitiveColorPicker from '../PrimitiveColorPicker.vue'
import GridPositionPicker from '../GridPositionPicker.vue'

interface FontPreset {
  id: string
  name: string
  family: string
}

defineProps<{
  elementType: 'title' | 'description'
  contrastResult: ContrastAnalysisResult | null
  autoColorKey: PrimitiveKey | null
  primitivePalette: PrimitivePalette
  colorKey: PrimitiveKey | 'auto'
  content: string
  position: GridPosition
  fontSize: number
  fontWeight: number
  letterSpacing: number
  lineHeight: number
  fontPreset: FontPreset | null
  fontDisplayName: string
}>()

const emit = defineEmits<{
  (e: 'update:colorKey', value: PrimitiveKey | 'auto'): void
  (e: 'update:content', value: string): void
  (e: 'update:position', value: GridPosition): void
  (e: 'update:fontSize', value: number): void
  (e: 'update:fontWeight', value: number): void
  (e: 'update:letterSpacing', value: number): void
  (e: 'update:lineHeight', value: number): void
  (e: 'open-font-panel'): void
}>()

// Helper to get score level class
const getScoreLevel = (score: number): 'excellent' | 'good' | 'fair' | 'poor' => {
  if (score >= 75) return 'excellent'
  if (score >= 60) return 'good'
  if (score >= 45) return 'fair'
  return 'poor'
}

const getContrastHint = (score: number): string => {
  if (score >= 60) return 'Good readability'
  if (score >= 45) return 'Minimum for body text'
  return 'Poor contrast'
}
</script>

<template>
  <div class="layer-settings">
    <!-- Font Size & Weight -->
    <div class="settings-section">
      <div class="input-row">
        <div class="input-group">
          <p class="settings-label">Size</p>
          <div class="unit-input-wrapper">
            <input
              :value="fontSize"
              type="number"
              min="0.5"
              max="10"
              step="0.25"
              class="unit-input"
              @input="emit('update:fontSize', Number(($event.target as HTMLInputElement).value))"
            />
            <span class="unit-label">rem</span>
          </div>
        </div>
        <div class="input-group">
          <p class="settings-label">Weight</p>
          <div class="unit-input-wrapper">
            <select
              :value="fontWeight"
              class="unit-select"
              @change="emit('update:fontWeight', Number(($event.target as HTMLSelectElement).value))"
            >
              <option :value="100">100</option>
              <option :value="200">200</option>
              <option :value="300">300</option>
              <option :value="400">400</option>
              <option :value="500">500</option>
              <option :value="600">600</option>
              <option :value="700">700</option>
              <option :value="800">800</option>
              <option :value="900">900</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Letter Spacing & Line Height -->
    <div class="settings-section">
      <div class="input-row">
        <div class="input-group">
          <p class="settings-label">Spacing</p>
          <div class="unit-input-wrapper">
            <input
              :value="letterSpacing"
              type="number"
              min="-0.1"
              max="0.5"
              step="0.01"
              class="unit-input"
              @input="emit('update:letterSpacing', Number(($event.target as HTMLInputElement).value))"
            />
            <span class="unit-label">em</span>
          </div>
        </div>
        <div class="input-group">
          <p class="settings-label">Height</p>
          <div class="unit-input-wrapper">
            <input
              :value="lineHeight"
              type="number"
              min="1.0"
              max="3.0"
              step="0.1"
              class="unit-input"
              @input="emit('update:lineHeight', Number(($event.target as HTMLInputElement).value))"
            />
            <span class="unit-label">×</span>
          </div>
        </div>
      </div>
    </div>

    <!-- APCA Contrast Score -->
    <div v-if="contrastResult" class="contrast-score-section">
      <div class="contrast-score-header">
        <span class="contrast-score-label">APCA Contrast</span>
        <span
          class="contrast-score-badge"
          :class="getScoreLevel(contrastResult.score)"
        >
          Lc {{ contrastResult.score }}
        </span>
      </div>
      <div class="contrast-histogram">
        <div
          v-for="(percent, i) in contrastResult.histogram.bins"
          :key="i"
          class="histogram-bar"
          :style="{ height: `${Math.min(percent, 100)}%` }"
          :title="`${i * 10}-${(i + 1) * 10}: ${percent.toFixed(1)}%`"
        />
      </div>
      <div class="contrast-score-hint">
        {{ getContrastHint(contrastResult.score) }}
      </div>
    </div>

    <div class="settings-section">
      <p class="settings-label">Color</p>
      <PrimitiveColorPicker
        :model-value="colorKey"
        :palette="primitivePalette"
        label="Text Color"
        :show-auto="true"
        @update:model-value="emit('update:colorKey', $event)"
      />
      <!-- Auto-selected neutral indicator -->
      <div v-if="colorKey === 'auto'" class="auto-neutral-indicator">
        <div
          v-for="key in NEUTRAL_KEYS"
          :key="key"
          class="auto-neutral-chip-wrapper"
        >
          <div
            class="auto-neutral-chip"
            :style="{ backgroundColor: $Oklch.toCss(primitivePalette[key]) }"
            :title="key"
          />
          <span
            v-if="autoColorKey === key"
            class="material-icons auto-indicator-arrow"
          >expand_less</span>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <p class="settings-label">Text</p>
      <textarea
        :value="content"
        class="foreground-textarea"
        placeholder="Enter text"
        rows="2"
        @input="emit('update:content', ($event.target as HTMLTextAreaElement).value)"
      />
    </div>

    <div class="settings-section">
      <GridPositionPicker
        :model-value="position"
        label="Position"
        @update:model-value="emit('update:position', $event)"
      />
    </div>

    <div class="settings-section">
      <p class="settings-label">Font</p>
      <button class="font-trigger" @click="emit('open-font-panel')">
        <span
          class="font-trigger-name"
          :style="{ fontFamily: fontPreset?.family }"
        >{{ fontDisplayName }}</span>
        <span class="material-icons font-trigger-arrow">chevron_right</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.layer-settings {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.settings-section {
  padding: 0.5rem 0;
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

/* APCA Contrast Score */
.contrast-score-section {
  padding: 0.75rem;
  background: oklch(0.97 0.01 260);
  border-radius: 0.5rem;
  margin-bottom: 0.5rem;
}

:global(.dark) .contrast-score-section {
  background: oklch(0.14 0.02 260);
}

.contrast-score-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.contrast-score-label {
  font-size: 0.6875rem;
  font-weight: 600;
  color: oklch(0.45 0.02 260);
}

:global(.dark) .contrast-score-label {
  color: oklch(0.65 0.02 260);
}

.contrast-score-badge {
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.6875rem;
  font-weight: 700;
}

.contrast-score-badge.excellent {
  background: oklch(0.85 0.15 145);
  color: oklch(0.30 0.10 145);
}

.contrast-score-badge.good {
  background: oklch(0.88 0.12 130);
  color: oklch(0.35 0.08 130);
}

.contrast-score-badge.fair {
  background: oklch(0.90 0.12 85);
  color: oklch(0.40 0.10 85);
}

.contrast-score-badge.poor {
  background: oklch(0.88 0.12 25);
  color: oklch(0.40 0.10 25);
}

.contrast-histogram {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 24px;
  margin-bottom: 0.375rem;
}

.histogram-bar {
  flex: 1;
  min-height: 2px;
  background: oklch(0.55 0.15 250);
  border-radius: 1px;
  transition: height 0.2s;
}

.contrast-score-hint {
  font-size: 0.625rem;
  color: oklch(0.50 0.02 260);
}

:global(.dark) .contrast-score-hint {
  color: oklch(0.60 0.02 260);
}

/* Auto neutral indicator */
.auto-neutral-indicator {
  display: flex;
  gap: 0.25rem;
  margin-top: 0.5rem;
}

.auto-neutral-chip-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.auto-neutral-chip {
  width: 1rem;
  height: 1rem;
  border-radius: 0.1875rem;
  border: 1px solid oklch(0.80 0.01 260);
}

:global(.dark) .auto-neutral-chip {
  border-color: oklch(0.35 0.02 260);
}

.auto-indicator-arrow {
  font-size: 0.875rem;
  color: oklch(0.55 0.20 250);
  margin-top: -0.125rem;
}

/* Textarea */
.foreground-textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid oklch(0.85 0.01 260);
  border-radius: 0.375rem;
  background: oklch(0.98 0.01 260);
  color: oklch(0.25 0.02 260);
  font-size: 0.8125rem;
  font-family: inherit;
  resize: vertical;
  min-height: 2.5rem;
}

:global(.dark) .foreground-textarea {
  background: oklch(0.16 0.02 260);
  border-color: oklch(0.30 0.02 260);
  color: oklch(0.90 0.02 260);
}

.foreground-textarea:focus {
  outline: none;
  border-color: oklch(0.55 0.20 250);
}

/* Font trigger */
.font-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.5rem 0.625rem;
  background: oklch(0.98 0.01 260);
  border: 1px solid oklch(0.85 0.01 260);
  border-radius: 0.375rem;
  cursor: pointer;
  transition: border-color 0.15s;
}

:global(.dark) .font-trigger {
  background: oklch(0.16 0.02 260);
  border-color: oklch(0.30 0.02 260);
}

.font-trigger:hover {
  border-color: oklch(0.70 0.01 260);
}

:global(.dark) .font-trigger:hover {
  border-color: oklch(0.40 0.02 260);
}

.font-trigger-name {
  font-size: 0.8125rem;
  color: oklch(0.25 0.02 260);
}

:global(.dark) .font-trigger-name {
  color: oklch(0.90 0.02 260);
}

.font-trigger-arrow {
  font-size: 1.125rem;
  color: oklch(0.50 0.02 260);
}

:global(.dark) .font-trigger-arrow {
  color: oklch(0.60 0.02 260);
}

/* Input row - horizontal layout */
.input-row {
  display: flex;
  gap: 0.5rem;
}

.input-group {
  flex: 1;
}

/* Unit input wrapper - contains input + unit label inside border */
.unit-input-wrapper {
  display: flex;
  align-items: center;
  border: 1px solid oklch(0.85 0.01 260);
  border-radius: 0.375rem;
  background: oklch(0.98 0.01 260);
  overflow: hidden;
}

:global(.dark) .unit-input-wrapper {
  background: oklch(0.16 0.02 260);
  border-color: oklch(0.30 0.02 260);
}

.unit-input-wrapper:focus-within {
  border-color: oklch(0.55 0.20 250);
}

.unit-input {
  flex: 1;
  min-width: 0;
  padding: 0.375rem 0.5rem;
  border: none;
  background: transparent;
  color: oklch(0.25 0.02 260);
  font-size: 0.8125rem;
  font-family: inherit;
}

:global(.dark) .unit-input {
  color: oklch(0.90 0.02 260);
}

.unit-input:focus {
  outline: none;
}

/* Hide number input spinners */
.unit-input::-webkit-outer-spin-button,
.unit-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.unit-input[type="number"] {
  -moz-appearance: textfield;
}

.unit-label {
  padding-right: 0.5rem;
  font-size: 0.6875rem;
  color: oklch(0.50 0.02 260);
  white-space: nowrap;
}

:global(.dark) .unit-label {
  color: oklch(0.60 0.02 260);
}

/* Unit select (for font weight) */
.unit-select {
  flex: 1;
  min-width: 0;
  padding: 0.375rem 0.5rem;
  border: none;
  background: transparent;
  color: oklch(0.25 0.02 260);
  font-size: 0.8125rem;
  font-family: inherit;
  cursor: pointer;
}

:global(.dark) .unit-select {
  color: oklch(0.90 0.02 260);
}

.unit-select:focus {
  outline: none;
}
</style>
