<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { $Oklch } from '@practice/color'
import type { PrimitivePalette, PrimitiveKey } from '../../modules/SemanticColorPalette/Domain'
import {
  BRAND_KEYS,
  ACCENT_KEYS,
  FOUNDATION_KEYS,
  NEUTRAL_KEYS,
  ACCENT_RAMP_KEYS,
} from '../../modules/SemanticColorPalette/Domain/ValueObject/PrimitivePalette'

const props = defineProps<{
  modelValue: PrimitiveKey | 'auto'
  palette: PrimitivePalette
  label?: string
  showAuto?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: PrimitiveKey | 'auto']
}>()

const isOpen = ref(false)
const pickerRef = ref<HTMLElement | null>(null)
const popupRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLElement | null>(null)
const popupStyle = ref<{ top: string; left?: string; right?: string }>({ top: '0', left: '0' })

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

// Current selected color preview style
const selectedColorStyle = computed(() => {
  if (props.modelValue === 'auto') {
    return {} // Auto uses gradient background from CSS
  }
  return getColorStyle(props.modelValue)
})

const selectedLabel = computed(() => {
  if (props.modelValue === 'auto') return 'Auto'
  return props.modelValue
})

const togglePopup = async () => {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
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
}

// Close on outside click
const handleClickOutside = (event: MouseEvent) => {
  if (pickerRef.value && !pickerRef.value.contains(event.target as Node)) {
    isOpen.value = false
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
        <!-- Auto option -->
        <div v-if="showAuto" class="color-group">
          <button
            class="color-chip auto-chip"
            :class="{ active: modelValue === 'auto' }"
            @click="selectColor('auto')"
            title="Auto"
          >
            <span class="auto-icon">A</span>
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
</style>
