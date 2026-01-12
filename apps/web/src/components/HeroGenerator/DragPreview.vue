<script setup lang="ts">
import { computed } from 'vue'
import type { SceneNode, LayerVariant } from '../../modules/HeroScene'
import { isLayer, findNode } from '../../modules/HeroScene'

const props = defineProps<{
  /** All nodes in the tree */
  nodes: SceneNode[]
  /** ID of the node being dragged */
  nodeId: string
  /** Current pointer position */
  position: { x: number; y: number }
}>()

const node = computed(() => findNode(props.nodes, props.nodeId))

const nodeVariant = computed((): LayerVariant | 'group' => {
  const n = node.value
  if (!n) return 'group'
  if (isLayer(n)) return n.variant
  return 'group'
})

const getLayerIcon = (variant: LayerVariant | 'group'): string => {
  switch (variant) {
    case 'base': return 'gradient'
    case 'surface': return 'texture'
    case 'group': return 'folder_open'
    case 'model3d': return 'view_in_ar'
    case 'image': return 'image'
    case 'text': return 'text_fields'
    default: return 'layers'
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
