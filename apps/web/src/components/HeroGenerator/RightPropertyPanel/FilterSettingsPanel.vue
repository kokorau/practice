<script setup lang="ts">
/**
 * FilterSettingsPanel
 *
 * Panel for editing filter processor parameters (exposure, contrast, etc.)
 */
import { computed } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import type { FilterProcessorConfig } from '@practice/section-visual'
import { $PropertyValue } from '@practice/section-visual'

const props = defineProps<{
  filterConfig: FilterProcessorConfig
}>()

const emit = defineEmits<{
  'update:param': [key: keyof FilterProcessorConfig['params'], value: number]
}>()

// Debounce delay for slider updates
const DEBOUNCE_MS = 16

// Helper to get current value from PropertyValue
const getValue = (key: keyof FilterProcessorConfig['params']): number => {
  const pv = props.filterConfig.params[key]
  if ($PropertyValue.isStatic(pv)) {
    return pv.value as number
  }
  if ($PropertyValue.isRange(pv)) {
    return pv.min
  }
  return 0
}

// Computed values for each parameter
const exposure = computed(() => getValue('exposure'))
const brightness = computed(() => getValue('brightness'))
const contrast = computed(() => getValue('contrast'))
const highlights = computed(() => getValue('highlights'))
const shadows = computed(() => getValue('shadows'))
const temperature = computed(() => getValue('temperature'))
const tint = computed(() => getValue('tint'))

// Create debounced handler factory
const createHandler = (key: keyof FilterProcessorConfig['params']) => {
  const debounced = useDebounceFn((value: number) => {
    emit('update:param', key, value)
  }, DEBOUNCE_MS)
  return (e: Event) => {
    const value = parseFloat((e.target as HTMLInputElement).value)
    debounced(value)
  }
}

// Handlers for each parameter
const handlers = {
  exposure: createHandler('exposure'),
  brightness: createHandler('brightness'),
  contrast: createHandler('contrast'),
  highlights: createHandler('highlights'),
  shadows: createHandler('shadows'),
  temperature: createHandler('temperature'),
  tint: createHandler('tint'),
}

// Format value for display
const formatValue = (value: number, decimals: number = 2): string => {
  return value.toFixed(decimals)
}
</script>

<template>
  <div class="filter-settings">
    <div class="filter-section">
      <div class="section-title">Light</div>

      <label class="slider-row">
        <span class="slider-label">Exposure</span>
        <input
          type="range"
          min="-2"
          max="2"
          step="0.01"
          :value="exposure"
          @input="handlers.exposure"
          class="slider"
        />
        <span class="slider-value">{{ formatValue(exposure) }}</span>
      </label>

      <label class="slider-row">
        <span class="slider-label">Brightness</span>
        <input
          type="range"
          min="-1"
          max="1"
          step="0.01"
          :value="brightness"
          @input="handlers.brightness"
          class="slider"
        />
        <span class="slider-value">{{ formatValue(brightness) }}</span>
      </label>

      <label class="slider-row">
        <span class="slider-label">Contrast</span>
        <input
          type="range"
          min="-1"
          max="1"
          step="0.01"
          :value="contrast"
          @input="handlers.contrast"
          class="slider"
        />
        <span class="slider-value">{{ formatValue(contrast) }}</span>
      </label>

      <label class="slider-row">
        <span class="slider-label">Highlights</span>
        <input
          type="range"
          min="-1"
          max="1"
          step="0.01"
          :value="highlights"
          @input="handlers.highlights"
          class="slider"
        />
        <span class="slider-value">{{ formatValue(highlights) }}</span>
      </label>

      <label class="slider-row">
        <span class="slider-label">Shadows</span>
        <input
          type="range"
          min="-1"
          max="1"
          step="0.01"
          :value="shadows"
          @input="handlers.shadows"
          class="slider"
        />
        <span class="slider-value">{{ formatValue(shadows) }}</span>
      </label>
    </div>

    <div class="filter-section">
      <div class="section-title">Color</div>

      <label class="slider-row">
        <span class="slider-label">Temperature</span>
        <input
          type="range"
          min="-1"
          max="1"
          step="0.01"
          :value="temperature"
          @input="handlers.temperature"
          class="slider temperature-slider"
        />
        <span class="slider-value">{{ formatValue(temperature) }}</span>
      </label>

      <label class="slider-row">
        <span class="slider-label">Tint</span>
        <input
          type="range"
          min="-1"
          max="1"
          step="0.01"
          :value="tint"
          @input="handlers.tint"
          class="slider tint-slider"
        />
        <span class="slider-value">{{ formatValue(tint) }}</span>
      </label>
    </div>
  </div>
</template>

<style scoped>
.filter-settings {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.filter-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.section-title {
  font-size: 0.6875rem;
  font-weight: 500;
  color: oklch(0.50 0.02 260);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

:global(.dark) .section-title {
  color: oklch(0.60 0.02 260);
}

.slider-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.slider-label {
  width: 5rem;
  flex-shrink: 0;
  font-size: 0.75rem;
  color: oklch(0.40 0.02 260);
}

:global(.dark) .slider-label {
  color: oklch(0.70 0.02 260);
}

.slider {
  flex: 1;
  height: 0.375rem;
  background: oklch(0.90 0.01 260);
  border-radius: 0.25rem;
  appearance: none;
  cursor: pointer;
}

:global(.dark) .slider {
  background: oklch(0.25 0.02 260);
}

.slider::-webkit-slider-thumb {
  appearance: none;
  width: 0.875rem;
  height: 0.875rem;
  background: oklch(0.55 0.15 250);
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.1s;
}

.slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
}

.temperature-slider {
  background: linear-gradient(to right, oklch(0.70 0.15 250), oklch(0.85 0.01 260), oklch(0.75 0.15 80));
}

:global(.dark) .temperature-slider {
  background: linear-gradient(to right, oklch(0.50 0.15 250), oklch(0.30 0.01 260), oklch(0.55 0.15 80));
}

.tint-slider {
  background: linear-gradient(to right, oklch(0.70 0.15 150), oklch(0.85 0.01 260), oklch(0.70 0.15 330));
}

:global(.dark) .tint-slider {
  background: linear-gradient(to right, oklch(0.50 0.15 150), oklch(0.30 0.01 260), oklch(0.50 0.15 330));
}

.slider-value {
  width: 2.5rem;
  flex-shrink: 0;
  font-size: 0.6875rem;
  color: oklch(0.50 0.02 260);
  text-align: right;
  font-variant-numeric: tabular-nums;
}

:global(.dark) .slider-value {
  color: oklch(0.60 0.02 260);
}
</style>
