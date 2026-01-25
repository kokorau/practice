<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { $Oklch } from '@practice/color'
import type { PrimitivePalette, PrimitiveKey } from '@practice/semantic-color-palette/Domain'
import {
  BRAND_KEYS,
  ACCENT_KEYS,
  FOUNDATION_KEYS,
  NEUTRAL_KEYS,
  ACCENT_RAMP_KEYS,
} from '@practice/semantic-color-palette/Domain'
import type { ColorValue, CustomColor } from '@practice/section-visual'
import { isCustomColor } from '@practice/section-visual'
import BrandColorPicker from '../SiteBuilder/BrandColorPicker.vue'
import { hsvToRgb, rgbToHex } from '../SiteBuilder/utils/colorConversion'

const props = defineProps<{
  modelValue: ColorValue
  palette: PrimitivePalette
  label?: string
  showAuto?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: ColorValue]
}>()

const isOpen = ref(false)
const isCustomMode = ref(false)
const pickerRef = ref<HTMLElement | null>(null)
const popupRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLElement | null>(null)
const popupStyle = ref<{ top: string; left?: string; right?: string }>({ top: '0', left: '0' })

// Custom color state
const customHue = ref(0)
const customSaturation = ref(100)
const customValue = ref(50)

// Initialize custom color from modelValue if it's a CustomColor
watch(
  () => props.modelValue,
  (val) => {
    if (isCustomColor(val)) {
      customHue.value = val.hue
      customSaturation.value = val.saturation
      customValue.value = val.value
    }
  },
  { immediate: true }
)

// Group colors for display
const colorGroups = computed(() => [
  { name: 'Brand', keys: BRAND_KEYS },
  { name: 'Accent', keys: ACCENT_KEYS },
  { name: 'Foundation', keys: FOUNDATION_KEYS },
  { name: 'Brand Neutral', keys: NEUTRAL_KEYS },
  { name: 'Accent Neutral', keys: ACCENT_RAMP_KEYS },
])

const getColorStyle = (key: PrimitiveKey) => ({
  backgroundColor: $Oklch.toCss(props.palette[key]),
})

// Get hex color from HSV for custom color preview
const customColorHex = computed(() => {
  const [r, g, b] = hsvToRgb(customHue.value, customSaturation.value, customValue.value)
  return rgbToHex(r, g, b)
})

// Current selected color preview style
const selectedColorStyle = computed(() => {
  if (props.modelValue === 'auto') {
    return {} // Auto uses gradient background from CSS
  }
  if (isCustomColor(props.modelValue)) {
    return { backgroundColor: customColorHex.value }
  }
  return getColorStyle(props.modelValue)
})

const selectedLabel = computed(() => {
  if (props.modelValue === 'auto') return 'Auto'
  if (isCustomColor(props.modelValue)) return 'Custom'
  return props.modelValue
})

const togglePopup = async () => {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    // Reset custom mode when opening
    isCustomMode.value = isCustomColor(props.modelValue)
    await nextTick()
    updatePopupPosition()
  }
}

const updatePopupPosition = () => {
  if (!triggerRef.value || !popupRef.value) return

  const triggerRect = triggerRef.value.getBoundingClientRect()
  const popupRect = popupRef.value.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const gap = 4 // 0.25rem

  const top = triggerRect.bottom + gap
  const leftAligned = triggerRect.left
  const rightOverflow = leftAligned + popupRect.width > viewportWidth

  if (rightOverflow) {
    // Align to right edge of trigger
    popupStyle.value = {
      top: `${top}px`,
      left: undefined,
      right: `${viewportWidth - triggerRect.right}px`,
    }
  } else {
    popupStyle.value = {
      top: `${top}px`,
      left: `${leftAligned}px`,
      right: undefined,
    }
  }
}

const selectColor = (key: PrimitiveKey | 'auto') => {
  emit('update:modelValue', key)
  isOpen.value = false
  isCustomMode.value = false
}

const toggleCustomMode = () => {
  isCustomMode.value = !isCustomMode.value
  if (isCustomMode.value) {
    // Initialize from current color if it's a CustomColor
    if (isCustomColor(props.modelValue)) {
      customHue.value = props.modelValue.hue
      customSaturation.value = props.modelValue.saturation
      customValue.value = props.modelValue.value
    }
    // Re-calculate position after mode change
    nextTick(() => updatePopupPosition())
  }
}

const applyCustomColor = () => {
  const customColor: CustomColor = {
    type: 'custom',
    hue: customHue.value,
    saturation: customSaturation.value,
    value: customValue.value,
  }
  emit('update:modelValue', customColor)
  isOpen.value = false
  isCustomMode.value = false
}

const cancelCustomMode = () => {
  isCustomMode.value = false
  // Restore values if current modelValue is a CustomColor
  if (isCustomColor(props.modelValue)) {
    customHue.value = props.modelValue.hue
    customSaturation.value = props.modelValue.saturation
    customValue.value = props.modelValue.value
  }
}

