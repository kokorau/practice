<script setup lang="ts">
import type { GridPosition } from '../../composables/SiteBuilder'

defineProps<{
  modelValue: GridPosition
  label: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: GridPosition): void
}>()

const positions: GridPosition[] = [
  'top-left', 'top-center', 'top-right',
  'middle-left', 'middle-center', 'middle-right',
  'bottom-left', 'bottom-center', 'bottom-right',
]
</script>

<template>
  <div class="grid-position-picker">
    <p class="picker-label">{{ label }}</p>
    <div class="position-grid">
      <button
        v-for="pos in positions"
        :key="pos"
        class="position-cell"
        :class="{ active: modelValue === pos }"
        @click="emit('update:modelValue', pos)"
      >
        <span class="position-dot" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.grid-position-picker {
  margin-bottom: 1rem;
}

.picker-label {
  margin: 0 0 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: oklch(0.70 0.02 260);
}

.position-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  background: oklch(0.15 0.02 260);
  padding: 4px;
  border-radius: 0.5rem;
}

.position-cell {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: oklch(0.22 0.02 260);
  border: 2px solid transparent;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.position-cell:hover {
  background: oklch(0.28 0.02 260);
}

.position-cell.active {
  background: oklch(0.55 0.20 250 / 0.2);
  border-color: oklch(0.55 0.20 250);
}

.position-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: oklch(0.40 0.02 260);
  transition: background 0.15s, transform 0.15s;
}

.position-cell.active .position-dot {
  background: oklch(0.70 0.20 250);
  transform: scale(1.2);
}
</style>
