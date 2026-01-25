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
 * Selection change listener
 */
export type SelectionListener = (selection: Selection) => void

/**
 * TimelineEditor - Manages editor state for timeline editing
 *
 * Responsibilities:
 * - Track/Phase selection state
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
}

/**
 * Create a new TimelineEditor instance
 */
export function createTimelineEditor(): TimelineEditor {
  let selection: Selection = { type: 'none', id: null }
  const listeners = new Set<SelectionListener>()

  function notifyListeners() {
    for (const listener of listeners) {
      listener(selection)
    }
  }

  return {
    getSelection(): Selection {
      return { ...selection }
    },

    selectTrack(trackId: TrackId): void {
      selection = { type: 'track', id: trackId }
      notifyListeners()
    },

    selectPhase(phaseId: PhaseId): void {
      selection = { type: 'phase', id: phaseId }
      notifyListeners()
    },

    clearSelection(): void {
      selection = { type: 'none', id: null }
      notifyListeners()
    },

    onSelectionChange(listener: SelectionListener): () => void {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
