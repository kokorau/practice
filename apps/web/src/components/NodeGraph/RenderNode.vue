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
      <!-- Custom Render icon: rectangle with glowing cross at top-right -->
      <svg class="node-icon" viewBox="0 0 16 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Glow effect for cross -->
        <defs>
          <filter id="crossGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="0.8" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <!-- Main rectangle -->
        <rect
          x="1"
          y="1"
          width="14"
          height="10"
          rx="1"
          stroke="currentColor"
          stroke-width="1.5"
          fill="none"
        />
        <!-- Glowing cross at top-right -->
        <g filter="url(#crossGlow)">
          <line x1="12" y1="2" x2="12" y2="5" stroke="#a0a0b0" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="10.5" y1="3.5" x2="13.5" y2="3.5" stroke="#a0a0b0" stroke-width="1.5" stroke-linecap="round"/>
        </g>
      </svg>
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
  width: 14px;
  height: 12px;
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
