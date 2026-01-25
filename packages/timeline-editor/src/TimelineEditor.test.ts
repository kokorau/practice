import { describe, it, expect, vi } from 'vitest'
import { createTimelineEditor } from './TimelineEditor'
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

  describe('trackKeys', () => {
    it('should assign keys A, B, C to tracks in order', () => {
      const editor = createTimelineEditor()
      const trackIds = ['t1', 't2', 't3'].map(id => id as TrackId)

      editor.syncTracks(trackIds)

      expect(editor.getTrackKey('t1' as TrackId)).toBe('A')
      expect(editor.getTrackKey('t2' as TrackId)).toBe('B')
      expect(editor.getTrackKey('t3' as TrackId)).toBe('C')
    })

    it('should preserve keys when tracks are removed', () => {
      const editor = createTimelineEditor()
      editor.syncTracks(['t1', 't2', 't3'].map(id => id as TrackId))

      // Remove t2
      editor.syncTracks(['t1', 't3'].map(id => id as TrackId))

      expect(editor.getTrackKey('t1' as TrackId)).toBe('A')
      expect(editor.getTrackKey('t2' as TrackId)).toBeUndefined()
      expect(editor.getTrackKey('t3' as TrackId)).toBe('C')
    })

    it('should assign next key to new tracks', () => {
      const editor = createTimelineEditor()
      editor.syncTracks(['t1', 't2'].map(id => id as TrackId))

      // Remove t2 and add t3
      editor.syncTracks(['t1', 't3'].map(id => id as TrackId))

      expect(editor.getTrackKey('t1' as TrackId)).toBe('A')
      expect(editor.getTrackKey('t3' as TrackId)).toBe('C') // Not B, because B was used by t2
    })

    it('should handle AA, AB after Z', () => {
      const editor = createTimelineEditor()
      const trackIds: TrackId[] = []
      for (let i = 0; i < 28; i++) {
        trackIds.push(`t${i}` as TrackId)
      }

      editor.syncTracks(trackIds)

      expect(editor.getTrackKey('t0' as TrackId)).toBe('A')
      expect(editor.getTrackKey('t25' as TrackId)).toBe('Z')
      expect(editor.getTrackKey('t26' as TrackId)).toBe('AA')
      expect(editor.getTrackKey('t27' as TrackId)).toBe('AB')
    })

    it('should return all keys via getTrackKeys', () => {
      const editor = createTimelineEditor()
      editor.syncTracks(['t1', 't2'].map(id => id as TrackId))

      const keys = editor.getTrackKeys()

      expect(keys.size).toBe(2)
      expect(keys.get('t1' as TrackId)).toBe('A')
      expect(keys.get('t2' as TrackId)).toBe('B')
    })
  })
})
