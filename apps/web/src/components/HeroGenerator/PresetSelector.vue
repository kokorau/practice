<script setup lang="ts">
/**
 * PresetSelector
 *
 * Displays the selected preset as a compact trigger button.
 * Clicking opens a popup panel with all available options.
 * Used for Surface texture and Mask shape selection.
 */

import { ref, computed } from 'vue'

export interface PresetItem {
  label: string
}

const props = defineProps<{
  /** Section label */
  label: string
  /** All preset items */
  items: PresetItem[]
  /** Currently selected index (null for solid/none) */
  selectedIndex: number | null
  /** Label for the null/none option */
  nullLabel?: string
  /** Whether to show the null option */
  showNullOption?: boolean
}>()

const emit = defineEmits<{
  select: [index: number | null]
}>()

const isOpen = ref(false)
const triggerRef = ref<HTMLElement | null>(null)

const togglePopup = () => {
  isOpen.value = !isOpen.value
}

const handleSelect = (index: number | null) => {
  emit('select', index)
  isOpen.value = false
}

const handleClickOutside = () => {
  isOpen.value = false
}

const clickOutsideOptions = computed(() => ({
  handler: handleClickOutside,
  ignore: [triggerRef.value],
}))

const selectedLabel = () => {
  if (props.selectedIndex === null) {
    return props.nullLabel ?? 'None'
  }
  return props.items[props.selectedIndex]?.label ?? 'Unknown'
}

// Items sorted with selected first
const sortedItems = computed(() => {
  if (props.selectedIndex === null) {
    return props.items.map((item, i) => ({ item, originalIndex: i }))
  }
  const selected = { item: props.items[props.selectedIndex], originalIndex: props.selectedIndex }
  const rest = props.items
    .map((item, i) => ({ item, originalIndex: i }))
    .filter((_, i) => i !== props.selectedIndex)
  return [selected, ...rest]
})
</script>

<template>
  <div class="preset-selector">
    <!-- Trigger button showing selected preset -->
    <button
      ref="triggerRef"
      class="preset-trigger"
      @click="togglePopup"
    >
      <div class="preset-preview">
        <slot name="selected" />
      </div>
      <div class="preset-info">
        <span class="preset-label">{{ label }}</span>
        <span class="preset-value">{{ selectedLabel() }}</span>
      </div>
      <span class="material-icons preset-icon">{{ isOpen ? 'expand_less' : 'expand_more' }}</span>
    </button>

    <!-- Popup panel (teleported to portal container in editor area) -->
    <Teleport to="#preset-popup-portal">
      <Transition name="preset-popup">
        <div
          v-if="isOpen"
          v-click-outside="clickOutsideOptions"
          class="preset-popup"
        >
          <div class="preset-popup-header">
            <span class="preset-popup-title">{{ label }}</span>
          </div>
          <div class="preset-popup-content">
            <!-- Null/None option (shown first when selected) -->
            <button
              v-if="showNullOption && selectedIndex === null"
              class="preset-option active"
              @click="handleSelect(null)"
            >
              <div class="preset-option-preview">
                <slot name="null" />
              </div>
              <span class="preset-option-label">{{ nullLabel ?? 'None' }}</span>
            </button>

            <!-- Pattern options (sorted with selected first) -->
            <button
              v-for="{ item, originalIndex } in sortedItems"
              :key="originalIndex"
              class="preset-option"
              :class="{ active: selectedIndex === originalIndex }"
              @click="handleSelect(originalIndex)"
            >
              <div class="preset-option-preview">
                <slot name="item" :item="item" :index="originalIndex" />
              </div>
              <span class="preset-option-label">{{ item.label }}</span>
            </button>

            <!-- Null/None option (shown at end when not selected) -->
            <button
              v-if="showNullOption && selectedIndex !== null"
              class="preset-option"
              @click="handleSelect(null)"
            >
              <div class="preset-option-preview">
                <slot name="null" />
              </div>
              <span class="preset-option-label">{{ nullLabel ?? 'None' }}</span>
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.preset-selector {
  position: relative;
}

