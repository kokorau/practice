<script setup lang="ts">
import { computed } from 'vue'
import type { LayerNodeConfig, DisplayLayerVariant } from '@practice/section-visual'
import { findLayerInTree, isBaseLayerConfig, isSurfaceLayerConfig, isTextLayerConfig, isModel3DLayerConfig, isImageLayerConfig, isGroupLayerConfig, isProcessorLayerConfig, getLayerIcon } from '@practice/section-visual'

const props = defineProps<{
  /** All layers in the tree */
  layers: LayerNodeConfig[]
  /** ID of the layer being dragged */
  nodeId: string
  /** Current pointer position */
  position: { x: number; y: number }
}>()

const node = computed(() => findLayerInTree(props.layers, props.nodeId))

const nodeVariant = computed((): DisplayLayerVariant => {
  const n = node.value
  if (!n) return 'group'
  if (isBaseLayerConfig(n)) return 'base'
  if (isSurfaceLayerConfig(n)) return 'surface'
  if (isTextLayerConfig(n)) return 'text'
  if (isModel3DLayerConfig(n)) return 'model3d'
  if (isImageLayerConfig(n)) return 'image'
  if (isProcessorLayerConfig(n)) return 'processor'
  if (isGroupLayerConfig(n)) return 'group'
  return 'surface' // fallback
})

const style = computed(() => ({
  left: `${props.position.x + 12}px`,
  top: `${props.position.y + 12}px`,
}))
</script>

<template>
  <Teleport to="body">
    <div
      v-if="node"
      class="drag-preview"
      :style="style"
    >
      <span class="material-icons drag-icon">{{ getLayerIcon(nodeVariant) }}</span>
      <span class="drag-name">{{ node.name }}</span>
    </div>
  </Teleport>
</template>

<style scoped>
.drag-preview {
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

:global(.dark) .drag-preview {
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
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
}

:global(.dark) .drag-name {
  color: oklch(0.85 0.02 260);
}
</style>
