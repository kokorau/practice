<script setup lang="ts" generic="T extends string">
import { ref } from 'vue'

// ============================================================
// Types
// ============================================================

export interface MenuItemOption<T extends string> {
  type: T
  label: string
  icon: string
  disabled?: boolean
}

// ============================================================
// Props & Emits
// ============================================================

defineProps<{
  items: MenuItemOption<T>[]
  title?: string
}>()

const emit = defineEmits<{
  select: [type: T]
}>()

// ============================================================
// State
// ============================================================

const showMenu = ref(false)

// ============================================================
// Handlers
// ============================================================

const handleSelect = (type: T, disabled?: boolean) => {
  if (disabled) return
  emit('select', type)
  showMenu.value = false
}

const toggleMenu = () => {
  showMenu.value = !showMenu.value
}

// Expose for external control
defineExpose({
  close: () => { showMenu.value = false },
})
</script>

<template>
  <div class="add-item-container">
    <button
      class="add-icon-button"
      :class="{ active: showMenu }"
      :title="title ?? 'Add item'"
      @click="toggleMenu"
    >
      <span class="material-icons">add</span>
    </button>

    <Transition name="fade">
      <div v-if="showMenu" class="add-menu">
        <button
          v-for="item in items"
          :key="item.type"
          class="add-menu-item"
          :class="{ disabled: item.disabled }"
          :disabled="item.disabled"
          @click="handleSelect(item.type, item.disabled)"
        >
          <span class="material-icons">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.add-item-container {
  position: relative;
  margin-left: auto;
}

.add-icon-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 0.25rem;
  color: oklch(0.50 0.02 260);
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
}

:global(.dark) .add-icon-button {
  color: oklch(0.60 0.02 260);
}

.add-icon-button:hover {
  color: oklch(0.35 0.02 260);
  background: oklch(0.88 0.01 260);
}

:global(.dark) .add-icon-button:hover {
  color: oklch(0.80 0.02 260);
  background: oklch(0.28 0.02 260);
}

.add-icon-button.active {
  color: oklch(0.50 0.15 250);
  background: oklch(0.90 0.01 260);
}

:global(.dark) .add-icon-button.active {
  color: oklch(0.65 0.15 250);
  background: oklch(0.28 0.02 260);
}

.add-icon-button .material-icons {
  font-size: 1rem;
}

.add-menu {
  position: absolute;
  top: 100%;
  right: 0;
  min-width: 9rem;
  margin-top: 0.25rem;
  background: oklch(0.96 0.01 260);
  border: 1px solid oklch(0.85 0.01 260);
  border-radius: 0.375rem;
  overflow: hidden;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

:global(.dark) .add-menu {
  background: oklch(0.22 0.02 260);
  border-color: oklch(0.30 0.02 260);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.add-menu-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.625rem 0.75rem;
  background: none;
  border: none;
  color: oklch(0.25 0.02 260);
  font-size: 0.75rem;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;
}

:global(.dark) .add-menu-item {
  color: oklch(0.85 0.02 260);
}

.add-menu-item:hover:not(.disabled) {
  background: oklch(0.90 0.01 260);
}

:global(.dark) .add-menu-item:hover:not(.disabled) {
  background: oklch(0.28 0.02 260);
}

.add-menu-item .material-icons {
  font-size: 1rem;
  color: oklch(0.50 0.02 260);
}

:global(.dark) .add-menu-item .material-icons {
  color: oklch(0.60 0.02 260);
}

.add-menu-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
