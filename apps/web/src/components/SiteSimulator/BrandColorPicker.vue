<script setup lang="ts">
import { computed } from 'vue'
import type { Oklch } from '../../modules/Color/Domain/ValueObject/Oklch'
import { $Oklch } from '../../modules/Color/Domain/ValueObject/Oklch'
import { $Srgb } from '../../modules/Color/Domain/ValueObject/Srgb'

const props = defineProps<{
  modelValue: Oklch
}>()

const emit = defineEmits<{
  'update:modelValue': [oklch: Oklch]
}>()

// Convert OKLCH to HEX for the color input (sRGB limitation of browser)
const hexValue = computed(() => {
  const srgb = $Oklch.toSrgb(props.modelValue)
  return $Srgb.toHex(srgb)
})

// CSS color for preview swatch (Display-P3)
const cssP3Color = computed(() => $Oklch.toCssP3(props.modelValue))

// OKLCH slider handlers - update directly without sRGB conversion
const handleLChange = (e: Event) => {
  const value = parseFloat((e.target as HTMLInputElement).value)
  emit('update:modelValue', $Oklch.create(value, props.modelValue.C, props.modelValue.H))
}

const handleCChange = (e: Event) => {
  const value = parseFloat((e.target as HTMLInputElement).value)
  emit('update:modelValue', $Oklch.create(props.modelValue.L, value, props.modelValue.H))
}

const handleHChange = (e: Event) => {
  const value = parseFloat((e.target as HTMLInputElement).value)
  emit('update:modelValue', $Oklch.create(props.modelValue.L, props.modelValue.C, value))
}

// sRGB color picker (limited but convenient for initial selection)
const handleColorChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  const srgb = $Srgb.fromHex(target.value)
  if (srgb) {
    emit('update:modelValue', $Oklch.fromSrgb(srgb))
  }
}

const handleTextChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  let value = target.value.trim()
  if (!value.startsWith('#')) value = '#' + value
  if (/^#[0-9a-fA-F]{6}$/.test(value)) {
    const srgb = $Srgb.fromHex(value)
    if (srgb) {
      emit('update:modelValue', $Oklch.fromSrgb(srgb))
    }
  }
}
</script>

<template>
  <div class="brand-color-picker">
    <div class="flex items-start gap-4">
      <!-- P3 color preview swatch with sRGB picker -->
      <div class="flex flex-col items-center gap-2">
        <div
          class="w-16 h-16 rounded cursor-pointer relative overflow-hidden border border-gray-600"
          :style="{ backgroundColor: cssP3Color }"
        >
          <!-- Hidden color input overlay -->
          <input
            type="color"
            :value="hexValue"
            class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            @input="handleColorChange"
          />
        </div>
        <input
          type="text"
          :value="hexValue"
          class="bg-gray-700 px-2 py-1 rounded text-xs font-mono w-20 text-center"
          @change="handleTextChange"
        />
      </div>

      <!-- OKLCH Sliders -->
      <div class="flex-1 space-y-2">
        <!-- Lightness -->
        <div class="slider-row">
          <label class="slider-label">L</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            :value="modelValue.L"
            class="slider"
            @input="handleLChange"
          />
          <span class="slider-value">{{ modelValue.L.toFixed(2) }}</span>
        </div>

        <!-- Chroma -->
        <div class="slider-row">
          <label class="slider-label">C</label>
          <input
            type="range"
            min="0"
            max="0.4"
            step="0.01"
            :value="modelValue.C"
            class="slider"
            @input="handleCChange"
          />
          <span class="slider-value">{{ modelValue.C.toFixed(2) }}</span>
        </div>

        <!-- Hue -->
        <div class="slider-row">
          <label class="slider-label">H</label>
          <input
            type="range"
            min="0"
            max="360"
            step="1"
            :value="modelValue.H"
            class="slider hue-slider"
            @input="handleHChange"
          />
          <span class="slider-value">{{ modelValue.H.toFixed(0) }}°</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
input[type='color'] {
  -webkit-appearance: none;
  padding: 0;
}

input[type='color']::-webkit-color-swatch-wrapper {
  padding: 0;
}

input[type='color']::-webkit-color-swatch {
  border: none;
  border-radius: 6px;
}

.slider-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.slider-label {
  width: 16px;
  font-size: 12px;
  font-family: monospace;
  color: #9ca3af;
}

.slider {
  flex: 1;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: #374151;
  border-radius: 3px;
  cursor: pointer;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  background: #fff;
  border-radius: 50%;
  cursor: pointer;
}

.hue-slider {
  background: linear-gradient(
    to right,
    oklch(0.7 0.15 0),
    oklch(0.7 0.15 60),
    oklch(0.7 0.15 120),
    oklch(0.7 0.15 180),
    oklch(0.7 0.15 240),
    oklch(0.7 0.15 300),
    oklch(0.7 0.15 360)
  );
}

.slider-value {
  width: 40px;
  font-size: 11px;
  font-family: monospace;
  color: #9ca3af;
  text-align: right;
}
</style>
