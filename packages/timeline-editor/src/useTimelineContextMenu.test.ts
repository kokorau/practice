import { describe, it, expect, vi } from 'vitest'
import { useTimelineContextMenu } from './useTimelineContextMenu'
import type { TrackId } from '@practice/timeline'

describe('useTimelineContextMenu', () => {
  // Helper to create a mock MouseEvent (works in Node environment)
  function createMockMouseEvent(clientX = 100, clientY = 200) {
    return {
      clientX,
      clientY,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as MouseEvent
  }

  describe('initial state', () => {
    it('should start with closed menu', () => {
      const { isOpen, targetId, targetType } = useTimelineContextMenu()

      expect(isOpen.value).toBe(false)
      expect(targetId.value).toBeNull()
      expect(targetType.value).toBe('none')
    })

    it('should have default position at origin', () => {
      const { position } = useTimelineContextMenu()

      expect(position.value).toEqual({ x: 0, y: 0 })
    })
  })

  describe('handleTrackContextMenu', () => {
    it('should open menu at mouse position', () => {
      const { isOpen, position, handleTrackContextMenu } = useTimelineContextMenu()
      const event = createMockMouseEvent(150, 250)

      handleTrackContextMenu('track-1' as TrackId, event)

      expect(isOpen.value).toBe(true)
      expect(position.value).toEqual({ x: 150, y: 250 })
    })

    it('should set target id and type', () => {
      const { targetId, targetType, handleTrackContextMenu } = useTimelineContextMenu()
      const event = createMockMouseEvent()

      handleTrackContextMenu('track-abc' as TrackId, event)

      expect(targetId.value).toBe('track-abc')
      expect(targetType.value).toBe('track')
    })

    it('should prevent default and stop propagation', () => {
      const { handleTrackContextMenu } = useTimelineContextMenu()
      const event = createMockMouseEvent()

      handleTrackContextMenu('track-1' as TrackId, event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(event.stopPropagation).toHaveBeenCalled()
    })
  })

  describe('handleClose', () => {
    it('should close menu and reset state', () => {
      const { isOpen, targetId, targetType, handleTrackContextMenu, handleClose } = useTimelineContextMenu()
      const event = createMockMouseEvent()

      // Open menu first
      handleTrackContextMenu('track-1' as TrackId, event)
      expect(isOpen.value).toBe(true)

      // Close menu
      handleClose()

      expect(isOpen.value).toBe(false)
      expect(targetId.value).toBeNull()
      expect(targetType.value).toBe('none')
    })
  })

  describe('handleSelect', () => {
    it('should close menu after selection', () => {
      const { isOpen, handleTrackContextMenu, handleSelect } = useTimelineContextMenu()
      const event = createMockMouseEvent()

      handleTrackContextMenu('track-1' as TrackId, event)
      handleSelect('wip')

      expect(isOpen.value).toBe(false)
    })

    it('should call onWipAction callback for wip item', () => {
      const onWipAction = vi.fn()
      const { handleTrackContextMenu, handleSelect } = useTimelineContextMenu({ onWipAction })
      const event = createMockMouseEvent()

      handleTrackContextMenu('track-1' as TrackId, event)
      handleSelect('wip')

      expect(onWipAction).toHaveBeenCalledWith('track-1')
    })

    it('should do nothing if no target is selected', () => {
      const onWipAction = vi.fn()
      const { handleSelect } = useTimelineContextMenu({ onWipAction })

      handleSelect('wip')

      expect(onWipAction).not.toHaveBeenCalled()
    })
  })

  describe('items', () => {
    it('should return track items when target is track', () => {
      const { items, handleTrackContextMenu } = useTimelineContextMenu()
      const event = createMockMouseEvent()

      handleTrackContextMenu('track-1' as TrackId, event)

      const itemIds = items.value.filter(i => !i.separator).map(i => i.id)
      expect(itemIds).toContain('rename')
      expect(itemIds).toContain('duplicate')
      expect(itemIds).toContain('delete')
      expect(itemIds).toContain('wip')
    })

    it('should have all track items disabled (WIP)', () => {
      const { items, handleTrackContextMenu } = useTimelineContextMenu()
      const event = createMockMouseEvent()

      handleTrackContextMenu('track-1' as TrackId, event)

      const nonSeparatorItems = items.value.filter(i => !i.separator)
      expect(nonSeparatorItems.every(i => i.disabled)).toBe(true)
    })

    it('should return WIP item when no target', () => {
      const { items } = useTimelineContextMenu()

      expect(items.value).toHaveLength(1)
      expect(items.value[0].id).toBe('wip')
    })
  })

  describe('handleGlobalContextMenu', () => {
    it('should prevent default', () => {
      const { handleGlobalContextMenu } = useTimelineContextMenu()
      const event = createMockMouseEvent()

      handleGlobalContextMenu(event)

      expect(event.preventDefault).toHaveBeenCalled()
    })
  })
})
