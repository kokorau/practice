import { ref, computed, readonly, type InjectionKey, type Ref, type ComputedRef } from 'vue'
import type { LayerNodeConfig, LayerDropPosition } from '@practice/hero-scene'
import { canMoveLayerInTree, findLayerInTree, isGroupLayerConfig } from '@practice/hero-scene'

// ============================================================
// Types
// ============================================================

/**
 * Item being dragged
 */
export interface DragItem {
  type: 'layerNode'
  nodeId: string
}

/**
 * Current drop target
 */
export interface DropTarget {
  nodeId: string
  position: 'before' | 'after' | 'into'
}

/**
 * Drag state exposed to components
 */
export interface DragState {
  /** Whether a drag operation is in progress */
  isDragging: ComputedRef<boolean>
  /** The item currently being dragged */
  dragItem: Ref<DragItem | null>
  /** The current drop target */
  dropTarget: Ref<DropTarget | null>
  /** Current pointer position (for drag preview) */
  pointerPosition: Ref<{ x: number; y: number }>
}

/**
 * Drag actions for controlling drag state
 */
export interface DragActions {
  /** Start dragging an item */
  startDrag: (item: DragItem, e: PointerEvent) => void
  /** Update pointer position during drag */
  updatePointer: (e: PointerEvent) => void
  /** Update drop target based on pointer position */
  updateDropTarget: (target: DropTarget | null) => void
  /** End drag operation and execute drop if valid */
  endDrag: () => LayerDropPosition | null
  /** Cancel drag operation */
  cancelDrag: () => void
}

/**
 * Composable return type
 */
export interface UseLayerDragAndDropReturn {
  state: DragState
  actions: DragActions
  /** Check if a drop target is valid */
  canDrop: (layers: LayerNodeConfig[], target: DropTarget) => boolean
}

// ============================================================
// Injection Key
// ============================================================

export const LAYER_DRAG_KEY: InjectionKey<UseLayerDragAndDropReturn> = Symbol('layerDragAndDrop')

// ============================================================
// Constants
// ============================================================

/** Minimum distance to start dragging (prevents accidental drags) */
export const DRAG_THRESHOLD = 5

// ============================================================
// Composable
// ============================================================

export function useLayerDragAndDrop(): UseLayerDragAndDropReturn {
  // ============================================================
  // State
  // ============================================================
  const dragItem = ref<DragItem | null>(null)
  const dropTarget = ref<DropTarget | null>(null)
  const pointerPosition = ref({ x: 0, y: 0 })
  const dragStartPosition = ref({ x: 0, y: 0 })
  const isDragConfirmed = ref(false)

  // ============================================================
  // Computed
  // ============================================================
  const isDragging = computed(() => isDragConfirmed.value && dragItem.value !== null)

  // ============================================================
  // Actions
  // ============================================================
  const startDrag = (item: DragItem, e: PointerEvent) => {
    dragItem.value = item
    dragStartPosition.value = { x: e.clientX, y: e.clientY }
    pointerPosition.value = { x: e.clientX, y: e.clientY }
    isDragConfirmed.value = false
  }

  const updatePointer = (e: PointerEvent) => {
    if (!dragItem.value) return

    pointerPosition.value = { x: e.clientX, y: e.clientY }

    // Check if drag threshold is exceeded
    if (!isDragConfirmed.value) {
      const dx = e.clientX - dragStartPosition.value.x
      const dy = e.clientY - dragStartPosition.value.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance >= DRAG_THRESHOLD) {
        isDragConfirmed.value = true
      }
    }
  }

  const updateDropTarget = (target: DropTarget | null) => {
    if (!isDragging.value) return
    dropTarget.value = target
  }

  const endDrag = (): LayerDropPosition | null => {
    const item = dragItem.value
    const target = dropTarget.value

    // Reset state
    dragItem.value = null
    dropTarget.value = null
    isDragConfirmed.value = false

    // Return drop position if valid
    if (item && target) {
      return {
        type: target.position,
        targetId: target.nodeId,
      } as LayerDropPosition
    }

    return null
  }

  const cancelDrag = () => {
    dragItem.value = null
    dropTarget.value = null
    isDragConfirmed.value = false
  }

  // ============================================================
  // Utilities
  // ============================================================
  const canDrop = (layers: LayerNodeConfig[], target: DropTarget): boolean => {
    const item = dragItem.value
    if (!item) return false

    const position: LayerDropPosition = {
      type: target.position,
      targetId: target.nodeId,
    } as LayerDropPosition

    return canMoveLayerInTree(layers, item.nodeId, position)
  }

  // ============================================================
  // Return
  // ============================================================
  return {
    state: {
      isDragging: readonly(isDragging) as ComputedRef<boolean>,
      dragItem: readonly(dragItem) as Ref<DragItem | null>,
      dropTarget: readonly(dropTarget) as Ref<DropTarget | null>,
      pointerPosition: readonly(pointerPosition) as Ref<{ x: number; y: number }>,
    },
    actions: {
      startDrag,
      updatePointer,
      updateDropTarget,
      endDrag,
      cancelDrag,
    },
    canDrop,
  }
}

// ============================================================
// Drop Position Calculator
// ============================================================

/**
 * Calculate drop position based on pointer Y position relative to an element
 *
 * For Groups:
 * - Top 25%: 'before'
 * - Middle 50%: 'into' (drop as child)
 * - Bottom 25%: 'after'
 *
 * For Layers:
 * - Top 50%: 'before'
 * - Bottom 50%: 'after'
 */
export function calculateDropPosition(
  rect: DOMRect,
  pointerY: number,
  isGroupTarget: boolean
): 'before' | 'after' | 'into' {
  const relativeY = pointerY - rect.top
  const height = rect.height

  if (isGroupTarget) {
    // For groups: allow 'into' in the middle zone
    if (relativeY < height * 0.25) {
      return 'before'
    } else if (relativeY > height * 0.75) {
      return 'after'
    } else {
      return 'into'
    }
  }

  // For layers: simple before/after split
  return relativeY < height / 2 ? 'before' : 'after'
}

/**
 * Get drop target info from an element
 */
export function getDropTargetFromElement(
  element: HTMLElement,
  layers: LayerNodeConfig[]
): { nodeId: string; isGroup: boolean } | null {
  const nodeId = element.dataset.nodeId
  if (!nodeId) return null

  const layer = findLayerInTree(layers, nodeId)
  if (!layer) return null

  return {
    nodeId,
    isGroup: isGroupLayerConfig(layer),
  }
}
