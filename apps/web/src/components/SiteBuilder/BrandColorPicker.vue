<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { hsvToRgb, rgbToHex, hexToHsv } from './utils/colorConversion'

const props = defineProps<{
  hue: number
  saturation: number
  value: number
}>()

const emit = defineEmits<{
  'update:hue': [value: number]
  'update:saturation': [value: number]
  'update:value': [value: number]
}>()

// Color picker interaction
const isDraggingSV = ref(false)
const isDraggingHue = ref(false)
const svPickerRef = ref<HTMLDivElement | null>(null)
const hueSliderRef = ref<HTMLDivElement | null>(null)

// Computed color values
const selectedRgb = computed(() => hsvToRgb(props.hue, props.saturation, props.value))
const selectedHex = computed(() => rgbToHex(...selectedRgb.value))
const hueColor = computed(() => rgbToHex(...hsvToRgb(props.hue, 100, 100)))

// HEX input state
const hexInput = ref(selectedHex.value)
const isHexValid = ref(true)

// Sync hexInput when selectedHex changes (from picker interaction)
watch(selectedHex, (newHex) => {
  if (!isDraggingSV.value && !isDraggingHue.value) {
    hexInput.value = newHex
    isHexValid.value = true
  }
})

// Handle HEX input
const handleHexInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  let value = target.value

  // Add # if not present
  if (value && !value.startsWith('#')) {
    value = '#' + value
  }

  hexInput.value = value

  // Validate and convert
  const hsv = hexToHsv(value)
  if (hsv) {
    isHexValid.value = true
    emit('update:hue', hsv[0])
    emit('update:saturation', hsv[1])
    emit('update:value', hsv[2])
  } else {
    isHexValid.value = value.length < 7 // Still typing
  }
}

// Handle blur - reset to valid value if invalid
const handleHexBlur = () => {
  if (!isHexValid.value || !hexToHsv(hexInput.value)) {
    hexInput.value = selectedHex.value
    isHexValid.value = true
  }
}

// SV Picker handlers
const handleSVMouseDown = (e: MouseEvent) => {
  isDraggingSV.value = true
  updateSV(e)
}

const updateSV = (e: MouseEvent) => {
  if (!svPickerRef.value) return
  const rect = svPickerRef.value.getBoundingClientRect()
  const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
  const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height))
  emit('update:saturation', Math.round((x / rect.width) * 100))
  emit('update:value', Math.round(100 - (y / rect.height) * 100))
}

// Hue Slider handlers
const handleHueMouseDown = (e: MouseEvent) => {
  isDraggingHue.value = true
  updateHue(e)
}

const updateHue = (e: MouseEvent) => {
  if (!hueSliderRef.value) return
  const rect = hueSliderRef.value.getBoundingClientRect()
  const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
  emit('update:hue', Math.round((x / rect.width) * 360))
}

// Global mouse handlers
const handleMouseMove = (e: MouseEvent) => {
  if (isDraggingSV.value) updateSV(e)
  if (isDraggingHue.value) updateHue(e)
}

const handleMouseUp = () => {
  isDraggingSV.value = false
  isDraggingHue.value = false
}

onMounted(() => {
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', handleMouseUp)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', handleMouseUp)
})
</script>

<template>
  <div class="brand-color-picker">
    <!-- SV Picker (Saturation-Value) -->
    <div
      ref="svPickerRef"
      class="sv-picker"
      :style="{ backgroundColor: hueColor }"
      @mousedown="handleSVMouseDown"
    >
      <div class="sv-picker-white" />
      <div class="sv-picker-black" />
      <div
        class="sv-picker-cursor"
        :style="{
          left: `${saturation}%`,
          top: `${100 - value}%`,
        }"
      />
    </div>

    <!-- Hue Slider -->
    <div
      ref="hueSliderRef"
      class="hue-slider"
      @mousedown="handleHueMouseDown"
    >
      <div
        class="hue-slider-cursor"
        :style="{ left: `${(hue / 360) * 100}%` }"
      />
    </div>

    <!-- Brand Color Preview -->
    <div class="color-preview-section">
      <div
        class="color-preview"
        :style="{ backgroundColor: selectedHex }"
      />
      <div class="color-values">
        <input
          type="text"
          class="hex-input"
          :class="{ invalid: !isHexValid }"
          :value="hexInput"
          maxlength="7"
          @input="handleHexInput"
          @blur="handleHexBlur"
        />
        <div class="hsv-values">
          <span>H: {{ hue }}°</span>
          <span>S: {{ saturation }}%</span>
          <span>V: {{ value }}%</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* SV Picker */
.sv-picker {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 8px;
  cursor: crosshair;
  overflow: hidden;
}

.sv-picker-white {
  position: absolute;
  inset: 0;
  background: linear-gradient(to right, white, transparent);
}

.sv-picker-black {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, black, transparent);
}

.sv-picker-cursor {
  position: absolute;
  width: 14px;
  height: 14px;
  border: 2px solid white;
  border-radius: 50%;
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.5), inset 0 0 2px rgba(0, 0, 0, 0.3);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

/* Hue Slider */
.hue-slider {
  position: relative;
  width: 100%;
  height: 16px;
  margin-top: 12px;
  border-radius: 8px;
  background: linear-gradient(
    to right,
    hsl(0, 100%, 50%),
    hsl(60, 100%, 50%),
    hsl(120, 100%, 50%),
    hsl(180, 100%, 50%),
    hsl(240, 100%, 50%),
    hsl(300, 100%, 50%),
    hsl(360, 100%, 50%)
  );
  cursor: pointer;
}

.hue-slider-cursor {
  position: absolute;
  top: 50%;
  width: 6px;
  height: 20px;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.3);
  border-radius: 3px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transform: translate(-50%, -50%);
  pointer-events: none;
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

.hex-input {
  width: 5.5rem;
  padding: 0.125rem 0.25rem;
  margin-left: -0.25rem;
  font-size: 0.875rem;
  font-family: 'SF Mono', Monaco, monospace;
  font-weight: 600;
  color: oklch(0.25 0.02 260);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 0.25rem;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
}

.hex-input:hover {
  background: oklch(0.96 0.01 260);
  border-color: oklch(0.85 0.01 260);
}

.hex-input:focus {
  background: oklch(0.96 0.01 260);
  border-color: oklch(0.55 0.18 250);
  box-shadow: 0 0 0 2px oklch(0.55 0.18 250 / 0.2);
}

.hex-input.invalid {
  border-color: oklch(0.65 0.2 25);
}

:global(.dark) .hex-input:hover {
  background: oklch(0.20 0.02 260);
  border-color: oklch(0.30 0.02 260);
}

:global(.dark) .hex-input {
  color: oklch(0.90 0.01 260);
}

:global(.dark) .hex-input:focus {
  background: oklch(0.20 0.02 260);
  border-color: oklch(0.65 0.18 250);
  box-shadow: 0 0 0 2px oklch(0.65 0.18 250 / 0.2);
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
