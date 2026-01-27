<script setup lang="ts">
import { computed } from 'vue'
import type { HeroViewConfig } from '@practice/section-visual'
import type { PrimitivePalette } from '@practice/semantic-color-palette/Domain'
import HeroPreview from '../HeroGenerator/HeroPreview.vue'

const props = defineProps<{
  /**
   * Filter type: 'effect' or 'mask'
   */
  type: 'effect' | 'mask'
  /**
   * Display label (e.g., 'Blur', 'Vignette')
   */
  label?: string
  config?: HeroViewConfig
  palette?: PrimitivePalette
  selected?: boolean
}>()

const emit = defineEmits<{
  click: []
}>()

const hasPreview = computed(() => props.config && props.palette)

const icon = computed(() => (props.type === 'effect' ? 'auto_fix_high' : 'gradient'))
const displayLabel = computed(() => props.label ?? (props.type === 'effect' ? 'Effect' : 'Mask'))
</script>

<template>
  <div
    class="filter-node"
    :class="[`filter-${type}`, { 'is-selected': selected }]"
    @click="emit('click')"
  >
    <!-- Title (outside, above the box) -->
    <div class="node-title">
      <span class="material-icons node-icon">{{ icon }}</span>
      <span class="node-name">{{ displayLabel }}</span>
    </div>

    <!-- Node body -->
    <div class="node-body">
      <!-- Input ports (left side) -->
      <div v-if="type === 'mask'" class="port port-input port-input-main" />
      <div v-if="type === 'mask'" class="port port-input port-input-mask" />
      <div v-else class="port port-input" />

      <div class="node-preview">
        <HeroPreview
          v-if="hasPreview"
          variant="thumbnail"
          :config="config"
          :palette="palette"
        />
        <div v-else class="preview-placeholder">
          <span class="material-icons placeholder-icon">{{ icon }}</span>
        </div>
        <!-- Fallback overlay -->
        <div class="preview-fallback">
          <div class="preview-pattern" />
        </div>
      </div>

      <!-- Output port (right side) -->
      <div class="port port-output" />
    </div>
  </div>
</template>

<style scoped>
.filter-node {
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

.filter-effect .node-icon {
  color: #7aa2f7;
}

.filter-mask .node-icon {
  color: #9ece6a;
}

.node-name {
  font-size: 11px;
  font-weight: 500;
  color: #8a8a9a;
}

.filter-node.is-selected .node-name {
  color: #b0b0c0;
}

.filter-node.is-selected .node-icon {
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

.filter-node:hover .node-body {
  border-color: #6a6a7a;
}

.filter-node.is-selected .node-body {
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
}

.placeholder-icon {
  font-size: 24px;
  color: #444;
}

.filter-effect .placeholder-icon {
  color: #4a5a8a;
}

.filter-mask .placeholder-icon {
  color: #5a7a5a;
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

/* Ports */
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

/* Mask node has two input ports */
.port-input-main {
  left: -6px;
  top: 30%;
  transform: translateY(-50%);
}

.port-input-mask {
  left: -6px;
  top: 70%;
  transform: translateY(-50%);
}

.port-output {
  right: -6px;
  top: 50%;
  transform: translateY(-50%);
}
</style>