// Close on outside click
const handleClickOutside = (event: MouseEvent) => {
  if (pickerRef.value && !pickerRef.value.contains(event.target as Node)) {
    isOpen.value = false
    isCustomMode.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div ref="pickerRef" class="primitive-color-picker">
    <!-- Trigger button -->
    <button
      ref="triggerRef"
      class="picker-trigger"
      @click="togglePopup"
    >
      <span
        class="trigger-swatch"
        :class="{ 'auto-swatch': modelValue === 'auto' }"
        :style="selectedColorStyle"
      />
      <span class="trigger-value">{{ selectedLabel }}</span>
      <span class="material-icons trigger-arrow" :class="{ open: isOpen }">expand_more</span>
    </button>

    <!-- Popup panel -->
    <Transition name="popup">
      <div v-if="isOpen" ref="popupRef" class="picker-popup" :style="popupStyle">
        <!-- Custom mode: HSV color picker -->
        <template v-if="isCustomMode">
          <div class="custom-picker-header">
            <button class="back-button" @click="cancelCustomMode">
              <span class="material-icons">arrow_back</span>
            </button>
            <span class="custom-picker-title">Custom Color</span>
          </div>
          <BrandColorPicker
            :hue="customHue"
            :saturation="customSaturation"
            :value="customValue"
            @update:hue="customHue = $event"
            @update:saturation="customSaturation = $event"
            @update:value="customValue = $event"
          />
          <div class="custom-picker-actions">
            <button class="action-button cancel" @click="cancelCustomMode">Cancel</button>
            <button class="action-button apply" @click="applyCustomColor">Apply</button>
          </div>
        </template>

        <!-- Normal mode: Palette selection -->
        <template v-else>
          <!-- Auto and Custom options -->
          <div v-if="showAuto" class="color-group special-options">
            <button
              class="color-chip auto-chip"
              :class="{ active: modelValue === 'auto' }"
              @click="selectColor('auto')"
              title="Auto"
            >
              <span class="auto-icon">A</span>
            </button>
            <button
              class="color-chip custom-chip"
              :class="{ active: isCustomColor(modelValue) }"
              @click="toggleCustomMode"
              title="Custom Color"
            >
              <span class="rainbow-icon">🌈</span>
            </button>
          </div>

          <!-- Color groups -->
          <div
            v-for="group in colorGroups"
            :key="group.name"
            class="color-group"
          >
            <span class="group-label">{{ group.name }}</span>
            <div class="color-row">
              <button
                v-for="key in group.keys"
                :key="key"
                class="color-chip"
                :class="{ active: modelValue === key }"
                :style="getColorStyle(key)"
                :title="key"
                @click="selectColor(key)"
              />
            </div>
          </div>
        </template>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.primitive-color-picker {
  position: relative;
}

/* Trigger Button */
.picker-trigger {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  width: 100%;
  padding: 0.375rem 0.5rem;
  background: oklch(0.96 0.01 260);
  border: 1px solid oklch(0.85 0.01 260);
  border-radius: 0.375rem;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.dark .picker-trigger {
  background: oklch(0.18 0.02 260);
  border-color: oklch(0.30 0.02 260);
}

.picker-trigger:hover {
  border-color: oklch(0.70 0.01 260);
}

.dark .picker-trigger:hover {
  border-color: oklch(0.40 0.02 260);
}

.trigger-swatch {
  width: 1rem;
  height: 1rem;
  border-radius: 0.1875rem;
  border: 1px solid oklch(0.80 0.01 260);
  flex-shrink: 0;
}

.trigger-swatch.auto-swatch {
  background: linear-gradient(135deg,
    oklch(0.90 0.01 260) 0%,
    oklch(0.70 0.01 260) 50%,
    oklch(0.50 0.01 260) 100%
  );
}

.dark .trigger-swatch {
  border-color: oklch(0.35 0.02 260);
}

.dark .trigger-swatch.auto-swatch {
  background: linear-gradient(135deg,
    oklch(0.30 0.01 260) 0%,
    oklch(0.50 0.01 260) 50%,
    oklch(0.70 0.01 260) 100%
  );
}

.trigger-value {
  flex: 1;
  font-size: 0.75rem;
  font-weight: 500;
  color: oklch(0.25 0.02 260);
  text-align: left;
}

.dark .trigger-value {
  color: oklch(0.85 0.02 260);
}

.trigger-arrow {
  font-size: 1rem;
  color: oklch(0.50 0.02 260);
  transition: transform 0.15s;
}

.trigger-arrow.open {
  transform: rotate(180deg);
}

.dark .trigger-arrow {
  color: oklch(0.60 0.02 260);
}

/* Popup Panel */
.picker-popup {
  position: fixed;
  z-index: 1000;
  min-width: 16rem;
  width: max-content;
  padding: 0.75rem;
  background: oklch(0.98 0.01 260);
  border: 1px solid oklch(0.85 0.01 260);
  border-radius: 0.5rem;
  box-shadow: 0 4px 12px oklch(0.20 0.02 260 / 0.15);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.dark .picker-popup {
  background: oklch(0.16 0.02 260);
  border-color: oklch(0.30 0.02 260);
  box-shadow: 0 4px 12px oklch(0 0 0 / 0.3);
}

/* Popup transition */
.popup-enter-active,
.popup-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}

.popup-enter-from,
.popup-leave-to {
  opacity: 0;
  transform: translateY(-0.25rem);
}

/* Color groups inside popup */
.color-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.special-options {
  flex-direction: row;
  gap: 0.375rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid oklch(0.90 0.01 260);
  margin-bottom: 0.25rem;
}

.dark .special-options {
  border-bottom-color: oklch(0.25 0.02 260);
}

.group-label {
  font-size: 0.625rem;
  color: oklch(0.50 0.02 260);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.dark .group-label {
  color: oklch(0.60 0.02 260);
}

.color-row {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.color-chip {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 0.25rem;
  border: 2px solid transparent;
  cursor: pointer;
  transition: border-color 0.15s, transform 0.1s;
}

.color-chip:hover {
  transform: scale(1.15);
}

.color-chip.active {
  border-color: oklch(0.55 0.20 250);
  box-shadow: 0 0 0 2px oklch(0.55 0.20 250 / 0.3);
}

.auto-chip {
  background: linear-gradient(135deg,
    oklch(0.90 0.01 260) 0%,
    oklch(0.70 0.01 260) 50%,
    oklch(0.50 0.01 260) 100%
  );
  display: flex;
  align-items: center;
  justify-content: center;
}

.dark .auto-chip {
  background: linear-gradient(135deg,
    oklch(0.30 0.01 260) 0%,
    oklch(0.50 0.01 260) 50%,
    oklch(0.70 0.01 260) 100%
  );
}

.auto-icon {
  font-size: 0.625rem;
  font-weight: 600;
  color: oklch(0.30 0.02 260);
}

.dark .auto-icon {
  color: oklch(0.90 0.02 260);
}

.custom-chip {
  background: linear-gradient(135deg,
    hsl(0, 100%, 50%) 0%,
    hsl(60, 100%, 50%) 17%,
    hsl(120, 100%, 50%) 33%,
    hsl(180, 100%, 50%) 50%,
    hsl(240, 100%, 50%) 67%,
    hsl(300, 100%, 50%) 83%,
    hsl(360, 100%, 50%) 100%
  );
  display: flex;
  align-items: center;
  justify-content: center;
}

.rainbow-icon {
  font-size: 0.75rem;
  filter: drop-shadow(0 0 1px rgba(0,0,0,0.3));
}

/* Custom Picker Header */
.custom-picker-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid oklch(0.90 0.01 260);
  margin-bottom: 0.25rem;
}

.dark .custom-picker-header {
  border-bottom-color: oklch(0.25 0.02 260);
}

.back-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  color: oklch(0.50 0.02 260);
  transition: background 0.15s, color 0.15s;
}

.back-button:hover {
  background: oklch(0.92 0.01 260);
  color: oklch(0.30 0.02 260);
}

.dark .back-button:hover {
  background: oklch(0.25 0.02 260);
  color: oklch(0.85 0.02 260);
}

.back-button .material-icons {
  font-size: 1rem;
}

.custom-picker-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: oklch(0.30 0.02 260);
}

.dark .custom-picker-title {
  color: oklch(0.85 0.02 260);
}

/* Custom Picker Actions */
.custom-picker-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid oklch(0.90 0.01 260);
}

.dark .custom-picker-actions {
  border-top-color: oklch(0.25 0.02 260);
}

.action-button {
  flex: 1;
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.action-button.cancel {
  background: transparent;
  border: 1px solid oklch(0.80 0.01 260);
  color: oklch(0.40 0.02 260);
}

.action-button.cancel:hover {
  background: oklch(0.95 0.01 260);
  border-color: oklch(0.70 0.01 260);
}

.dark .action-button.cancel {
  border-color: oklch(0.35 0.02 260);
  color: oklch(0.70 0.02 260);
}

.dark .action-button.cancel:hover {
  background: oklch(0.22 0.02 260);
  border-color: oklch(0.45 0.02 260);
}

.action-button.apply {
  background: oklch(0.55 0.18 250);
  border: 1px solid oklch(0.55 0.18 250);
  color: white;
}

.action-button.apply:hover {
  background: oklch(0.50 0.18 250);
  border-color: oklch(0.50 0.18 250);
}
</style>
