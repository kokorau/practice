/**
 * Animated Hero Data
 *
 * Timeline data with tracks that animate HeroScene parameters.
 * Uses PropertyValue bindings to connect timeline to NormalizedSurfaceConfig/NormalizedMaskConfig params.
 */

import type { Timeline, Binding, PhaseId, TrackId } from '@practice/timeline'
import type { HeroViewConfig } from '@practice/section-visual'
import { $PropertyValue } from '@practice/section-visual'

// ============================================================
// Timeline with HeroScene parameter tracks
// ============================================================

export const animatedHeroTimeline: Timeline = {
  loopType: 'forward',
  phases: [
    { id: 'phase-opening' as PhaseId, type: 'Opening', duration: 3000 },
    { id: 'phase-loop' as PhaseId, type: 'Loop', duration: 8000 },
  ],
  tracks: [
    // Opening phase: mask radius expands
    {
      id: 'track-mask-radius' as TrackId,
      name: 'Mask Radius',
      clock: 'Phase',
      phaseId: 'phase-opening' as PhaseId,
      mode: 'Envelope',
      envelope: {
        points: [
          { time: 0, value: 0 },
          { time: 3000, value: 1 },
        ],
        interpolation: 'Bezier',
      },
    },
    // Loop phase: stripe angle oscillates
    {
      id: 'track-stripe-angle' as TrackId,
      name: 'Stripe Angle',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      mode: 'Generator',
      generator: { type: 'Sin', period: 4000, offset: 0, params: {} },
    },
    // Loop phase: surface pattern width pulses
    {
      id: 'track-stripe-width' as TrackId,
      name: 'Stripe Width',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      mode: 'Generator',
      generator: { type: 'Sin', period: 2000, offset: 0.25, params: {} },
    },
    // Loop phase: mask center X oscillates
    {
      id: 'track-mask-center-x' as TrackId,
      name: 'Mask Center X',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      mode: 'Generator',
      generator: { type: 'Sin', period: 6000, offset: 0, params: {} },
    },
  ],
}

// ============================================================
// Bindings: Map timeline tracks to HeroScene parameters
// ============================================================

export const animatedHeroBindings: Binding[] = [
  // Mask radius: expands from 0.1 to 0.45 during opening
  {
    targetParam: 'mask-radius',
    sourceTrack: 'track-mask-radius' as TrackId,
    map: { min: 0.1, max: 0.45 },
  },
  // Stripe angle: oscillates between 30° and 60°
  {
    targetParam: 'stripe-angle',
    sourceTrack: 'track-stripe-angle' as TrackId,
    map: { min: 30, max: 60 },
  },
  // Stripe width: pulses between 15 and 35
  {
    targetParam: 'stripe-width',
    sourceTrack: 'track-stripe-width' as TrackId,
    map: { min: 15, max: 35 },
  },
  // Mask center X: oscillates between 0.35 and 0.65
  {
    targetParam: 'mask-center-x',
    sourceTrack: 'track-mask-center-x' as TrackId,
    map: { min: 0.35, max: 0.65 },
  },
]

// ============================================================
// Preset config with PropertyValue bindings
// ============================================================

/**
 * Create animated HeroViewConfig with PropertyValue bindings
 *
 * Parameters bound to timeline:
 * - Background surface: stripe angle, stripe width1
 * - Mask shape: circle radius, centerX
 */
export const createAnimatedHeroConfig = (): HeroViewConfig => ({
  viewport: { width: 1280, height: 720 },
  colors: { semanticContext: 'canvas' },
  layers: [
    // Background group with animated stripe surface
    {
      type: 'group',
      id: 'background-group',
      name: 'Background',
      visible: true,
      children: [
        {
          type: 'surface',
          id: 'background',
          name: 'Surface',
          visible: true,
          surface: {
            id: 'stripe',
            params: {
              // Static value for width2
              width1: $PropertyValue.binding('stripe-width'),  // Bound to timeline
              width2: $PropertyValue.static(20),
              angle: $PropertyValue.binding('stripe-angle'),   // Bound to timeline
            },
          },
          colors: { primary: 'B', secondary: 'Bt' },
        },
      ],
    },
    // Clip group with animated mask
    {
      type: 'group',
      id: 'clip-group',
      name: 'Clip Group',
      visible: true,
      children: [
        // Surface for the masked area
        {
          type: 'surface',
          id: 'surface-mask',
          name: 'Surface',
          visible: true,
          surface: {
            id: 'gradientGrain',
            params: {
              depthMapType: $PropertyValue.static('radial'),
              angle: $PropertyValue.static(0),
              centerX: $PropertyValue.static(0.5),
              centerY: $PropertyValue.static(0.5),
              radialStartAngle: $PropertyValue.static(0),
              radialSweepAngle: $PropertyValue.static(360),
              perlinScale: $PropertyValue.static(4),
              perlinOctaves: $PropertyValue.static(4),
              perlinContrast: $PropertyValue.static(1),
              perlinOffset: $PropertyValue.static(0),
              seed: $PropertyValue.static(42),
              sparsity: $PropertyValue.static(0.5),
            },
          },
          colors: { primary: 'A', secondary: 'At' },
        },
        // Processor with animated circle mask
        {
          type: 'processor',
          id: 'processor-mask',
          name: 'Mask',
          visible: true,
          modifiers: [
            {
              type: 'mask',
              enabled: true,
              shape: {
                id: 'circle',
                params: {
                  centerX: $PropertyValue.binding('mask-center-x'),  // Bound to timeline
                  centerY: $PropertyValue.static(0.5),
                  radius: $PropertyValue.binding('mask-radius'),    // Bound to timeline
                  cutout: $PropertyValue.static(false),
                },
              },
              invert: false,
              feather: 0.02,
            },
          ],
        },
      ],
    },
  ],
  foreground: {
    elements: [
      {
        id: 'title-1',
        type: 'title',
        visible: true,
        position: 'middle-center',
        content: 'Animated Hero',
        colorKey: 'auto',
      },
    ],
  },
})
