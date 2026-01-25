<script setup lang="ts">
import { provide } from 'vue'
import type { LayerNodeConfig, LayerDropPosition, ModifierDropPosition } from '@practice/section-visual'
import DraggableLayerNode, { type ContextTargetType, type AddProcessorType } from './DraggableLayerNode.vue'
import DragPreview from './DragPreview.vue'
import ModifierDragPreview from './ModifierDragPreview.vue'
import AddItemMenu, { type MenuItemOption } from './AddItemMenu.vue'
import { useLayerSelection } from '../../composables/useLayerSelection'
import { useLayerDragAndDrop, LAYER_DRAG_KEY, calculateDropPosition } from '../../composables/useLayerDragAndDrop'
import { useModifierDragAndDrop, MODIFIER_DRAG_KEY, calculateModifierDropPosition } from '../../composables/useModifierDragAndDrop'
import { useProcessorTargetHelper } from '../../composables/useProcessorTargetHelper'

// ============================================================
// Types
// ============================================================

/**
 * Layer types in the UI (for add layer menu)
 */
export type LayerType = 'base' | 'group' | 'surface' | 'model3d' | 'text' | 'image'

// Re-export types for external use
export type { ContextTargetType, AddProcessorType }

// ============================================================
// Props & Emits
// ============================================================

const props = defineProps<{
  layers: LayerNodeConfig[]
  expandedLayerIds: Set<string>
}>()

// Layer selection from store
const { layerId: selectedLayerId, processorType: selectedProcessorType } = useLayerSelection()

const emit = defineEmits<{
  'select-layer': [layerId: string]
  'toggle-expand': [layerId: string]
  'toggle-visibility': [layerId: string]
  'select-processor': [layerId: string, processorType: 'effect' | 'mask' | 'processor']
  'add-layer': [type: LayerType]
  'remove-layer': [layerId: string]
  'add-processor': [layerId: string, processorType: AddProcessorType]
  'add-modifier-to-processor': [processorNodeId: string, processorType: AddProcessorType]
  'contextmenu': [layerId: string, event: MouseEvent, targetType: ContextTargetType, modifierIndex?: number]
  'move-node': [nodeId: string, position: LayerDropPosition]
  'move-modifier': [sourceNodeId: string, modifierIndex: number, position: ModifierDropPosition]
  // Mask children operations
  'add-layer-to-mask': [processorNodeId: string, modifierIndex: number, layerType: 'surface' | 'text' | 'image']
  'remove-layer-from-mask': [processorNodeId: string, modifierIndex: number, layerId: string]
}>()

// ============================================================
// Processor Target Helper
// ============================================================

const { isProcessorTarget, hasProcessorBelow } = useProcessorTargetHelper(() => props.layers)

// ============================================================
// Drag & Drop (Layer)
// ============================================================

const dragAndDrop = useLayerDragAndDrop()
provide(LAYER_DRAG_KEY, dragAndDrop)

// ============================================================
// Drag & Drop (Modifier)
// ============================================================

const modifierDragAndDrop = useModifierDragAndDrop()
provide(MODIFIER_DRAG_KEY, modifierDragAndDrop)

// ============================================================
// Pointer Event Handlers for DnD
// ============================================================

const handlePointerMove = (e: PointerEvent) => {
  // Handle Modifier drag
  if (modifierDragAndDrop.state.dragItem.value) {
    modifierDragAndDrop.actions.updatePointer(e)

    if (modifierDragAndDrop.state.isDragging.value) {
      // Find the modifier element under the pointer
      const elementsAtPoint = document.elementsFromPoint(e.clientX, e.clientY)
      const modifierElement = elementsAtPoint.find(
        el => el.hasAttribute('data-modifier-node-id')
      ) as HTMLElement | undefined

      if (!modifierElement) {
        modifierDragAndDrop.actions.updateDropTarget(null)
      } else {
        const targetNodeId = modifierElement.dataset.modifierNodeId
        const targetIndexStr = modifierElement.dataset.modifierIndex

        if (!targetNodeId || targetIndexStr === undefined) {
          modifierDragAndDrop.actions.updateDropTarget(null)
        } else {
          const targetModifierIndex = parseInt(targetIndexStr, 10)

          // Calculate drop position
          const rect = modifierElement.getBoundingClientRect()
          const position = calculateModifierDropPosition(rect, e.clientY)

          const target = {
            nodeId: targetNodeId,
            modifierIndex: targetModifierIndex,
            position,
          }

          // Check if drop is valid
          if (modifierDragAndDrop.canDrop(props.layers, target)) {
            modifierDragAndDrop.actions.updateDropTarget(target)
          } else {
            modifierDragAndDrop.actions.updateDropTarget(null)
          }
        }
      }
    }
    return // Don't process Layer drag when modifier drag is active
  }

  // Handle Layer drag
  if (!dragAndDrop.state.dragItem.value) return

  dragAndDrop.actions.updatePointer(e)

  if (!dragAndDrop.state.isDragging.value) return

  // Find the node element under the pointer
  const elementsAtPoint = document.elementsFromPoint(e.clientX, e.clientY)
  const nodeElement = elementsAtPoint.find(
    el => el.hasAttribute('data-node-id')
  ) as HTMLElement | undefined

  if (!nodeElement) {
    dragAndDrop.actions.updateDropTarget(null)
    return
  }

  const targetNodeId = nodeElement.dataset.nodeId
  if (!targetNodeId) {
    dragAndDrop.actions.updateDropTarget(null)
    return
  }

  // Don't allow dropping on self
  if (dragAndDrop.state.dragItem.value.nodeId === targetNodeId) {
    dragAndDrop.actions.updateDropTarget(null)
    return
  }

  // Calculate drop position
  const rect = nodeElement.getBoundingClientRect()
  const isGroupTarget = nodeElement.dataset.isGroup === 'true'
  const position = calculateDropPosition(rect, e.clientY, isGroupTarget)

  const target = { nodeId: targetNodeId, position }

  // Check if drop is valid
  if (dragAndDrop.canDrop(props.layers, target)) {
    dragAndDrop.actions.updateDropTarget(target)
  } else {
    dragAndDrop.actions.updateDropTarget(null)
  }
}