/* Trigger button */
.preset-trigger {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.375rem;
  border: 1px solid oklch(0.85 0.01 260);
  border-radius: 0.5rem;
  background: oklch(0.98 0.005 260);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

:global(.dark) .preset-trigger {
  border-color: oklch(0.30 0.02 260);
  background: oklch(0.15 0.02 260);
}

.preset-trigger:hover {
  border-color: oklch(0.70 0.02 260);
  background: oklch(0.96 0.01 260);
}

:global(.dark) .preset-trigger:hover {
  border-color: oklch(0.40 0.02 260);
  background: oklch(0.18 0.02 260);
}

.preset-preview {
  width: 3rem;
  aspect-ratio: 16 / 9;
  border-radius: 0.25rem;
  overflow: hidden;
  flex-shrink: 0;
  background: oklch(0.92 0.01 260);
}

:global(.dark) .preset-preview {
  background: oklch(0.22 0.02 260);
}

.preset-preview :deep(canvas) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preset-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.125rem;
  min-width: 0;
}

.preset-label {
  font-size: 0.625rem;
  font-weight: 500;
  color: oklch(0.55 0.02 260);
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

:global(.dark) .preset-label {
  color: oklch(0.55 0.02 260);
}

.preset-value {
  font-size: 0.75rem;
  font-weight: 500;
  color: oklch(0.30 0.02 260);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

:global(.dark) .preset-value {
  color: oklch(0.85 0.02 260);
}

.preset-icon {
  font-size: 1.25rem;
  color: oklch(0.50 0.02 260);
  flex-shrink: 0;
}

:global(.dark) .preset-icon {
  color: oklch(0.60 0.02 260);
}

</style>

<!-- Global styles for teleported popup -->
<style>
/* Popup panel (teleported to portal container) - matches FloatingPanel position-right */
.preset-popup {
  position: absolute;
  top: 0;
  bottom: 0;
  right: 16rem;
  width: 12rem;
  display: flex;
  flex-direction: column;
  background: oklch(0.96 0.01 260);
  border-right: 1px solid oklch(0.88 0.01 260);
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.dark .preset-popup {
  background: oklch(0.10 0.02 260);
  border-right-color: oklch(0.20 0.02 260);
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.3);
}

.preset-popup-header {
  padding: 0.5rem 0.625rem;
  border-bottom: 1px solid oklch(0.90 0.01 260);
}

.dark .preset-popup-header {
  border-bottom-color: oklch(0.22 0.02 260);
}

.preset-popup-title {
  font-size: 0.6875rem;
  font-weight: 600;
  color: oklch(0.45 0.02 260);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.dark .preset-popup-title {
  color: oklch(0.60 0.02 260);
}

.preset-popup-content {
  flex: 1;
  overflow-y: auto;
  padding: 0.375rem;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

/* Option buttons */
.preset-option {
  display: flex;
  flex-direction: column;
  width: 100%;
  flex-shrink: 0;
  border: 2px solid oklch(0.88 0.01 260);
  border-radius: 0.375rem;
  background: transparent;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.dark .preset-option {
  border-color: oklch(0.28 0.02 260);
}

.preset-option:hover {
  border-color: oklch(0.75 0.01 260);
}

.dark .preset-option:hover {
  border-color: oklch(0.40 0.02 260);
}

.preset-option.active {
  border-color: oklch(0.55 0.20 250);
  background: oklch(0.55 0.20 250 / 0.1);
}

.preset-option-preview {
  width: 100%;
  aspect-ratio: 16 / 9;
  flex-shrink: 0;
  background: oklch(0.92 0.01 260);
}

.dark .preset-option-preview {
  background: oklch(0.20 0.02 260);
}

.preset-option-preview canvas {
  width: 100%;
  height: 100%;
}

.preset-option-label {
  padding: 0.25rem 0.375rem;
  font-size: 0.6875rem;
  color: oklch(0.40 0.02 260);
  text-align: left;
}

.dark .preset-option-label {
  color: oklch(0.70 0.02 260);
}

/* Popup transition */
.preset-popup-enter-active,
.preset-popup-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.preset-popup-enter-from,
.preset-popup-leave-to {
  opacity: 0;
  transform: translateX(16px);
}
</style>
