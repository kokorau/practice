<script setup lang="ts">
/**
 * GradientStopEditor
 *
 * Visual editor for gradient color stops with:
 * - Gradient preview bar with draggable handles
 * - Add/remove stops
 * - Position adjustment
 * - Color picker integration
 */
import { ref, computed, watch } from 'vue'
import type { PrimitivePalette } from '@practice/semantic-color-palette/Domain'
import type { ColorValue } from '@practice/section-visual'
import PrimitiveColorPicker from './PrimitiveColorPicker.vue'

export interface GradientStop {
  id: string
  color: ColorValue
  position: number // 0-1
}

const props = defineProps<{
  modelValue: GradientStop[]
  palette: PrimitivePalette
}>()

const emit = defineEmits<{
  'update:modelValue': [value: GradientStop[]]
}>()

// Selected stop for editing
const selectedStopId = ref<string | null>(null)

// Generate unique ID
const generateId = () => Math.random().toString(36).slice(2, 8)

// Sorted stops by position
const sortedStops = computed(() =>
  [...props.modelValue].sort((a, b) => a.position - b.position)
)

// Selected stop
const selectedStop = computed(() =>
  props.modelValue.find(s => s.id === selectedStopId.value)
)

// CSS gradient for preview
const gradientStyle = computed(() => {
  if (props.modelValue.length === 0) {
    return { background: '#888' }
  }
  const stops = sortedStops.value.map(s => {
    const color = getColorCss(s.color)
    return `${color} ${s.position * 100}%`
  }).join(', ')
  return { background: `linear-gradient(to right, ${stops})` }
})