const handlePointerUp = () => {
  // Handle Modifier drop
  if (modifierDragAndDrop.state.dragItem.value) {
    const source = modifierDragAndDrop.getSource()
    const dropPosition = modifierDragAndDrop.actions.endDrag()

    if (source && dropPosition) {
      emit('move-modifier', source.nodeId, source.modifierIndex, dropPosition)
    }
    return
  }

  // Handle Layer drop
  if (!dragAndDrop.state.dragItem.value) return

  const draggedNodeId = dragAndDrop.state.dragItem.value.nodeId
  const dropPosition = dragAndDrop.actions.endDrag()

  if (dropPosition) {
    emit('move-node', draggedNodeId, dropPosition)
  }
}

// ============================================================
// Add Layer Menu
// ============================================================

const layerTypeItems: MenuItemOption<LayerType>[] = [
  { type: 'surface', label: 'Surface', icon: 'texture' },
  { type: 'group', label: 'Group', icon: 'folder_open' },
  { type: 'model3d', label: '3D Model', icon: 'view_in_ar' },
  { type: 'image', label: 'Image', icon: 'image' },
  { type: 'text', label: 'Text', icon: 'text_fields' },
]
</script>

<template>
  <div class="canvas-layer-section">
    <div class="section-header">
      <span class="material-icons section-icon">layers</span>
      <span class="section-title">Canvas</span>
      <AddItemMenu
        :items="layerTypeItems"
        title="Add Layer"
        @select="(type: LayerType) => emit('add-layer', type)"
      />
    </div>

    <div
      class="layer-list"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
    >
      <DraggableLayerNode
        v-for="(layer, index) in layers"
        :key="layer.id"
        :node="layer"
        :depth="0"
        :selected-id="selectedLayerId"
        :selected-processor-type="selectedProcessorType ?? null"
        :layers="layers"
        :expanded-layer-ids="expandedLayerIds"
        :is-processor-target="isProcessorTarget(index)"
        :has-processor-below="hasProcessorBelow(index)"
        @select="(id: string) => emit('select-layer', id)"
        @toggle-expand="(id: string) => emit('toggle-expand', id)"
        @toggle-visibility="(id: string) => emit('toggle-visibility', id)"
        @select-processor="(id: string, type: 'effect' | 'mask' | 'processor') => emit('select-processor', id, type)"
        @remove-layer="(id: string) => emit('remove-layer', id)"
        @add-processor="(id: string, type: AddProcessorType) => emit('add-processor', id, type)"
        @add-modifier-to-processor="(id: string, type: AddProcessorType) => emit('add-modifier-to-processor', id, type)"
        @contextmenu="(layerId: string, event: MouseEvent, targetType: ContextTargetType, modifierIndex?: number) => emit('contextmenu', layerId, event, targetType, modifierIndex)"
        @move-node="(nodeId: string, position: LayerDropPosition) => emit('move-node', nodeId, position)"
        @move-modifier="(sourceNodeId: string, modifierIndex: number, position: ModifierDropPosition) => emit('move-modifier', sourceNodeId, modifierIndex, position)"
        @add-layer-to-mask="(processorId: string, modIdx: number, layerType: 'surface' | 'text' | 'image') => emit('add-layer-to-mask', processorId, modIdx, layerType)"
        @remove-layer-from-mask="(processorId: string, modIdx: number, layerId: string) => emit('remove-layer-from-mask', processorId, modIdx, layerId)"
      />
    </div>

    <!-- Drag Preview (Layer) -->
    <DragPreview
      v-if="dragAndDrop.state.isDragging.value && dragAndDrop.state.dragItem.value"
      :layers="layers"
      :node-id="dragAndDrop.state.dragItem.value.nodeId"
      :position="dragAndDrop.state.pointerPosition.value"
    />

    <!-- Drag Preview (Modifier) -->
    <ModifierDragPreview
      v-if="modifierDragAndDrop.state.isDragging.value && modifierDragAndDrop.state.dragItem.value"
      :modifier-type="modifierDragAndDrop.state.dragItem.value.modifierType"
      :position="modifierDragAndDrop.state.pointerPosition.value"
    />
  </div>
</template>

<style scoped>
.canvas-layer-section {
  /* No background or padding */
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid oklch(0.85 0.01 260);
}

:global(.dark) .section-header {
  border-bottom-color: oklch(0.25 0.02 260);
}

.section-icon {
  font-size: 1rem;
  color: oklch(0.50 0.02 260);
}

:global(.dark) .section-icon {
  color: oklch(0.60 0.02 260);
}

.section-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: oklch(0.40 0.02 260);
}

:global(.dark) .section-title {
  color: oklch(0.70 0.02 260);
}

.layer-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
</style>
