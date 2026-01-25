<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  /** Type of the modifier being dragged */
  modifierType: 'effect' | 'mask' | 'filter'
  /** Current pointer position */
  position: { x: number; y: number }
}>()

const getModifierIcon = (type: 'effect' | 'mask' | 'filter'): string => {
  switch (type) {
    case 'effect': return 'auto_fix_high'
    case 'mask': return 'content_cut'
    case 'filter': return 'tune'
    default: return 'tune'
  }
}

const getModifierLabel = (type: 'effect' | 'mask' | 'filter'): string => {
  switch (type) {
    case 'effect': return 'Effect'
    case 'mask': return 'Mask'
    case 'filter': return 'Filter'
    default: return 'Modifier'
  }
}

const style = computed(() => ({
  left: `${props.position.x + 12}px`,
  top: `${props.position.y + 12}px`,
}))
</script>

<template>
  <Teleport to="body">
    <div
      class="modifier-drag-preview"
      :style="style"
    >
      <span class="material-icons drag-icon">{{ getModifierIcon(modifierType) }}</span>
      <span class="drag-name">{{ getModifierLabel(modifierType) }}</span>
    </div>
  </Teleport>
</template>

<style scoped>
.modifier-drag-preview {
  position: fixed;
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.625rem;
  background: oklch(0.98 0.01 260);
  border: 1px solid oklch(0.85 0.01 260);
  border-radius: 0.25rem;
  box-shadow: 0 4px 12px oklch(0.2 0.02 260 / 0.2);
  pointer-events: none;
  opacity: 0.9;
}

:global(.dark) .modifier-drag-preview {
  background: oklch(0.22 0.02 260);
  border-color: oklch(0.35 0.02 260);
  box-shadow: 0 4px 12px oklch(0 0 0 / 0.4);
}

.drag-icon {
  font-size: 1rem;
  color: oklch(0.50 0.02 260);
}

:global(.dark) .drag-icon {
  color: oklch(0.60 0.02 260);
}

.drag-name {
  font-size: 0.8125rem;
  color: oklch(0.25 0.02 260);
  white-space: nowrap;
}

:global(.dark) .drag-name {
  color: oklch(0.85 0.02 260);
}
</style>
