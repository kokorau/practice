/**
 * useLayerDragDrop
 *
 * Composable for managing drag & drop state in the layer tree.
 * Provides reactive state and utility functions for drag operations.
 */

import { ref, computed } from 'vue'
import type { DropPosition } from '../../modules/HeroScene'
import type { ModifierDragId } from './DraggableLayerNode.vue'

/**
 * Drop target information
 */
export interface DropTarget {
  /** Target node ID */
  nodeId: string
  /** Drop position relative to target */
  position: DropPosition
}

/**
 * Drag & drop state management composable
 */
export function useLayerDragDrop() {
  /** Currently dragged node ID (null if not dragging a layer) */
  const draggedId = ref<string | null>(null)

  /** Currently dragged modifier ID (null if not dragging a modifier) */
  const draggedModifierId = ref<ModifierDragId | null>(null)

  /** Current drop target (null if no valid target) */
  const dropTarget = ref<DropTarget | null>(null)

  /** Whether a layer drag operation is in progress */
  const isDragging = computed(() => draggedId.value !== null)

  /** Whether a modifier drag operation is in progress */
  const isDraggingModifier = computed(() => draggedModifierId.value !== null)

  /**
   * Start a drag operation
   */
  const startDrag = (nodeId: string) => {
    draggedId.value = nodeId
  }

  /**
   * End the current drag operation
   */
  const endDrag = () => {
    draggedId.value = null
    dropTarget.value = null
  }

  /**
   * Start a modifier drag operation
   */
  const startModifierDrag = (modifierId: ModifierDragId) => {
    draggedModifierId.value = modifierId
  }

  /**
   * End the current modifier drag operation
   */
  const endModifierDrag = () => {
    draggedModifierId.value = null
  }

  /**
   * Set the current drop target
   */
  const setDropTarget = (target: DropTarget | null) => {
    // Don't allow dropping onto self
    if (target && target.nodeId === draggedId.value) {
      dropTarget.value = null
      return
    }
    dropTarget.value = target
  }

  /**
   * Clear the drop target (on drag leave)
   */
  const clearDropTarget = (nodeId: string) => {
    if (dropTarget.value?.nodeId === nodeId) {
      dropTarget.value = null
    }
  }

  /**
   * Calculate drop position from mouse position within element
   * @param e - Drag event
   * @param isGroup - Whether the target is a group node
   * @returns Drop position or null if invalid
   */
  const calculateDropPosition = (
    e: DragEvent,
    isGroup: boolean
  ): DropPosition | null => {
    const target = e.currentTarget as HTMLElement
    if (!target) return null

    const rect = target.getBoundingClientRect()
    const y = e.clientY - rect.top
    const height = rect.height

    // Define zones: top 25% = before, bottom 25% = after, middle = into (for groups)
    const topZone = height * 0.25
    const bottomZone = height * 0.75

    if (y < topZone) {
      return 'before'
    } else if (y > bottomZone) {
      return 'after'
    } else {
      // Middle zone: 'into' for groups, 'after' for others
      return isGroup ? 'into' : 'after'
    }
  }

  return {
    // State
    draggedId,
    draggedModifierId,
    dropTarget,
    isDragging,
    isDraggingModifier,
    // Actions
    startDrag,
    endDrag,
    startModifierDrag,
    endModifierDrag,
    setDropTarget,
    clearDropTarget,
    calculateDropPosition,
  }
}
