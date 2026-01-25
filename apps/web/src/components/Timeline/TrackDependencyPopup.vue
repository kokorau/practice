<script setup lang="ts">
import { computed } from 'vue'
import type { DependencySource, DependencySourceType } from '@practice/section-visual'

const props = defineProps<{
  trackId: string
  sources: DependencySource[]
  position: { x: number; y: number }
}>()

defineEmits<{
  close: []
}>()

// Get icon for source type
const getSourceIcon = (type: DependencySourceType): string => {
  switch (type) {
    case 'surface': return 'texture'
    case 'mask': return 'vignette'
    case 'effect': return 'auto_fix_high'
    default: return 'layers'
  }
}

const hasAnySources = computed(() => props.sources.length > 0)
</script>

<template>
  <div
    class="dependency-popup"
    :style="{ left: `${position.x}px`, top: `${position.y}px` }"
  >
    <div class="popup-header">
      <span class="popup-title">Dependencies</span>
      <button class="popup-close" @click="$emit('close')">
        <span class="material-icons">close</span>
      </button>
    </div>

    <div class="popup-content">
      <template v-if="hasAnySources">
        <div
          v-for="source in sources"
          :key="`${source.layerId}-${source.paramName}`"
          class="dependency-item"
        >
          <span class="material-icons source-icon">{{ getSourceIcon(source.type) }}</span>
          <span class="layer-name">{{ source.layerName }}</span>
          <span class="param-name">{{ source.paramName }}</span>
        </div>
      </template>
      <div v-else class="no-dependencies">
        No dependencies found
      </div>
    </div>
  </div>
</template>

<style scoped>
.dependency-popup {
  position: fixed;
  z-index: 1000;
  min-width: 200px;
  max-width: 320px;
  background: oklch(0.98 0.005 260);
  border: 1px solid oklch(0.85 0.01 260);
  border-radius: 6px;
  box-shadow: 0 4px 12px oklch(0 0 0 / 0.15);
  font-size: 12px;
}

.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-bottom: 1px solid oklch(0.90 0.01 260);
}

.popup-title {
  font-weight: 500;
  color: oklch(0.35 0.02 260);
}

.popup-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  color: oklch(0.50 0.02 260);
  border-radius: 4px;
}

.popup-close:hover {
  background: oklch(0.90 0.01 260);
  color: oklch(0.30 0.02 260);
}

.popup-close .material-icons {
  font-size: 16px;
}

.popup-content {
  padding: 8px;
  max-height: 240px;
  overflow-y: auto;
}

.dependency-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 4px;
}

.dependency-item:hover {
  background: oklch(0.95 0.01 260);
}

.source-icon {
  font-size: 16px;
  color: oklch(0.55 0.02 260);
  flex-shrink: 0;
}

.layer-name {
  flex: 1;
  color: oklch(0.30 0.02 260);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.param-name {
  flex-shrink: 0;
  padding: 2px 6px;
  background: oklch(0.92 0.01 260);
  border-radius: 3px;
  color: oklch(0.45 0.02 260);
  font-size: 11px;
  font-family: ui-monospace, 'SF Mono', monospace;
}

.no-dependencies {
  padding: 12px 8px;
  text-align: center;
  color: oklch(0.55 0.02 260);
}
</style>
