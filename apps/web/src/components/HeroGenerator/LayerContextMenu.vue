<script setup lang="ts">
/**
 * LayerContextMenu
 *
 * Right-click context menu for layer items.
 * Provides:
 * - Group Selection: Wrap selected layer in a new Group
 * - Show/Hide: Toggle visibility
 * - Remove: Delete the layer
 */

import { computed, ref, onMounted, onUnmounted, nextTick, watch } from 'vue'

// ============================================================
// Props & Emits
// ============================================================

const props = defineProps<{
  isOpen: boolean
  x: number
  y: number
  layerId: string
  isVisible: boolean
  isBaseLayer: boolean
}>()

const emit = defineEmits<{
  close: []
  'group-selection': [layerId: string]
  'use-as-mask': [layerId: string]
  'toggle-visibility': [layerId: string]
  'remove-layer': [layerId: string]
}>()

// ============================================================
// Menu position adjustment
// ============================================================

const menuRef = ref<HTMLElement | null>(null)
const adjustedPosition = ref({ x: 0, y: 0 })

const updatePosition = async () => {
  await nextTick()
  if (!menuRef.value) {
    adjustedPosition.value = { x: props.x, y: props.y }
    return
  }

  const rect = menuRef.value.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  let x = props.x
  let y = props.y

  // Adjust if menu would overflow right edge
  if (x + rect.width > viewportWidth) {
    x = viewportWidth - rect.width - 8
  }

  // Adjust if menu would overflow bottom edge
  if (y + rect.height > viewportHeight) {
    y = viewportHeight - rect.height - 8
  }

  // Ensure menu doesn't go off left/top edges
  x = Math.max(8, x)
  y = Math.max(8, y)

  adjustedPosition.value = { x, y }
}

watch(() => [props.isOpen, props.x, props.y], () => {
  if (props.isOpen) {
    updatePosition()
  }
}, { immediate: true })

// ============================================================
// Menu items
// ============================================================

const visibilityLabel = computed(() => props.isVisible ? 'Hide' : 'Show')

// ============================================================
// Event Handlers
// ============================================================

const handleGroupSelection = () => {
  emit('group-selection', props.layerId)
  emit('close')
}

const handleUseAsMask = () => {
  emit('use-as-mask', props.layerId)
  emit('close')
}

const handleToggleVisibility = () => {
  emit('toggle-visibility', props.layerId)
  emit('close')
}

const handleRemove = () => {
  emit('remove-layer', props.layerId)
  emit('close')
}

// Close on click outside
const handleClickOutside = (e: MouseEvent) => {
  if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
    emit('close')
  }
}

// Close on Escape key
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    emit('close')
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isOpen"
        ref="menuRef"
        class="layer-context-menu"
        :style="{
          left: `${adjustedPosition.x}px`,
          top: `${adjustedPosition.y}px`,
        }"
        @contextmenu.prevent
      >
        <!-- Group Selection -->
        <button
          v-if="!isBaseLayer"
          class="menu-item"
          @click="handleGroupSelection"
        >
          <span class="material-icons">folder</span>
          <span class="menu-label">Group Selection</span>
        </button>

        <!-- Use as Mask -->
        <button
          v-if="!isBaseLayer"
          class="menu-item"
          @click="handleUseAsMask"
        >
          <span class="material-icons">vignette</span>
          <span class="menu-label">Use as Mask</span>
        </button>

        <div v-if="!isBaseLayer" class="menu-divider" />

        <!-- Show / Hide -->
        <button
          v-if="!isBaseLayer"
          class="menu-item"
          @click="handleToggleVisibility"
        >
          <span class="material-icons">{{ isVisible ? 'visibility_off' : 'visibility' }}</span>
          <span class="menu-label">{{ visibilityLabel }}</span>
        </button>

        <div v-if="!isBaseLayer" class="menu-divider" />

        <!-- Remove -->
        <button
          v-if="!isBaseLayer"
          class="menu-item menu-item-danger"
          @click="handleRemove"
        >
          <span class="material-icons">delete</span>
          <span class="menu-label">Remove</span>
        </button>

        <!-- Base layer message -->
        <div v-if="isBaseLayer" class="menu-disabled-message">
          Base layer cannot be modified
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.layer-context-menu {
  position: fixed;
  z-index: 9999;
  min-width: 10rem;
  padding: 0.25rem;
  background: oklch(0.98 0.01 260);
  border: 1px solid oklch(0.85 0.01 260);
  border-radius: 0.5rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

:global(.dark) .layer-context-menu {
  background: oklch(0.20 0.02 260);
  border-color: oklch(0.30 0.02 260);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: none;
  border: none;
  border-radius: 0.375rem;
  color: oklch(0.25 0.02 260);
  font-size: 0.8125rem;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

:global(.dark) .menu-item {
  color: oklch(0.85 0.02 260);
}

.menu-item:hover {
  background: oklch(0.92 0.01 260);
}

:global(.dark) .menu-item:hover {
  background: oklch(0.26 0.02 260);
}

.menu-item .material-icons {
  font-size: 1.125rem;
  color: oklch(0.50 0.02 260);
}

:global(.dark) .menu-item .material-icons {
  color: oklch(0.60 0.02 260);
}

.menu-item-danger:hover {
  background: oklch(0.95 0.05 25);
}

:global(.dark) .menu-item-danger:hover {
  background: oklch(0.25 0.05 25);
}

.menu-item-danger:hover .material-icons,
.menu-item-danger:hover .menu-label {
  color: oklch(0.55 0.20 25);
}

:global(.dark) .menu-item-danger:hover .material-icons,
:global(.dark) .menu-item-danger:hover .menu-label {
  color: oklch(0.70 0.18 25);
}

.menu-label {
  flex: 1;
}

.menu-divider {
  height: 1px;
  margin: 0.25rem 0.5rem;
  background: oklch(0.88 0.01 260);
}

:global(.dark) .menu-divider {
  background: oklch(0.28 0.02 260);
}

.menu-disabled-message {
  padding: 0.75rem;
  font-size: 0.75rem;
  color: oklch(0.55 0.02 260);
  text-align: center;
}

:global(.dark) .menu-disabled-message {
  color: oklch(0.55 0.02 260);
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
