import type { Timeline, PhaseId, TrackId } from '@practice/timeline'

export const mockTimeline: Timeline = {
  loopType: 'forward',
  phases: [
    { id: 'phase-opening' as PhaseId, type: 'Opening', duration: 5000 },
    { id: 'phase-loop' as PhaseId, type: 'Loop' }, // No duration = infinite
  ],
  tracks: [
    // Opening phase tracks - fade in effects
    {
      id: 'track-opacity-opening' as TrackId,
      name: 'Opacity',
      clock: 'Phase',
      phaseId: 'phase-opening' as PhaseId,
      targetParam: 'opacity',
      // Linear interpolation from 0 to 1 over 5000ms
      expression: 'range(div(t, 5000), 0, 1)',
    },
    {
      id: 'track-scale-opening' as TrackId,
      name: 'Scale',
      clock: 'Phase',
      phaseId: 'phase-opening' as PhaseId,
      targetParam: 'scale',
      // Smooth interpolation from 0.5 to 1.5 over 5000ms
      expression: 'range(smoothstep(0, 5000, t), 0.5, 1.5)',
    },
    // Loop phase tracks - continuous animation
    {
      id: 'track-rotation-loop' as TrackId,
      name: 'Rotation',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      targetParam: 'rotation',
      // Oscillate between -15 and 15 degrees with period 1000ms
      expression: 'range(osc(t, 1000), -15, 15)',
    },
  ],
}