// Convert ColorValue to CSS color
const getColorCss = (color: ColorValue): string => {
  if (typeof color === 'string') {
    // Handle 'auto' specially - use brand color as default
    if (color === 'auto') {
      const paletteColor = props.palette['B']
      return `oklch(${paletteColor.L} ${paletteColor.C} ${paletteColor.H})`
    }
    // Look up from palette using the key (cast to exclude 'theme' which is PaletteTheme, not Oklch)
    const paletteColor = props.palette[color as Exclude<keyof PrimitivePalette, 'theme'>]
    if (paletteColor) {
      return `oklch(${paletteColor.L} ${paletteColor.C} ${paletteColor.H})`
    }
    return '#888'
  }
  // Custom color (HSV)
  if (color && typeof color === 'object' && 'type' in color && color.type === 'custom') {
    const h = color.hue / 360
    const s = color.saturation / 100
    const v = color.value / 100
    // HSV to RGB conversion
    const c = v * s
    const x = c * (1 - Math.abs((h * 6) % 2 - 1))
    const m = v - c
    let r = 0, g = 0, b = 0
    const hh = h * 6
    if (hh < 1) { r = c; g = x; b = 0 }
    else if (hh < 2) { r = x; g = c; b = 0 }
    else if (hh < 3) { r = 0; g = c; b = x }
    else if (hh < 4) { r = 0; g = x; b = c }
    else if (hh < 5) { r = x; g = 0; b = c }
    else { r = c; g = 0; b = x }
    const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0')
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`
  }
  return '#888'
}

// Convert ColorValue to RGB for interpolation
const colorToRgb = (color: ColorValue): { r: number; g: number; b: number } => {
  if (typeof color === 'string') {
    if (color === 'auto') {
      const paletteColor = props.palette['B']
      return oklchToRgb(paletteColor.L, paletteColor.C, paletteColor.H)
    }
    const paletteColor = props.palette[color as Exclude<keyof PrimitivePalette, 'theme'>]
    if (paletteColor) {
      return oklchToRgb(paletteColor.L, paletteColor.C, paletteColor.H)
    }
    return { r: 136, g: 136, b: 136 }
  }
  if (color && typeof color === 'object' && 'type' in color && color.type === 'custom') {
    return hsvToRgb(color.hue, color.saturation, color.value)
  }
  return { r: 136, g: 136, b: 136 }
}

// Oklch to RGB conversion (approximate)
const oklchToRgb = (L: number, C: number, H: number): { r: number; g: number; b: number } => {
  // Simplified conversion via HSV approximation
  const h = H
  const s = Math.min(100, C * 100)
  const v = L * 100
  return hsvToRgb(h, s, v)
}

// HSV to RGB conversion
const hsvToRgb = (h: number, s: number, v: number): { r: number; g: number; b: number } => {
  const hNorm = h / 360
  const sNorm = s / 100
  const vNorm = v / 100
  const c = vNorm * sNorm
  const x = c * (1 - Math.abs((hNorm * 6) % 2 - 1))
  const m = vNorm - c
  let r = 0, g = 0, b = 0
  const hh = hNorm * 6
  if (hh < 1) { r = c; g = x; b = 0 }
  else if (hh < 2) { r = x; g = c; b = 0 }
  else if (hh < 3) { r = 0; g = c; b = x }
  else if (hh < 4) { r = 0; g = x; b = c }
  else if (hh < 5) { r = x; g = 0; b = c }
  else { r = c; g = 0; b = x }
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  }
}

// RGB to HSV conversion
const rgbToHsv = (r: number, g: number, b: number): { h: number; s: number; v: number } => {
  const rNorm = r / 255
  const gNorm = g / 255
  const bNorm = b / 255
  const max = Math.max(rNorm, gNorm, bNorm)
  const min = Math.min(rNorm, gNorm, bNorm)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === rNorm) h = ((gNorm - bNorm) / d) % 6
    else if (max === gNorm) h = (bNorm - rNorm) / d + 2
    else h = (rNorm - gNorm) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  const s = max === 0 ? 0 : d / max
  return { h, s: s * 100, v: max * 100 }
}

// Get interpolated color at position
const getColorAtPosition = (position: number): ColorValue => {
  const sorted = sortedStops.value
  if (sorted.length === 0) return 'B'
  if (sorted.length === 1) return sorted[0]!.color

  // Find surrounding stops
  let leftStop = sorted[0]!
  let rightStop = sorted[sorted.length - 1]!

  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i]!.position <= position && sorted[i + 1]!.position >= position) {
      leftStop = sorted[i]!
      rightStop = sorted[i + 1]!
      break
    }
  }

  // Handle edge cases
  if (position <= leftStop.position) return leftStop.color
  if (position >= rightStop.position) return rightStop.color

  // Interpolate
  const t = (position - leftStop.position) / (rightStop.position - leftStop.position)
  const leftRgb = colorToRgb(leftStop.color)
  const rightRgb = colorToRgb(rightStop.color)

  const r = Math.round(leftRgb.r + (rightRgb.r - leftRgb.r) * t)
  const g = Math.round(leftRgb.g + (rightRgb.g - leftRgb.g) * t)
  const b = Math.round(leftRgb.b + (rightRgb.b - leftRgb.b) * t)

  const hsv = rgbToHsv(r, g, b)
  return {
    type: 'custom',
    hue: Math.round(hsv.h),
    saturation: Math.round(hsv.s),
    value: Math.round(hsv.v),
  }
}

// Add stop at clicked position on gradient bar
const addStopAtPosition = (event: MouseEvent) => {
  if (!barRef.value) return
  // Ignore if clicking on a handle
  if ((event.target as HTMLElement).closest('.stop-handle')) return

  const rect = barRef.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const position = Math.max(0, Math.min(1, x / rect.width))

  const newStop: GradientStop = {
    id: generateId(),
    color: getColorAtPosition(position),
    position,
  }

  emit('update:modelValue', [...props.modelValue, newStop])
  selectedStopId.value = newStop.id
}

// Remove a stop
const removeStop = (id: string) => {
  if (props.modelValue.length <= 2) return // Keep at least 2 stops
  const newStops = props.modelValue.filter(s => s.id !== id)
  emit('update:modelValue', newStops)
  if (selectedStopId.value === id) {
    selectedStopId.value = newStops[0]?.id ?? null
  }
}

// Update stop position
const updatePosition = (id: string, position: number) => {
  const clampedPos = Math.max(0, Math.min(1, position))
  const newStops = props.modelValue.map(s =>
    s.id === id ? { ...s, position: clampedPos } : s
  )
  emit('update:modelValue', newStops)
}

// Update stop color
const updateColor = (id: string, color: ColorValue) => {
  const newStops = props.modelValue.map(s =>
    s.id === id ? { ...s, color } : s
  )
  emit('update:modelValue', newStops)
}

// Handle drag on gradient bar
const barRef = ref<HTMLElement | null>(null)
const draggingId = ref<string | null>(null)

const startDrag = (id: string, event: MouseEvent) => {
  event.preventDefault()
  draggingId.value = id
  selectedStopId.value = id
  window.addEventListener('mousemove', onDrag)
  window.addEventListener('mouseup', stopDrag)
}

const onDrag = (event: MouseEvent) => {
  if (!draggingId.value || !barRef.value) return
  const rect = barRef.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const position = x / rect.width
  updatePosition(draggingId.value, position)
}

const stopDrag = () => {
  draggingId.value = null
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', stopDrag)
}

// Select first stop on mount
watch(() => props.modelValue, (stops) => {
  if (stops.length > 0 && !selectedStopId.value) {
    selectedStopId.value = stops[0]?.id ?? null
  }
}, { immediate: true })
</script>

<template>
  <div class="gradient-stop-editor">
    <div class="editor-header">
      <span class="editor-label">Color Stops</span>
    </div>

    <!-- Gradient preview bar with handles (click to add stop) -->
    <div class="gradient-bar-container">
      <div ref="barRef" class="gradient-bar" :style="gradientStyle" @click="addStopAtPosition">
        <div
          v-for="stop in sortedStops"
          :key="stop.id"
          class="stop-handle"
          :class="{ selected: stop.id === selectedStopId }"
          :style="{ left: `${stop.position * 100}%` }"
          @mousedown="startDrag(stop.id, $event)"
          @click="selectedStopId = stop.id"
        >
          <div class="handle-color" :style="{ backgroundColor: getColorCss(stop.color) }" />
        </div>
      </div>
    </div>

    <!-- Selected stop editor -->
    <div v-if="selectedStop" class="stop-editor">
      <div class="stop-controls">
        <div class="color-control">
          <label>Color</label>
          <PrimitiveColorPicker
            :model-value="selectedStop.color"
            :palette="palette"
            @update:model-value="updateColor(selectedStop.id, $event)"
          />
        </div>
        <button
          class="remove-btn"
          :disabled="modelValue.length <= 2"
          @click="removeStop(selectedStop.id)"
          title="Remove stop"
        >
          Remove
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gradient-stop-editor {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.editor-label {
  font-size: 0.75rem;
  color: oklch(0.40 0.02 260);
}

:global(.dark) .editor-label {
  color: oklch(0.70 0.02 260);
}

.gradient-bar-container {
  position: relative;
  padding: 0.75rem 0;
}

.gradient-bar {
  position: relative;
  height: 1.5rem;
  border-radius: 0.25rem;
  border: 1px solid oklch(0.80 0.02 260);
  cursor: crosshair;
}

:global(.dark) .gradient-bar {
  border-color: oklch(0.35 0.02 260);
}

.stop-handle {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 1rem;
  height: 1.5rem;
  cursor: grab;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stop-handle:active {
  cursor: grabbing;
}

.stop-handle::before {
  content: '';
  position: absolute;
  top: -0.25rem;
  width: 0;
  height: 0;
  border-left: 0.35rem solid transparent;
  border-right: 0.35rem solid transparent;
  border-top: 0.35rem solid oklch(0.50 0.02 260);
}

.stop-handle.selected::before {
  border-top-color: oklch(0.55 0.20 250);
}

.handle-color {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 0.125rem;
  border: 2px solid white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  margin-top: 0.5rem;
}

.stop-editor {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem;
  background: oklch(0.96 0.01 260);
  border-radius: 0.375rem;
}

:global(.dark) .stop-editor {
  background: oklch(0.20 0.02 260);
}

.stop-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.remove-btn {
  padding: 0.25rem 0.5rem;
  font-size: 0.65rem;
  background: oklch(0.60 0.15 20);
  color: white;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
}

.remove-btn:hover:not(:disabled) {
  background: oklch(0.55 0.18 20);
}

.remove-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.color-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.color-control label {
  font-size: 0.7rem;
  color: oklch(0.50 0.02 260);
  min-width: 3rem;
}

:global(.dark) .color-control label {
  color: oklch(0.60 0.02 260);
}
</style>
