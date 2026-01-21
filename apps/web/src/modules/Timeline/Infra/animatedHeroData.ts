/**
 * Animated Hero Data
 *
 * Timeline data with DSL-based tracks that animate HeroScene parameters.
 * Each track directly outputs the final parameter value via DSL expression.
 */

import type { Timeline, PhaseId, TrackId } from '@practice/timeline'
import type { HeroViewConfig } from '@practice/section-visual'
import { $PropertyValue } from '@practice/section-visual'

// ============================================================
// Timeline with DSL-based HeroScene parameter tracks
// ============================================================

export const animatedHeroTimeline: Timeline = {
  loopType: 'forward',
  phases: [
    { id: 'phase-opening' as PhaseId, type: 'Opening', duration: 3000 },
    { id: 'phase-loop' as PhaseId, type: 'Loop', duration: 8000 },
  ],
  tracks: [
    // Opening phase: mask radius expands with smooth easing
    // smoothstep(0, 3000, t) gives smooth 0->1 over 3s, then range maps to 0.1->0.45
    {
      id: 'track-mask-radius' as TrackId,
      name: 'Mask Radius',
      clock: 'Phase',
      phaseId: 'phase-opening' as PhaseId,
      targetParam: 'mask-radius',
      expression: 'range(smoothstep(0, 3000, t), 0.1, 0.45)',
    },
    // Loop phase: stripe angle oscillates between 30° and 60°
    {
      id: 'track-stripe-angle' as TrackId,
      name: 'Stripe Angle',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      targetParam: 'stripe-angle',
      expression: 'range(osc(t, 4000), 30, 60)',
    },
    // Loop phase: stripe width pulses between 15 and 35
    // Original had offset 0.25 (quarter period), so offset = 0.25 * 2000 = 500ms
    {
      id: 'track-stripe-width' as TrackId,
      name: 'Stripe Width',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      targetParam: 'stripe-width',
      expression: 'range(osc(t, 2000, 500), 15, 35)',
    },
    // Loop phase: mask center X oscillates between 0.35 and 0.65
    {
      id: 'track-mask-center-x' as TrackId,
      name: 'Mask Center X',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      targetParam: 'mask-center-x',
      expression: 'range(osc(t, 6000), 0.35, 0.65)',
    },
  ],
}

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
