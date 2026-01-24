import { ref, onUnmounted } from 'vue'

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
  heightPercent: ReturnType<typeof ref<number>>
  /** Whether resize is in progress */
  isResizing: ReturnType<typeof ref<boolean>>
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
