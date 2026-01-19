import type { Ms } from './Unit'
import type { Phase, PhaseId } from './Phase'

/**
 * Calculated layout for a phase on the timeline.
 * Used for positioning tracks and UI elements.
 */
export interface PhaseLayout {
  phaseId: PhaseId
  startMs: Ms
  endMs: Ms
  duration: Ms
}

/**
 * Calculate layout positions for all phases.
 * Infinite phases (duration undefined) are capped at visibleDuration.
 *
 * @param phases - Array of phases to layout
 * @param visibleDuration - Max visible duration for infinite phases
 * @returns Array of PhaseLayout with calculated boundaries
 */
export function calculatePhaseLayouts(
  phases: Phase[],
  visibleDuration: Ms
): PhaseLayout[] {
  const layouts: PhaseLayout[] = []
  let currentMs: Ms = 0

  for (const phase of phases) {
    const duration = phase.duration ?? (visibleDuration - currentMs)
    const clampedDuration = Math.max(0, duration) as Ms

    layouts.push({
      phaseId: phase.id,
      startMs: currentMs,
      endMs: (currentMs + clampedDuration) as Ms,
      duration: clampedDuration,
    })

    currentMs = (currentMs + clampedDuration) as Ms
  }

  return layouts
}
