import type { TrackId, PhaseId } from '@practice/timeline'

/**
 * Selection target type
 */
export type SelectionType = 'track' | 'phase' | 'none'

/**
 * Selection state
 */
export interface Selection {
  type: SelectionType
  id: TrackId | PhaseId | null
}

/**
 * Track key (A, B, C, ..., Z, AA, AB, ...)
 */
export type TrackKey = string

/**
 * Selection change listener
 */
export type SelectionListener = (selection: Selection) => void

/**
 * Convert index to letter key (0 → A, 1 → B, ..., 25 → Z, 26 → AA, ...)
 */
function indexToKey(index: number): TrackKey {
  let result = ''
  let n = index
  do {
    result = String.fromCharCode(65 + (n % 26)) + result
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return result
}

/**
 * TimelineEditor - Manages editor state for timeline editing
 *
 * Responsibilities:
 * - Track/Phase selection state
 * - Track key assignment (A, B, C, ...)
 * - Editor mode state (future: edit, preview, etc.)
 */
export interface TimelineEditor {
  /** Get current selection */
  getSelection(): Selection

  /** Select a track */
  selectTrack(trackId: TrackId): void

  /** Select a phase */
  selectPhase(phaseId: PhaseId): void

  /** Clear selection */
  clearSelection(): void

  /** Subscribe to selection changes */
  onSelectionChange(listener: SelectionListener): () => void

  /** Get track key (A, B, C, ...) for a track */
  getTrackKey(trackId: TrackId): TrackKey | undefined

  /** Sync track keys with current track list (registers new, keeps existing) */
  syncTracks(trackIds: TrackId[]): void

  /** Get all track keys as a map */
  getTrackKeys(): ReadonlyMap<TrackId, TrackKey>
}

/**
 * Create a new TimelineEditor instance
 */
export function createTimelineEditor(): TimelineEditor {
  let selection: Selection = { type: 'none', id: null }
  const selectionListeners = new Set<SelectionListener>()

  // Track key management
  const trackKeyMap = new Map<TrackId, TrackKey>()
  let nextKeyIndex = 0

  function notifySelectionListeners() {
    for (const listener of selectionListeners) {
      listener(selection)
    }
  }

  return {
    getSelection(): Selection {
      return { ...selection }
    },

    selectTrack(trackId: TrackId): void {
      selection = { type: 'track', id: trackId }
      notifySelectionListeners()
    },

    selectPhase(phaseId: PhaseId): void {
      selection = { type: 'phase', id: phaseId }
      notifySelectionListeners()
    },

    clearSelection(): void {
      selection = { type: 'none', id: null }
      notifySelectionListeners()
    },

    onSelectionChange(listener: SelectionListener): () => void {
      selectionListeners.add(listener)
      return () => {
        selectionListeners.delete(listener)
      }
    },

    getTrackKey(trackId: TrackId): TrackKey | undefined {
      return trackKeyMap.get(trackId)
    },

    syncTracks(trackIds: TrackId[]): void {
      const currentIds = new Set(trackIds)

      // Remove keys for tracks that no longer exist
      for (const [id] of trackKeyMap) {
        if (!currentIds.has(id)) {
          trackKeyMap.delete(id)
        }
      }

      // Add keys for new tracks
      for (const id of trackIds) {
        if (!trackKeyMap.has(id)) {
          trackKeyMap.set(id, indexToKey(nextKeyIndex))
          nextKeyIndex++
        }
      }
    },

    getTrackKeys(): ReadonlyMap<TrackId, TrackKey> {
      return trackKeyMap
    },
  }
}
