import { ref, computed, readonly, type InjectionKey, type Ref, type ComputedRef } from 'vue'
import type { LayerNodeConfig, ModifierDropPosition, ProcessorNodeConfig } from '@practice/section-visual'
import { canMoveModifierInTree, findLayerInTree, isProcessorLayerConfig } from '@practice/section-visual'

// ============================================================
// Types
// ============================================================

/**
 * Modifier item being dragged
 */
export interface ModifierDragItem {
  type: 'modifier'
  /** ID of the node containing the modifier */
  nodeId: string
  /** Index of the modifier within the node's modifiers array */
  modifierIndex: number
  /** Type of the modifier (for display) */
  modifierType: 'effect' | 'mask'
}

/**
 * Current drop target for modifier
 */
export interface ModifierDropTarget {
  /** ID of the target node */
  nodeId: string
  /** Index in the target node's modifiers array */
  modifierIndex: number
  /** Drop position relative to target */
  position: 'before' | 'after'
}

/**
 * Modifier drag state exposed to components
 */
export interface ModifierDragState {
  /** Whether a drag operation is in progress */
  isDragging: ComputedRef<boolean>
  /** The modifier currently being dragged */
  dragItem: Ref<ModifierDragItem | null>
  /** The current drop target */
  dropTarget: Ref<ModifierDropTarget | null>
  /** Current pointer position (for drag preview) */
  pointerPosition: Ref<{ x: number; y: number }>
}

/**
 * Modifier drag actions for controlling drag state
 */
export interface ModifierDragActions {
  /** Start dragging a modifier */
  startDrag: (item: ModifierDragItem, e: PointerEvent) => void
  /** Update pointer position during drag */
  updatePointer: (e: PointerEvent) => void
  /** Update drop target based on pointer position */
  updateDropTarget: (target: ModifierDropTarget | null) => void
  /** End drag operation and execute drop if valid */
  endDrag: () => ModifierDropPosition | null
  /** Cancel drag operation */
  cancelDrag: () => void
}

/**
 * Composable return type
 */
export interface UseModifierDragAndDropReturn {
  state: ModifierDragState
  actions: ModifierDragActions
  /** Check if a drop target is valid */
  canDrop: (layers: LayerNodeConfig[], target: ModifierDropTarget) => boolean
  /** Get the source node ID and modifier index */
  getSource: () => { nodeId: string; modifierIndex: number } | null
}

// ============================================================
// Injection Key
// ============================================================

export const MODIFIER_DRAG_KEY: InjectionKey<UseModifierDragAndDropReturn> = Symbol('modifierDragAndDrop')

// ============================================================
// Constants
// ============================================================

/** Minimum distance to start dragging (prevents accidental drags) */
export const MODIFIER_DRAG_THRESHOLD = 5

// ============================================================
// Composable
// ============================================================

export function useModifierDragAndDrop(): UseModifierDragAndDropReturn {
  // ============================================================
  // State
  // ============================================================
  const dragItem = ref<ModifierDragItem | null>(null)
  const dropTarget = ref<ModifierDropTarget | null>(null)
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
  const startDrag = (item: ModifierDragItem, e: PointerEvent) => {
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

      if (distance >= MODIFIER_DRAG_THRESHOLD) {
        isDragConfirmed.value = true
      }
    }
  }

  const updateDropTarget = (target: ModifierDropTarget | null) => {
    if (!isDragging.value) return
    dropTarget.value = target
  }

  const endDrag = (): ModifierDropPosition | null => {
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
        targetNodeId: target.nodeId,
        targetIndex: target.modifierIndex,
      } as ModifierDropPosition
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
  const canDrop = (layers: LayerNodeConfig[], target: ModifierDropTarget): boolean => {
    const item = dragItem.value
    if (!item) return false

    const position: ModifierDropPosition = {
      type: target.position,
      targetNodeId: target.nodeId,
      targetIndex: target.modifierIndex,
    } as ModifierDropPosition

    return canMoveModifierInTree(layers, item.nodeId, item.modifierIndex, position)
  }

  const getSource = (): { nodeId: string; modifierIndex: number } | null => {
    if (!dragItem.value) return null
    return {
      nodeId: dragItem.value.nodeId,
      modifierIndex: dragItem.value.modifierIndex,
    }
  }

  // ============================================================
  // Return
  // ============================================================
  return {
    state: {
      isDragging: readonly(isDragging) as ComputedRef<boolean>,
      dragItem: readonly(dragItem) as Ref<ModifierDragItem | null>,
      dropTarget: readonly(dropTarget) as Ref<ModifierDropTarget | null>,
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
    getSource,
  }
}

// ============================================================
// Drop Position Calculator
// ============================================================

/**
 * Calculate drop position based on pointer Y position relative to an element
 *
 * For modifiers:
 * - Top 50%: 'before'
 * - Bottom 50%: 'after'
 */
export function calculateModifierDropPosition(
  rect: DOMRect,
  pointerY: number
): 'before' | 'after' {
  const relativeY = pointerY - rect.top
  const height = rect.height

  return relativeY < height / 2 ? 'before' : 'after'
}

/**
 * Get modifier drop target info from an element
 */
export function getModifierDropTargetFromElement(
  element: HTMLElement,
  layers: LayerNodeConfig[]
): { nodeId: string; modifierIndex: number } | null {
  const nodeId = element.dataset.modifierNodeId
  const indexStr = element.dataset.modifierIndex

  if (!nodeId || indexStr === undefined) return null

  const modifierIndex = parseInt(indexStr, 10)
  if (isNaN(modifierIndex)) return null

  const layer = findLayerInTree(layers, nodeId)
  if (!layer) return null

  // Validate that the layer is a processor with modifiers
  if (!isProcessorLayerConfig(layer)) return null
  const processor = layer as ProcessorNodeConfig

  // Validate that the modifier index is valid
  if (modifierIndex < 0 || modifierIndex >= processor.modifiers.length) return null

  return {
    nodeId,
    modifierIndex,
  }
}
