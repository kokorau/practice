import { ref, onUnmounted, type Ref } from 'vue'

// ============================================================
// Types
// ============================================================

export interface UseLayoutResizeOptions {
  /** Initial height percentage (default: 35) */
  initialPercent?: number
  /** Minimum height percentage (default: 15) */
  minPercent?: number
  /** Maximum height percentage (default: 60) */
  maxPercent?: number
}

export interface UseLayoutResizeReturn {
  /** Current height percentage */
  heightPercent: Ref<number>
  /** Whether resize is in progress */
  isResizing: Ref<boolean>
  /** Start resize operation (attach to mousedown) */
  startResize: (e: MouseEvent) => void
}

export interface UsePanelResizeOptions {
  /** Initial width in pixels */
  initialWidth: number
  /** Minimum width in pixels */
  minWidth?: number
  /** Maximum width in pixels */
  maxWidth?: number
  /** Resize direction: 'left' for left panel, 'right' for right panel */
  direction: 'left' | 'right'
}

export interface UsePanelResizeReturn {
  /** Current width in pixels */
  width: Ref<number>
  /** Whether resize is in progress */
  isResizing: Ref<boolean>
  /** Start resize operation (attach to mousedown) */
  startResize: (e: MouseEvent) => void
}

// ============================================================
// Composable
// ============================================================

/**
 * Composable for managing resizable layout panels
 *
 * Handles mouse-based resize with configurable min/max constraints.
 * Automatically cleans up event listeners on unmount.
 *
 * @example
 * ```ts
 * const { heightPercent, isResizing, startResize } = useLayoutResize({
 *   initialPercent: 35,
 *   minPercent: 15,
 *   maxPercent: 60,
 * })
 * ```
 */
export function useLayoutResize(options: UseLayoutResizeOptions = {}): UseLayoutResizeReturn {
  const {
    initialPercent = 35,
    minPercent = 15,
    maxPercent = 60,
  } = options

  const heightPercent = ref(initialPercent)
  const isResizing = ref(false)

  function onResize(e: MouseEvent) {
    if (!isResizing.value) return
    const vh = window.innerHeight
    const fromBottom = vh - e.clientY
    const percent = Math.min(Math.max((fromBottom / vh) * 100, minPercent), maxPercent)
    heightPercent.value = percent
  }

  function stopResize() {
    isResizing.value = false
    document.removeEventListener('mousemove', onResize)
    document.removeEventListener('mouseup', stopResize)
  }

  function startResize(e: MouseEvent) {
    isResizing.value = true
    document.addEventListener('mousemove', onResize)
    document.addEventListener('mouseup', stopResize)
    e.preventDefault()
  }

  onUnmounted(() => {
    document.removeEventListener('mousemove', onResize)
    document.removeEventListener('mouseup', stopResize)
  })

  return {
    heightPercent,
    isResizing,
    startResize,
  }
}

/**
 * Composable for managing horizontal panel resize (left/right panels)
 *
 * Handles mouse-based horizontal resize with configurable min/max constraints.
 * Automatically cleans up event listeners on unmount.
 *
 * @example
 * ```ts
 * // For left panel (resize handle on right edge)
 * const { width, isResizing, startResize } = usePanelResize({
 *   initialWidth: 256,
 *   minWidth: 200,
 *   maxWidth: 400,
 *   direction: 'left',
 * })
 *
 * // For right panel (resize handle on left edge)
 * const { width, isResizing, startResize } = usePanelResize({
 *   initialWidth: 256,
 *   minWidth: 200,
 *   maxWidth: 400,
 *   direction: 'right',
 * })
 * ```
 */
export function usePanelResize(options: UsePanelResizeOptions): UsePanelResizeReturn {
  const {
    initialWidth,
    minWidth = 150,
    maxWidth = 500,
    direction,
  } = options

  const width = ref(initialWidth)
  const isResizing = ref(false)

  function onResize(e: MouseEvent) {
    if (!isResizing.value) return

    let newWidth: number
    if (direction === 'left') {
      // Left panel: width is from left edge to mouse position
      newWidth = e.clientX
    } else {
      // Right panel: width is from mouse position to right edge
      newWidth = window.innerWidth - e.clientX
    }

    width.value = Math.min(Math.max(newWidth, minWidth), maxWidth)
  }

  function stopResize() {
    isResizing.value = false
    document.removeEventListener('mousemove', onResize)
    document.removeEventListener('mouseup', stopResize)
  }

  function startResize(e: MouseEvent) {
    isResizing.value = true
    document.addEventListener('mousemove', onResize)
    document.addEventListener('mouseup', stopResize)
    e.preventDefault()
  }

  onUnmounted(() => {
    document.removeEventListener('mousemove', onResize)
    document.removeEventListener('mouseup', stopResize)
  })

  return {
    width,
    isResizing,
    startResize,
  }
}
