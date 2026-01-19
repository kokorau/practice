import type { Timeline, Binding, PhaseId, TrackId } from '@practice/timeline'

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
      mode: 'Envelope',
      envelope: {
        points: [
          { time: 0, value: 0 },
          { time: 5000, value: 1 },
        ],
        interpolation: 'Linear',
      },
    },
    {
      id: 'track-scale-opening' as TrackId,
      name: 'Scale',
      clock: 'Phase',
      phaseId: 'phase-opening' as PhaseId,
      mode: 'Envelope',
      envelope: {
        points: [
          { time: 0, value: 0.5 },
          { time: 5000, value: 1 },
        ],
        interpolation: 'Bezier',
      },
    },
    // Loop phase tracks - continuous animation
    {
      id: 'track-rotation-loop' as TrackId,
      name: 'Rotation',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      mode: 'Generator',
      generator: { type: 'Sin', period: 1000, offset: 0, params: {} },
    },
  ],
}

export const mockBindings: Binding[] = [
  {
    targetParam: 'opacity',
    sourceTrack: 'track-opacity-opening' as TrackId,
    map: { min: 0, max: 1 },
  },
  {
    targetParam: 'scale',
    sourceTrack: 'track-scale-opening' as TrackId,
    map: { min: 0.5, max: 1.5 },
  },
  {
    targetParam: 'rotation',
    sourceTrack: 'track-rotation-loop' as TrackId,
    map: { min: -15, max: 15 },
  },
]
