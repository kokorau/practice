<script setup lang="ts">
import { computed } from 'vue'
import type { NormalizedSurfaceConfig, HeroViewConfig } from '@practice/section-visual'
import { HERO_CANVAS_WIDTH, HERO_CANVAS_HEIGHT } from '@practice/section-visual'
import type { PrimitivePalette } from '@practice/semantic-color-palette/Domain'
import HeroPreview from '../HeroGenerator/HeroPreview.vue'

const props = defineProps<{
  surface: NormalizedSurfaceConfig
  palette: PrimitivePalette
  selected?: boolean
}>()

const emit = defineEmits<{
  click: []
}>()

// Surface type display name
const displayName = computed(() => {
  const id = props.surface.id
  return id.charAt(0).toUpperCase() + id.slice(1)
})

// Create HeroViewConfig for preview
const previewConfig = computed<HeroViewConfig>(() => ({
  viewport: { width: HERO_CANVAS_WIDTH, height: HERO_CANVAS_HEIGHT },
  colors: { semanticContext: 'canvas' },
  layers: [
    {
      id: 'preview-surface',
      name: 'Preview Surface',
      type: 'surface',
      visible: true,
      surface: props.surface,
    },
  ],
  foreground: { elements: [] },
}))
</script>

<template>
  <div
    class="surface-node"
    :class="{ 'is-selected': selected }"
    @click="emit('click')"
  >
    <!-- Title (outside, above the box) -->
    <div class="node-title">
      <span class="material-icons node-icon">texture</span>
      <span class="node-name">{{ displayName }}</span>
    </div>

    <!-- Node body -->
    <div class="node-body">
      <!-- Output port (right side, protruding) - rendered first so preview overlaps it -->
      <div class="port port-output" />

      <div class="node-preview">
        <HeroPreview
          variant="thumbnail"
          :config="previewConfig"
          :palette="palette"
        />
        <!-- Fallback pattern -->
        <div class="preview-fallback">
          <div class="preview-pattern" :class="`pattern-${surface.id}`" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.surface-node {
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

.surface-node.is-selected .node-name {
  color: #b0b0c0;
}

.surface-node.is-selected .node-icon {
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

.surface-node:hover .node-body {
  border-color: #6a6a7a;
}

.surface-node.is-selected .node-body {
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

.preview-fallback {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.preview-pattern {
  width: 100%;
  height: 100%;
  opacity: 0.3;
}

.pattern-solid {
  background: linear-gradient(135deg, #4a4a6a 0%, #3a3a5a 100%);
}

.pattern-stripe {
  background: repeating-linear-gradient(
    45deg,
    #4a4a6a,
    #4a4a6a 8px,
    #3a3a5a 8px,
    #3a3a5a 16px
  );
}

.pattern-grid {
  background-image:
    linear-gradient(#4a4a6a 1px, transparent 1px),
    linear-gradient(90deg, #4a4a6a 1px, transparent 1px);
  background-size: 16px 16px;
  background-color: #3a3a5a;
}

/* Port: protruding half-circle on the right edge */
.port {
  position: absolute;
  width: 12px;
  height: 12px;
  background: #3b4d7a;
  border-radius: 50%;
}

.port-output {
  right: -6px;
  top: 50%;
  transform: translateY(-50%);
}
</style>
