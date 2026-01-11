<script setup lang="ts">
defineProps<{
  title: string
}>()

const emit = defineEmits<{
  'export': []
}>()
</script>

<template>
  <div class="right-panel-header">
    <span class="right-panel-title">{{ title }}</span>
    <button class="export-button" @click="emit('export')" title="Export Preset">
      <span class="material-icons">download</span>
    </button>
  </div>
</template>

<style scoped>
.right-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid oklch(0.88 0.01 260);
  margin-bottom: 0.75rem;
}

:global(.dark) .right-panel-header {
  border-bottom-color: oklch(0.25 0.02 260);
}

.right-panel-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: oklch(0.30 0.02 260);
}

:global(.dark) .right-panel-title {
  color: oklch(0.85 0.02 260);
}

.export-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border: none;
  border-radius: 0.375rem;
  background: transparent;
  color: oklch(0.45 0.02 260);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.export-button:hover {
  background: oklch(0.88 0.01 260);
  color: oklch(0.25 0.02 260);
}

:global(.dark) .export-button {
  color: oklch(0.60 0.02 260);
}

:global(.dark) .export-button:hover {
  background: oklch(0.25 0.02 260);
  color: oklch(0.90 0.02 260);
}

.export-button .material-icons {
  font-size: 1.125rem;
}
</style>
