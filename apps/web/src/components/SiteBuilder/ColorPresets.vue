<script setup lang="ts">
import { computed } from 'vue'
import type { ColorPreset } from '@practice/semantic-color-palette/Domain'
import { COLOR_PRESETS } from '@practice/semantic-color-palette/Infra'
import { hsvToRgb, rgbToHex } from './utils'

const props = defineProps<{
  // Current brand HSV
  brandHue: number
  brandSaturation: number
  brandValue: number
  // Current accent HSV
  accentHue: number
  accentSaturation: number
  accentValue: number
  // Current foundation HSV
  foundationHue: number
  foundationSaturation: number
  foundationValue: number
}>()

const emit = defineEmits<{
  'apply-preset': [preset: ColorPreset]
}>()

// Convert HSV to hex for preview
const hsvToHex = (h: number, s: number, v: number): string => {
  const rgb = hsvToRgb(h, s, v)
  return rgbToHex(...rgb)
}

// Check if current values match a preset
const matchingPresetId = computed(() => {
  const tolerance = { hue: 1, sv: 2 }

  for (const preset of COLOR_PRESETS) {
    const brandMatch =
      Math.abs(preset.brand.hue - props.brandHue) < tolerance.hue &&
      Math.abs(preset.brand.saturation - props.brandSaturation) < tolerance.sv &&
      Math.abs(preset.brand.value - props.brandValue) < tolerance.sv

    const accentMatch =
      Math.abs(preset.accent.hue - props.accentHue) < tolerance.hue &&
      Math.abs(preset.accent.saturation - props.accentSaturation) < tolerance.sv &&
      Math.abs(preset.accent.value - props.accentValue) < tolerance.sv

    const foundationMatch =
      Math.abs(preset.foundation.hue - props.foundationHue) < tolerance.hue &&
      Math.abs(preset.foundation.saturation - props.foundationSaturation) < tolerance.sv &&
      Math.abs(preset.foundation.value - props.foundationValue) < tolerance.sv

    if (brandMatch && accentMatch && foundationMatch) {
      return preset.id
    }
  }
  return null
})

// Presets with computed preview colors
const presetsWithColors = computed(() => {
  return COLOR_PRESETS.map((preset) => ({
    ...preset,
    brandHex: hsvToHex(preset.brand.hue, preset.brand.saturation, preset.brand.value),
    accentHex: hsvToHex(preset.accent.hue, preset.accent.saturation, preset.accent.value),
    foundationHex: hsvToHex(preset.foundation.hue, preset.foundation.saturation, preset.foundation.value),
    isDark: preset.foundation.value < 50,
  }))
})

const handleApply = (preset: ColorPreset) => {
  emit('apply-preset', preset)
}
</script>

<template>
  <div class="color-presets">
    <p class="presets-description">
      Choose a color theme to get started quickly
    </p>

    <div class="preset-list">
      <button
        v-for="preset in presetsWithColors"
        :key="preset.id"
        class="preset-card"
        :class="{ selected: matchingPresetId === preset.id, dark: preset.isDark }"
        @click="handleApply(preset)"
      >
        <div class="preset-colors">
          <div
            class="color-swatch brand"
            :style="{ backgroundColor: preset.brandHex }"
          />
          <div
            class="color-swatch accent"
            :style="{ backgroundColor: preset.accentHex }"
          />
          <div
            class="color-swatch foundation"
            :style="{ backgroundColor: preset.foundationHex }"
          />
        </div>
        <div class="preset-info">
          <span class="preset-name">{{ preset.name }}</span>
          <span class="preset-desc">{{ preset.description }}</span>
        </div>
      </button>
    </div>
  </div>
</template>

<style scoped>
.color-presets {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.presets-description {
  margin: 0;
  font-size: 0.75rem;
  color: oklch(0.50 0.02 260);
}

:global(.dark) .presets-description {
  color: oklch(0.60 0.02 260);
}

.preset-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.preset-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: oklch(0.99 0.005 260);
  border: 2px solid transparent;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
}

:global(.dark) .preset-card {
  background: oklch(0.18 0.02 260);
}

.preset-card:hover {
  background: oklch(0.96 0.01 260);
  transform: translateY(-1px);
}

:global(.dark) .preset-card:hover {
  background: oklch(0.22 0.02 260);
}

.preset-card.selected {
  border-color: oklch(0.55 0.18 250);
  background: oklch(0.96 0.01 260);
}

:global(.dark) .preset-card.selected {
  border-color: oklch(0.55 0.16 250);
  background: oklch(0.22 0.02 260);
}

.preset-colors {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
}

.color-swatch {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid rgba(128, 128, 128, 0.2);
}

.color-swatch.brand {
  z-index: 3;
}

.color-swatch.accent {
  z-index: 2;
}

.color-swatch.foundation {
  z-index: 1;
}

.preset-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

.preset-name {
  font-size: 0.8rem;
  font-weight: 600;
  color: oklch(0.25 0.02 260);
}

:global(.dark) .preset-name {
  color: oklch(0.90 0.01 260);
}

.preset-desc {
  font-size: 0.65rem;
  color: oklch(0.50 0.02 260);
}

:global(.dark) .preset-desc {
  color: oklch(0.60 0.02 260);
}
</style>
