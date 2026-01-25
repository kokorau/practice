import { describe, it, expect, vi } from 'vitest'
import { createTimelineEditor, type Selection } from './TimelineEditor'
import type { TrackId, PhaseId } from '@practice/timeline'

describe('TimelineEditor', () => {
  describe('selection', () => {
    it('should start with no selection', () => {
      const editor = createTimelineEditor()
      expect(editor.getSelection()).toEqual({ type: 'none', id: null })
    })

    it('should select a track', () => {
      const editor = createTimelineEditor()
      const trackId = 'track-1' as TrackId

      editor.selectTrack(trackId)

      expect(editor.getSelection()).toEqual({ type: 'track', id: trackId })
    })

    it('should select a phase', () => {
      const editor = createTimelineEditor()
      const phaseId = 'phase-1' as PhaseId

      editor.selectPhase(phaseId)

      expect(editor.getSelection()).toEqual({ type: 'phase', id: phaseId })
    })

    it('should clear selection', () => {
      const editor = createTimelineEditor()
      editor.selectTrack('track-1' as TrackId)

      editor.clearSelection()

      expect(editor.getSelection()).toEqual({ type: 'none', id: null })
    })

    it('should replace previous selection', () => {
      const editor = createTimelineEditor()
      editor.selectTrack('track-1' as TrackId)

      editor.selectPhase('phase-1' as PhaseId)

      expect(editor.getSelection()).toEqual({ type: 'phase', id: 'phase-1' })
    })
  })

  describe('onSelectionChange', () => {
    it('should notify listener when selection changes', () => {
      const editor = createTimelineEditor()
      const listener = vi.fn()
      editor.onSelectionChange(listener)

      editor.selectTrack('track-1' as TrackId)

      expect(listener).toHaveBeenCalledWith({ type: 'track', id: 'track-1' })
    })

    it('should unsubscribe when returned function is called', () => {
      const editor = createTimelineEditor()
      const listener = vi.fn()
      const unsubscribe = editor.onSelectionChange(listener)

      unsubscribe()
      editor.selectTrack('track-1' as TrackId)

      expect(listener).not.toHaveBeenCalled()
    })

    it('should notify multiple listeners', () => {
      const editor = createTimelineEditor()
      const listener1 = vi.fn()
      const listener2 = vi.fn()
      editor.onSelectionChange(listener1)
      editor.onSelectionChange(listener2)

      editor.selectTrack('track-1' as TrackId)

      expect(listener1).toHaveBeenCalled()
      expect(listener2).toHaveBeenCalled()
    })
  })
})
