<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

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

// Convert HSV to RGB
const hsvToRgb = (h: number, s: number, v: number): [number, number, number] => {
  s = s / 100
  v = v / 100
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x; b = 0 }
  else if (h < 120) { r = x; g = c; b = 0 }
  else if (h < 180) { r = 0; g = c; b = x }
  else if (h < 240) { r = 0; g = x; b = c }
  else if (h < 300) { r = x; g = 0; b = c }
  else { r = c; g = 0; b = x }
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255)
  ]
}

// Convert RGB to Hex
const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')
}

// Computed color values
const selectedRgb = computed(() => hsvToRgb(props.hue, props.saturation, props.value))
const selectedHex = computed(() => rgbToHex(...selectedRgb.value))
const hueColor = computed(() => rgbToHex(...hsvToRgb(props.hue, 100, 100)))

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
        <code class="hex-value">{{ selectedHex }}</code>
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
  aspect-ratio: 1;
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
