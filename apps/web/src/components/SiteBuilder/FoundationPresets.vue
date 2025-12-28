<script setup lang="ts">
import { computed } from 'vue'
import { $Oklch, contrastRatio } from '@practice/color'
import type { Oklch } from '@practice/color'
import { $ColorPairValidation } from '../../modules/SemanticColorPalette/Domain'
import { FOUNDATION_PRESETS } from './foundationPresets'

const MIN_FOUNDATION_BRAND_CONTRAST = 2

const props = defineProps<{
  selectedId: string
  brandOklch: Oklch
  brandHue: number
}>()

const emit = defineEmits<{
  'update:selectedId': [value: string]
}>()

// Get the selected preset
const selectedPreset = computed(() =>
  FOUNDATION_PRESETS.find((p) => p.id === props.selectedId) ?? FOUNDATION_PRESETS[0]!
)

// Compute foundation color from selected preset
const foundationColor = computed((): { oklch: Oklch; css: string; hex: string } => {
  const preset = selectedPreset.value
  const presetHue = preset.H === 'brand' ? props.brandHue : preset.H
  const oklch: Oklch = { L: preset.L, C: preset.C, H: presetHue }
  return {
    oklch,
    css: $Oklch.toCss(oklch),
    hex: (() => {
      const srgb = $Oklch.toSrgb(oklch)
      const toHex = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')
      return `#${toHex(srgb.r)}${toHex(srgb.g)}${toHex(srgb.b)}`
    })(),
  }
})

// Check contrast for each preset against current brand
const presetsWithContrast = computed(() => {
  const brandText = $ColorPairValidation.deriveBrandText(props.brandOklch)
  return FOUNDATION_PRESETS.map((preset) => {
    const presetHue = preset.H === 'brand' ? props.brandHue : preset.H
    const presetOklch: Oklch = { L: preset.L, C: preset.C, H: presetHue }
    const ratio = contrastRatio(brandText, presetOklch)
    const meetsMinContrast = ratio >= MIN_FOUNDATION_BRAND_CONTRAST
    return {
      ...preset,
      resolvedH: presetHue,
      meetsMinContrast,
    }
  })
})

// Group presets by theme
const lightPresets = computed(() =>
  presetsWithContrast.value.filter((p) => p.L > 0.5)
)
const darkPresets = computed(() =>
  presetsWithContrast.value.filter((p) => p.L <= 0.5)
)

// Expose for parent
defineExpose({
  foundationColor,
  selectedPreset,
})
</script>

<template>
  <div class="foundation-presets">
    <!-- Light Theme Presets -->
    <div class="preset-group">
      <span class="preset-group-label">Light</span>
      <div class="preset-options">
        <button
          v-for="preset in lightPresets"
          :key="preset.id"
          class="preset-button"
          :class="{
            selected: selectedId === preset.id,
            warning: !preset.meetsMinContrast,
          }"
          :style="{ backgroundColor: `oklch(${preset.L} ${preset.C} ${preset.resolvedH})` }"
          @click="emit('update:selectedId', preset.id)"
        >
          <span class="preset-label">{{ preset.label }}</span>
          <span v-if="!preset.meetsMinContrast" class="preset-warning-icon">!</span>
        </button>
      </div>
    </div>

    <!-- Dark Theme Presets -->
    <div class="preset-group">
      <span class="preset-group-label">Dark</span>
      <div class="preset-options">
        <button
          v-for="preset in darkPresets"
          :key="preset.id"
          class="preset-button preset-button--dark"
          :class="{
            selected: selectedId === preset.id,
            warning: !preset.meetsMinContrast,
          }"
          :style="{ backgroundColor: `oklch(${preset.L} ${preset.C} ${preset.resolvedH})` }"
          @click="emit('update:selectedId', preset.id)"
        >
          <span class="preset-label">{{ preset.label }}</span>
          <span v-if="!preset.meetsMinContrast" class="preset-warning-icon">!</span>
        </button>
      </div>
    </div>

    <!-- Selected Foundation Preview -->
    <div class="color-preview-section">
      <div
        class="color-preview"
        :style="{ backgroundColor: foundationColor.hex }"
      />
      <div class="color-values">
        <code class="hex-value">{{ foundationColor.hex }}</code>
        <div class="hsv-values">
          <span>{{ selectedPreset.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Foundation Color Presets */
.preset-group {
  margin-bottom: 0.75rem;
}

.preset-group-label {
  display: block;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: oklch(0.50 0.02 260);
  margin-bottom: 0.375rem;
}

:global(.dark) .preset-group-label {
  color: oklch(0.60 0.02 260);
}

.preset-options {
  display: flex;
  gap: 0.375rem;
}

.preset-button {
  position: relative;
  flex: 1;
  padding: 0.5rem 0.25rem;
  border: 2px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.preset-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.preset-button.selected {
  border-color: oklch(0.55 0.18 250);
  box-shadow: 0 0 0 2px oklch(0.55 0.18 250 / 0.3);
}

.preset-button.warning {
  opacity: 0.6;
}

.preset-button.warning:not(.selected) {
  border-color: oklch(0.70 0.15 30);
}

.preset-label {
  display: block;
  font-size: 0.6rem;
  font-weight: 600;
  text-align: center;
  color: oklch(0.25 0.02 260);
}

/* Dark preset labels need light text */
.preset-button--dark .preset-label {
  color: white;
}

.preset-warning-icon {
  position: absolute;
  top: -4px;
  right: -4px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  background: oklch(0.65 0.20 30);
  color: white;
  border-radius: 50%;
  font-size: 0.55rem;
  font-weight: 700;
}

/* Color Preview */
.color-preview-section {
  display: flex;
  gap: 12px;
  margin-top: 16px;
  align-items: center;
}

.color-preview {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  border: 1px solid rgba(128, 128, 128, 0.2);
  flex-shrink: 0;
}

.color-values {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.hex-value {
  font-size: 0.875rem;
  font-family: 'SF Mono', Monaco, monospace;
  font-weight: 600;
  color: oklch(0.25 0.02 260);
}

:global(.dark) .hex-value {
  color: oklch(0.90 0.01 260);
}

.hsv-values {
  display: flex;
  gap: 8px;
  font-size: 0.7rem;
  color: oklch(0.50 0.02 260);
}

:global(.dark) .hsv-values {
  color: oklch(0.60 0.02 260);
}
</style>
