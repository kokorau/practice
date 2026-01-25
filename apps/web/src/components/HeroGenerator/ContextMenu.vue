<script setup lang="ts">
/**
 * ContextMenu
 *
 * A floating context menu component that displays at a specified position.
 * Features:
 * - Closes on click outside
 * - Closes on ESC key
 * - Closes on item click
 */

import { ref, watch, onMounted, onUnmounted } from 'vue'
import { onClickOutside } from '@vueuse/core'

// ============================================================
// Types
// ============================================================

export interface ContextMenuItem {
  id: string
  label: string
  icon?: string
  disabled?: boolean
  separator?: boolean
}

// ============================================================
// Props & Emits
// ============================================================

const props = defineProps<{
  items: ContextMenuItem[]
  position: { x: number; y: number }
  isOpen: boolean
}>()

const emit = defineEmits<{
  close: []
  select: [itemId: string]
}>()

// ============================================================
// Refs
// ============================================================

const menuRef = ref<HTMLElement | null>(null)

// ============================================================
// Click Outside
// ============================================================

onClickOutside(menuRef, (e: PointerEvent) => {
  if (!props.isOpen) return
  // Ignore right-click (contextmenu will handle re-opening)
  if (e.button === 2) return
  emit('close')
})

// ============================================================
// Event Handlers
// ============================================================

const handleKeyDown = (e: KeyboardEvent) => {
  if (!props.isOpen) return
  if (e.key === 'Escape') {
    emit('close')
  }
}

const handleItemClick = (item: ContextMenuItem) => {
  if (item.disabled) return
  emit('select', item.id)
  emit('close')
}

// ============================================================
// Lifecycle
// ============================================================

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
})

// Focus menu when opened for keyboard accessibility
watch(() => props.isOpen, (isOpen) => {
  if (isOpen && menuRef.value) {
    menuRef.value.focus()
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="context-menu">
      <div
        v-if="isOpen"
        ref="menuRef"
        class="context-menu"
        :style="{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }"
        tabindex="-1"
      >
        <template v-for="item in items" :key="item.id">
          <div v-if="item.separator" class="context-menu-separator" />
          <button
            v-else
            class="context-menu-item"
            :class="{ disabled: item.disabled }"
            :disabled="item.disabled"
            @click="handleItemClick(item)"
          >
            <span v-if="item.icon" class="material-icons context-menu-icon">{{ item.icon }}</span>
            <span class="context-menu-label">{{ item.label }}</span>
          </button>
        </template>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.context-menu {
  position: fixed;
  min-width: 10rem;
  background: oklch(0.98 0.01 260);
  border: 1px solid oklch(0.85 0.01 260);
  border-radius: 0.5rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  padding: 0.25rem;
  z-index: 1000;
  outline: none;
}

:global(.dark) .context-menu {
  background: oklch(0.22 0.02 260);
  border-color: oklch(0.30 0.02 260);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}

.context-menu-item {
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
  transition: background 0.15s;
}

:global(.dark) .context-menu-item {
  color: oklch(0.85 0.02 260);
}

.context-menu-item:hover:not(.disabled) {
  background: oklch(0.92 0.01 260);
}

:global(.dark) .context-menu-item:hover:not(.disabled) {
  background: oklch(0.28 0.02 260);
}

.context-menu-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.context-menu-icon {
  font-size: 1rem;
  color: oklch(0.50 0.02 260);
}

:global(.dark) .context-menu-icon {
  color: oklch(0.60 0.02 260);
}

.context-menu-label {
  flex: 1;
}

.context-menu-separator {
  height: 1px;
  margin: 0.25rem 0.5rem;
  background: oklch(0.88 0.01 260);
}

:global(.dark) .context-menu-separator {
  background: oklch(0.30 0.02 260);
}

/* Transition */
.context-menu-enter-active,
.context-menu-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.context-menu-enter-from,
.context-menu-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
