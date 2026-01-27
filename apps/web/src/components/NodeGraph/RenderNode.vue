<script setup lang="ts">
import { computed } from 'vue'
import type { HeroViewConfig } from '@practice/section-visual'
import type { PrimitivePalette } from '@practice/semantic-color-palette/Domain'
import HeroPreview from '../HeroGenerator/HeroPreview.vue'

const props = defineProps<{
  /**
   * Full config to render (combines all input surfaces/processors)
   */
  config?: HeroViewConfig
  palette?: PrimitivePalette
  selected?: boolean
}>()

const emit = defineEmits<{
  click: []
}>()

const hasPreview = computed(() => props.config && props.palette)
</script>

<template>
  <div
    class="render-node"
    :class="{ 'is-selected': selected }"
    @click="emit('click')"
  >
    <!-- Title (outside, above the box) -->
    <div class="node-title">
      <span class="material-icons node-icon">panorama</span>
      <span class="node-name">Output</span>
    </div>

    <!-- Node body -->
    <div class="node-body">
      <!-- Input port (left side, protruding) - rendered first so preview overlaps it -->
      <div class="port port-input" />

      <div class="node-preview">
        <HeroPreview
          v-if="hasPreview"
          variant="thumbnail"
          :config="config"
          :palette="palette"
        />
        <div v-else class="preview-placeholder">
          No Input
        </div>
        <!-- Fallback overlay -->
        <div class="preview-fallback">
          <div class="preview-pattern" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.render-node {
  display: flex;
  flex-direction: column;
  gap: 4px;
  cursor: pointer;
  width: fit-content;
}

.node-title {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 2px;
}

.node-icon {
  font-size: 14px;
  color: #8a8a9a;
}

.node-name {
  font-size: 11px;
  font-weight: 500;
  color: #8a8a9a;
}

.render-node.is-selected .node-name {
  color: #b0b0c0;
}

.render-node.is-selected .node-icon {
  color: #b0b0c0;
}

.node-body {
  position: relative;
  background: #2a2a3a;
  border: 1px solid #4a4a5a;
  border-radius: 4px;
  overflow: visible;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.render-node:hover .node-body {
  border-color: #6a6a7a;
}

.render-node.is-selected .node-body {
  border-color: #8a8a9a;
  box-shadow: 0 0 0 2px rgba(138, 138, 154, 0.3);
}

.node-preview {
  position: relative;
  width: 160px;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: 3px;
}

.preview-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1e1e3a;
  color: #555;
  font-size: 11px;
}

.preview-fallback {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.preview-pattern {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #4a4a6a 0%, #3a3a5a 100%);
  opacity: 0.2;
}

/* Port: protruding half-circle on the left edge */
.port {
  position: absolute;
  width: 12px;
  height: 12px;
  background: #3b4d7a;
  border-radius: 50%;
}

.port-input {
  left: -6px;
  top: 50%;
  transform: translateY(-50%);
}
</style>
