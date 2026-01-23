<script setup lang="ts">
export interface BreadcrumbItem {
  label: string
}

defineProps<{
  breadcrumbs: BreadcrumbItem[]
}>()

const emit = defineEmits<{
  'export': []
}>()
</script>

<template>
  <div class="right-panel-header">
    <div class="breadcrumb-nav">
      <template v-for="(item, index) in breadcrumbs" :key="index">
        <span class="breadcrumb-item">{{ item.label }}</span>
        <span v-if="index < breadcrumbs.length - 1" class="breadcrumb-separator">
          <span class="material-icons">chevron_right</span>
        </span>
      </template>
    </div>
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

.breadcrumb-nav {
  display: flex;
  align-items: center;
  gap: 0.125rem;
  min-width: 0;
  overflow: hidden;
}

.breadcrumb-item {
  font-size: 0.75rem;
  color: oklch(0.50 0.02 260);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.breadcrumb-item:last-of-type {
  font-weight: 600;
  color: oklch(0.30 0.02 260);
}

:global(.dark) .breadcrumb-item {
  color: oklch(0.60 0.02 260);
}

:global(.dark) .breadcrumb-item:last-of-type {
  color: oklch(0.85 0.02 260);
}

.breadcrumb-separator {
  display: flex;
  align-items: center;
  color: oklch(0.65 0.01 260);
  flex-shrink: 0;
}

.breadcrumb-separator .material-icons {
  font-size: 0.875rem;
}

:global(.dark) .breadcrumb-separator {
  color: oklch(0.45 0.02 260);
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
