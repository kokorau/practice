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

// Add a new stop
const addStop = () => {
  // Find a good position for the new stop (middle of largest gap)
  const sorted = sortedStops.value
  let bestPos = 0.5
  if (sorted.length >= 2) {
    let maxGap = 0
    let gapStart = 0
    for (let i = 0; i < sorted.length - 1; i++) {
      const gap = sorted[i + 1]!.position - sorted[i]!.position
      if (gap > maxGap) {
        maxGap = gap
        gapStart = sorted[i]!.position
      }
    }
    bestPos = gapStart + maxGap / 2
  }

  const newStop: GradientStop = {
    id: generateId(),
    color: 'B', // Default to brand color
    position: bestPos,
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
      <button class="add-btn" @click="addStop" title="Add color stop">+</button>
    </div>

    <!-- Gradient preview bar with handles -->
    <div class="gradient-bar-container">
      <div ref="barRef" class="gradient-bar" :style="gradientStyle">
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

.add-btn {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 0.25rem;
  background: oklch(0.55 0.15 250);
  color: white;
  border: none;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-btn:hover {
  background: oklch(0.50 0.18 250);
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
