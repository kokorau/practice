import { ref, computed, type Ref, type ComputedRef } from 'vue'
import type { TrackId } from '@practice/timeline'
import type { ContextMenuItem } from './ContextMenu'

// ============================================================
// Types
// ============================================================

/**
 * Context menu target type for timeline
 */
export type TimelineContextTargetType = 'track' | 'phase' | 'none'

/**
 * Context menu callbacks
 */
export interface TimelineContextMenuCallbacks {
  // Placeholder for future actions
  onWipAction?: (targetId: string) => void
}

/**
 * Return type for useTimelineContextMenu
 */
export interface UseTimelineContextMenuReturn {
  // State
  isOpen: Ref<boolean>
  position: Ref<{ x: number; y: number }>
  targetId: Ref<TrackId | null>
  targetType: Ref<TimelineContextTargetType>

  // Computed
  items: ComputedRef<ContextMenuItem[]>

  // Handlers
  handleTrackContextMenu: (trackId: TrackId, event: MouseEvent) => void
  handleClose: () => void
  handleSelect: (itemId: string) => void
  handleGlobalContextMenu: (event: MouseEvent) => void
}

// ============================================================
// Composable
// ============================================================

/**
 * Timeline context menu composable
 *
 * Provides context menu state and handlers for timeline elements.
 * Currently shows WIP placeholder items.
 */
export function useTimelineContextMenu(
  callbacks: TimelineContextMenuCallbacks = {},
): UseTimelineContextMenuReturn {
  // ============================================================
  // State
  // ============================================================
  const isOpen = ref(false)
  const position = ref({ x: 0, y: 0 })
  const targetId = ref<TrackId | null>(null)
  const targetType = ref<TimelineContextTargetType>('none')

  // ============================================================
  // Computed
  // ============================================================
  const items = computed((): ContextMenuItem[] => {
    const type = targetType.value

    if (type === 'track') {
      return [
        { id: 'rename', label: 'Rename Track', icon: 'edit', disabled: true },
        { id: 'duplicate', label: 'Duplicate Track', icon: 'content_copy', disabled: true },
        { id: 'sep-1', label: '', separator: true },
        { id: 'delete', label: 'Delete Track', icon: 'delete', disabled: true },
        { id: 'sep-2', label: '', separator: true },
        { id: 'wip', label: 'WIP - More coming soon', icon: 'construction', disabled: true },
      ]
    }

    // Default: empty or generic items
    return [
      { id: 'wip', label: 'WIP', icon: 'construction', disabled: true },
    ]
  })

  // ============================================================
  // Handlers
  // ============================================================

  const handleTrackContextMenu = (trackId: TrackId, event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()

    targetId.value = trackId
    targetType.value = 'track'
    position.value = { x: event.clientX, y: event.clientY }
    isOpen.value = true
  }

  const handleClose = () => {
    isOpen.value = false
    targetId.value = null
    targetType.value = 'none'
  }

  const handleSelect = (itemId: string) => {
    const id = targetId.value
    if (!id) {
      handleClose()
      return
    }

    // Handle actions (currently all are WIP/disabled)
    switch (itemId) {
      case 'wip':
        callbacks.onWipAction?.(id)
        break
      // Future: add more actions here
    }

    handleClose()
  }

  // Prevent default context menu on the timeline area
  const handleGlobalContextMenu = (event: MouseEvent) => {
    event.preventDefault()
  }

  return {
    // State
    isOpen,
    position,
    targetId,
    targetType,

    // Computed
    items,

    // Handlers
    handleTrackContextMenu,
    handleClose,
    handleSelect,
    handleGlobalContextMenu,
  }
}
