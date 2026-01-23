import { ref, computed, readonly, type Ref, type ComputedRef } from 'vue'
import { $BezierPath, type BezierPath, type BezierHandle, type HandleMode } from '../modules/BezierPath'

// ============================================================
// Types
// ============================================================

export type DragTargetType = 'anchor' | 'handleIn' | 'handleOut'

export interface DragTarget {
  type: DragTargetType
  index: number
}

export interface EditorState {
  /** The current bezier path */
  path: Ref<BezierPath>
  /** Index of the currently selected anchor (null if none) */
  selectedAnchorIndex: Ref<number | null>
  /** Current drag target (null if not dragging) */
  dragTarget: Ref<DragTarget | null>
  /** Whether a drag operation is confirmed (past threshold) */
  isDragging: ComputedRef<boolean>
  /** X constraints for the selected anchor */
  xConstraints: ComputedRef<{ min: number; max: number } | null>
}

export interface EditorActions {
  /** Set the path (for v-model support) */
  setPath: (path: BezierPath) => void
  /** Select an anchor by index */
  selectAnchor: (index: number | null) => void
  /** Start a drag operation */
  startDrag: (target: DragTarget, e: PointerEvent) => void
  /** Update drag position */
  updateDrag: (e: PointerEvent, svgRect: DOMRect) => void
  /** End drag operation */
  endDrag: () => void
  /** Add an anchor at a given X position (0-1) */
  addAnchorAtX: (x: number) => void
  /** Delete the currently selected anchor */
  deleteSelectedAnchor: () => void
  /** Set handle mode for an anchor */
  setHandleMode: (index: number, mode: HandleMode) => void
  /** Reset handles to auto for an anchor */
  resetHandles: (index: number) => void
}

export interface UseBezierPathEditorReturn {
  state: EditorState
  actions: EditorActions
}

// ============================================================
// Constants
// ============================================================

/** Minimum distance to start dragging (prevents accidental drags) */
export const DRAG_THRESHOLD = 5

// ============================================================
// Composable
// ============================================================

export function useBezierPathEditor(
  initialPath: BezierPath = $BezierPath.identity()
): UseBezierPathEditorReturn {
  // ============================================================
  // State
  // ============================================================
  const path = ref<BezierPath>(initialPath)
  const selectedAnchorIndex = ref<number | null>(null)
  const dragTarget = ref<DragTarget | null>(null)
  const dragStartPosition = ref({ x: 0, y: 0 })
  const isDragConfirmed = ref(false)

  // ============================================================
  // Computed
  // ============================================================
  const isDragging = computed(() => isDragConfirmed.value && dragTarget.value !== null)

  const xConstraints = computed(() => {
    if (selectedAnchorIndex.value === null) return null
    return $BezierPath.getXConstraints(path.value, selectedAnchorIndex.value)
  })

  // ============================================================
  // Actions
  // ============================================================
  const setPath = (newPath: BezierPath) => {
    path.value = newPath
  }

  const selectAnchor = (index: number | null) => {
    selectedAnchorIndex.value = index
  }

  const startDrag = (target: DragTarget, e: PointerEvent) => {
    dragTarget.value = target
    dragStartPosition.value = { x: e.clientX, y: e.clientY }
    isDragConfirmed.value = false
    selectedAnchorIndex.value = target.index
  }

  const updateDrag = (e: PointerEvent, svgRect: DOMRect) => {
    if (!dragTarget.value) return

    // Check drag threshold
    if (!isDragConfirmed.value) {
      const dx = e.clientX - dragStartPosition.value.x
      const dy = e.clientY - dragStartPosition.value.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance >= DRAG_THRESHOLD) {
        isDragConfirmed.value = true
      } else {
        return
      }
    }

    // Convert pointer position to normalized coordinates (0-1)
    const svgX = (e.clientX - svgRect.left) / svgRect.width
    const svgY = (e.clientY - svgRect.top) / svgRect.height

    // Convert to bezier coordinates (Y is inverted in SVG)
    const bezierX = svgX
    const bezierY = 1 - svgY

    const { type, index } = dragTarget.value
    const anchor = path.value.anchors[index]
    if (!anchor) return

    if (type === 'anchor') {
      // Update anchor position
      path.value = $BezierPath.updateAnchor(path.value, index, {
        x: bezierX,
        y: bezierY,
      })
    } else {
      // Update handle position (relative to anchor)
      const handleDelta: BezierHandle = {
        dx: bezierX - anchor.x,
        dy: bezierY - anchor.y,
      }

      path.value = $BezierPath.updateHandle(
        path.value,
        index,
        type === 'handleIn' ? 'in' : 'out',
        handleDelta
      )
    }
  }

  const endDrag = () => {
    dragTarget.value = null
    isDragConfirmed.value = false
  }

  const addAnchorAtX = (x: number) => {
    path.value = $BezierPath.addAnchor(path.value, x)
    // Select the newly added anchor (it's inserted after finding the segment)
    // Find the index of the new anchor
    const newIndex = path.value.anchors.findIndex((a) => Math.abs(a.x - x) < 0.01)
    if (newIndex !== -1) {
      selectedAnchorIndex.value = newIndex
    }
  }

  const deleteSelectedAnchor = () => {
    if (selectedAnchorIndex.value === null) return
    if (path.value.anchors.length <= 2) return

    const index = selectedAnchorIndex.value

    // Can't delete first or last
    if (index === 0 || index === path.value.anchors.length - 1) return

    path.value = $BezierPath.removeAnchor(path.value, index)
    selectedAnchorIndex.value = null
  }

  const setHandleMode = (index: number, mode: HandleMode) => {
    path.value = $BezierPath.setHandleMode(path.value, index, mode)
  }

  const resetHandles = (index: number) => {
    path.value = $BezierPath.setHandleMode(path.value, index, 'auto')
  }

  // ============================================================
  // Return
  // ============================================================
  return {
    state: {
      path,
      selectedAnchorIndex,
      dragTarget: readonly(dragTarget) as Ref<DragTarget | null>,
      isDragging: readonly(isDragging) as ComputedRef<boolean>,
      xConstraints: readonly(xConstraints) as ComputedRef<{ min: number; max: number } | null>,
    },
    actions: {
      setPath,
      selectAnchor,
      startDrag,
      updateDrag,
      endDrag,
      addAnchorAtX,
      deleteSelectedAnchor,
      setHandleMode,
      resetHandles,
    },
  }
}
