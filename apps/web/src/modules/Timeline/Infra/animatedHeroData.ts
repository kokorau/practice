/**
 * Animated Hero Data
 *
 * Timeline data with DSL-based tracks that animate HeroScene parameters.
 * Multiple preset options available for different visual styles.
 *
 * ## Expression Convention
 *
 * All track expressions output normalized 0-1 intensity values.
 * The config uses RangeExpr to map these intensities to actual parameter ranges.
 *
 * Track expression examples:
 * - `osc(t, 4000)` → oscillates 0-1
 * - `smoothstep(0, 3000, t)` → eases 0-1
 * - `phase(t, 12000)` → linear 0-1 over 12 seconds
 *
 * Config RangeExpr example:
 * - `$PropertyValue.range('track-id', 30, 60)` → maps 0-1 to 30-60
 */

import type { Timeline, PhaseId, TrackId } from '@practice/timeline'
import type { HeroViewConfig } from '@practice/section-visual'
import { $PropertyValue } from '@practice/section-visual'

// ============================================================
// Preset Definition Type
// ============================================================

export interface AnimatedPreset {
  id: string
  name: string
  description: string
  timeline: Timeline
  createConfig: () => HeroViewConfig
  colorPreset: {
    brand: { hue: number; saturation: number; value: number }
    accent: { hue: number; saturation: number; value: number }
    foundation: { hue: number; saturation: number; value: number }
  }
}

// ============================================================
// Preset 1: Breathing Circle (Original, Refined)
// Gentle expansion and rhythmic stripe animation
// ============================================================

const breathingCircleTimeline: Timeline = {
  loopType: 'forward',
  phases: [
    { id: 'phase-opening' as PhaseId, type: 'Opening', duration: 4000 },
    { id: 'phase-loop' as PhaseId, type: 'Loop', duration: 20000 },
  ],
  tracks: [
    // Opening: smooth mask expansion (slow reveal)
    {
      id: 'track-mask-radius' as TrackId,
      name: 'Mask Radius',
      clock: 'Phase',
      phaseId: 'phase-opening' as PhaseId,
      expression: '=smoothstep(0, 4000, @t)',
    },
    // Loop: very gentle angle oscillation
    {
      id: 'track-stripe-angle' as TrackId,
      name: 'Stripe Angle',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      expression: '=osc(@t, 12000)',
    },
    // Loop: subtle width breathing
    {
      id: 'track-stripe-width' as TrackId,
      name: 'Stripe Width',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      expression: '=osc(@t, 8000, 2000)',
    },
    // Loop: slow horizontal drift
    {
      id: 'track-mask-center-x' as TrackId,
      name: 'Mask Center X',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      expression: '=osc(@t, 16000)',
    },
    // Loop: blur radius breathing
    {
      id: 'track-blur-radius' as TrackId,
      name: 'Blur Radius',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      expression: '=osc(@t, 10000)',
    },
  ],
}

const createBreathingCircleConfig = (): HeroViewConfig => ({
  viewport: { width: 1280, height: 720 },
  colors: { semanticContext: 'canvas' },
  layers: [
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
              width1: $PropertyValue.range('track-stripe-width', 20, 28),
              width2: $PropertyValue.static(20),
              angle: $PropertyValue.range('track-stripe-angle', 40, 50),
              color1: $PropertyValue.static('B'),
              color2: $PropertyValue.static('auto'),
            },
          },
        },
      ],
    },
    {
      type: 'group',
      id: 'clip-group',
      name: 'Clip Group',
      visible: true,
      children: [
        {
          type: 'surface',
          id: 'surface-mask',
          name: 'Surface',
          visible: true,
          surface: {
            id: 'gradientGrainRadial',
            params: {
              centerX: $PropertyValue.static(0.5),
              centerY: $PropertyValue.static(0.5),
              radialStartAngle: $PropertyValue.static(0),
              radialSweepAngle: $PropertyValue.static(360),
              seed: $PropertyValue.static(42),
              sparsity: $PropertyValue.static(0.5),
              color1: $PropertyValue.static('A'),
              color2: $PropertyValue.static('At'),
            },
          },
        },
        {
          type: 'processor',
          id: 'processor-mask',
          name: 'Mask',
          visible: true,
          modifiers: [
            {
              type: 'effect',
              id: 'blur',
              params: {
                radius: $PropertyValue.range('track-blur-radius', 1, 8),
              },
            },
            {
              type: 'mask',
              enabled: true,
              shape: {
                id: 'circle',
                params: {
                  centerX: $PropertyValue.range('track-mask-center-x', 0.42, 0.58),
                  centerY: $PropertyValue.static(0.5),
                  radius: $PropertyValue.range('track-mask-radius', 0.2, 0.4),
                  cutout: $PropertyValue.static(false),
                },
              },
              children: [],
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
        content: 'Breathe',
        colorKey: 'auto',
        fontSize: 4,
        fontId: 'cormorant-garamond',
      },
    ],
  },
})

// ============================================================
// Preset 2: Rotating Sunburst
// Dynamic rays with smooth rotation
// ============================================================

const rotatingSunburstTimeline: Timeline = {
  loopType: 'forward',
  phases: [
    { id: 'phase-opening' as PhaseId, type: 'Opening', duration: 3500 },
    { id: 'phase-loop' as PhaseId, type: 'Loop', duration: 30000 },
  ],
  tracks: [
    // Opening: rays fade in slowly
    {
      id: 'track-rays-opening' as TrackId,
      name: 'Rays Count',
      clock: 'Phase',
      phaseId: 'phase-opening' as PhaseId,
      expression: '=smoothstep(0, 3500, @t)',
    },
    // Loop: slow continuous rotation (30 seconds for full rotation)
    {
      id: 'track-twist' as TrackId,
      name: 'Twist',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      expression: '=phase(@t, 30000)',
    },
    // Loop: subtle rays breathing
    {
      id: 'track-rays-loop' as TrackId,
      name: 'Rays',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      expression: '=osc(@t, 15000)',
    },
    // Loop: very slow center drift
    {
      id: 'track-center-x' as TrackId,
      name: 'Center X',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      expression: '=osc(@t, 20000)',
    },
    // Loop: very slow vertical drift
    {
      id: 'track-center-y' as TrackId,
      name: 'Center Y',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      expression: '=osc(@t, 25000, 6000)',
    },
  ],
}

const createRotatingSunburstConfig = (): HeroViewConfig => ({
  viewport: { width: 1280, height: 720 },
  colors: { semanticContext: 'canvas' },
  layers: [
    {
      type: 'group',
      id: 'background-group',
      name: 'Background',
      visible: true,
      children: [
        {
          type: 'surface',
          id: 'background',
          name: 'Sunburst',
          visible: true,
          surface: {
            id: 'sunburst',
            params: {
              rays: $PropertyValue.range('track-rays-loop', 14, 18),
              centerX: $PropertyValue.range('track-center-x', 0.45, 0.55),
              centerY: $PropertyValue.range('track-center-y', 0.45, 0.55),
              twist: $PropertyValue.range('track-twist', 0, 360),
              color1: $PropertyValue.static('A'),
              color2: $PropertyValue.static('At'),
            },
          },
        },
      ],
    },
    {
      type: 'group',
      id: 'accent-group',
      name: 'Accent',
      visible: true,
      children: [
        {
          type: 'surface',
          id: 'center-solid',
          name: 'Center',
          visible: true,
          surface: {
            id: 'solid',
            params: {
              color1: $PropertyValue.static('A'),
            },
          },
        },
        {
          type: 'processor',
          id: 'processor-center-mask',
          name: 'Center Mask',
          visible: true,
          modifiers: [
            {
              type: 'mask',
              enabled: true,
              shape: {
                id: 'circle',
                params: {
                  centerX: $PropertyValue.range('track-center-x', 0.45, 0.55),
                  centerY: $PropertyValue.range('track-center-y', 0.45, 0.55),
                  radius: $PropertyValue.static(0.15),
                  cutout: $PropertyValue.static(false),
                },
              },
              children: [],
              invert: false,
              feather: 0.05,
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
        content: 'Radiate',
        colorKey: 'auto',
        fontSize: 3.5,
        fontId: 'space-grotesk',
      },
    ],
  },
})

// ============================================================
// Preset 3: Flowing Waves
// Ocean-like wave pattern with gentle motion
// ============================================================

const flowingWavesTimeline: Timeline = {
  loopType: 'forward',
  phases: [
    { id: 'phase-opening' as PhaseId, type: 'Opening', duration: 3000 },
    { id: 'phase-loop' as PhaseId, type: 'Loop', duration: 24000 },
  ],
  tracks: [
    // Opening: amplitude builds up gently
    {
      id: 'track-amplitude-open' as TrackId,
      name: 'Amplitude Intro',
      clock: 'Phase',
      phaseId: 'phase-opening' as PhaseId,
      expression: '=smoothstep(0, 3000, @t)',
    },
    // Loop: subtle amplitude breathing
    {
      id: 'track-amplitude' as TrackId,
      name: 'Amplitude',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      expression: '=osc(@t, 12000)',
    },
    // Loop: slow wavelength variation
    {
      id: 'track-wavelength' as TrackId,
      name: 'Wavelength',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      expression: '=osc(@t, 18000, 4500)',
    },
    // Loop: very gentle angle sway
    {
      id: 'track-wave-angle' as TrackId,
      name: 'Wave Angle',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      expression: '=osc(@t, 20000)',
    },
    // Loop: slow thickness breathing
    {
      id: 'track-thickness' as TrackId,
      name: 'Thickness',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      expression: '=osc(@t, 10000, 2500)',
    },
  ],
}

const createFlowingWavesConfig = (): HeroViewConfig => ({
  viewport: { width: 1280, height: 720 },
  colors: { semanticContext: 'canvas' },
  layers: [
    {
      type: 'group',
      id: 'background-group',
      name: 'Background',
      visible: true,
      children: [
        {
          type: 'surface',
          id: 'background',
          name: 'Waves',
          visible: true,
          surface: {
            id: 'wave',
            params: {
              amplitude: $PropertyValue.range('track-amplitude', 22, 30),
              wavelength: $PropertyValue.range('track-wavelength', 80, 100),
              thickness: $PropertyValue.range('track-thickness', 4, 6),
              angle: $PropertyValue.range('track-wave-angle', -5, 5),
              color1: $PropertyValue.static('B'),
              color2: $PropertyValue.static('auto'),
            },
          },
        },
      ],
    },
    {
      type: 'group',
      id: 'overlay-group',
      name: 'Overlay',
      visible: true,
      children: [
        {
          type: 'surface',
          id: 'overlay-gradient',
          name: 'Gradient Overlay',
          visible: true,
          surface: {
            id: 'gradientGrainLinear',
            params: {
              angle: $PropertyValue.static(90),
              centerX: $PropertyValue.static(0.5),
              centerY: $PropertyValue.static(0.5),
              seed: $PropertyValue.static(123),
              sparsity: $PropertyValue.static(0.4),
              color1: $PropertyValue.static('A'),
              color2: $PropertyValue.static('F1'),
            },
          },
        },
        {
          type: 'processor',
          id: 'processor-overlay-mask',
          name: 'Overlay Mask',
          visible: true,
          modifiers: [
            {
              type: 'mask',
              enabled: true,
              shape: {
                id: 'linearGradient',
                params: {
                  angle: $PropertyValue.static(180),
                  startPosition: $PropertyValue.static(0.3),
                  endPosition: $PropertyValue.static(0.8),
                },
              },
              children: [],
              invert: false,
              feather: 0,
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
        position: 'top-left',
        content: 'Flow',
        colorKey: 'auto',
        fontSize: 4.5,
        fontId: 'playfair-display',
      },
      {
        id: 'description-1',
        type: 'description',
        visible: true,
        position: 'top-left',
        content: 'Move with the current',
        colorKey: 'auto',
        fontSize: 1.2,
        fontId: 'quicksand',
      },
    ],
  },
})

// ============================================================
// Preset 4: Pulsing Grid
// Tech-inspired grid with rhythmic animation
// ============================================================

const pulsingGridTimeline: Timeline = {
  loopType: 'forward',
  phases: [
    { id: 'phase-opening' as PhaseId, type: 'Opening', duration: 2500 },
    { id: 'phase-loop' as PhaseId, type: 'Loop', duration: 18000 },
  ],
  tracks: [
    // Opening: grid fades in slowly
    {
      id: 'track-cell-open' as TrackId,
      name: 'Cell Size Intro',
      clock: 'Phase',
      phaseId: 'phase-opening' as PhaseId,
      expression: '=smoothstep(0, 2500, @t)',
    },
    // Loop: subtle cell size breathing
    {
      id: 'track-cell' as TrackId,
      name: 'Cell Size',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      expression: '=osc(@t, 10000)',
    },
    // Loop: very subtle line width change
    {
      id: 'track-line-width' as TrackId,
      name: 'Line Width',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      expression: '=osc(@t, 8000, 2000)',
    },
    // Loop: slow mask size breathing
    {
      id: 'track-mask-radius' as TrackId,
      name: 'Mask Radius',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      expression: '=osc(@t, 14000)',
    },
  ],
}

const createPulsingGridConfig = (): HeroViewConfig => ({
  viewport: { width: 1280, height: 720 },
  colors: { semanticContext: 'canvas' },
  layers: [
    {
      type: 'group',
      id: 'background-group',
      name: 'Background',
      visible: true,
      children: [
        {
          type: 'surface',
          id: 'background',
          name: 'Grid',
          visible: true,
          surface: {
            id: 'grid',
            params: {
              lineWidth: $PropertyValue.range('track-line-width', 1.5, 2.5),
              cellSize: $PropertyValue.range('track-cell', 36, 44),
              color1: $PropertyValue.static('F1'),
              color2: $PropertyValue.static('B'),
            },
          },
        },
      ],
    },
    {
      type: 'group',
      id: 'accent-group',
      name: 'Accent',
      visible: true,
      children: [
        {
          type: 'surface',
          id: 'accent-solid',
          name: 'Accent',
          visible: true,
          surface: {
            id: 'solid',
            params: {
              color1: $PropertyValue.static('A'),
            },
          },
        },
        {
          type: 'processor',
          id: 'processor-accent-mask',
          name: 'Accent Mask',
          visible: true,
          modifiers: [
            {
              type: 'mask',
              enabled: true,
              shape: {
                id: 'circle',
                params: {
                  centerX: $PropertyValue.static(0.5),
                  centerY: $PropertyValue.static(0.5),
                  radius: $PropertyValue.range('track-mask-radius', 0.35, 0.45),
                  cutout: $PropertyValue.static(false),
                },
              },
              children: [],
              invert: false,
              feather: 0.08,
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
        content: 'SYSTEM',
        colorKey: 'auto',
        fontSize: 4,
        fontId: 'space-grotesk',
        letterSpacing: 0.3,
      },
    ],
  },
})

// ============================================================
// Preset 5: Organic Scales
// Nature-inspired fish scales with gentle motion
// ============================================================

const organicScalesTimeline: Timeline = {
  loopType: 'forward',
  phases: [
    { id: 'phase-opening' as PhaseId, type: 'Opening', duration: 3500 },
    { id: 'phase-loop' as PhaseId, type: 'Loop', duration: 22000 },
  ],
  tracks: [
    // Opening: scales emerge slowly
    {
      id: 'track-size-open' as TrackId,
      name: 'Scale Size Intro',
      clock: 'Phase',
      phaseId: 'phase-opening' as PhaseId,
      expression: '=smoothstep(0, 3500, @t)',
    },
    // Loop: subtle scale size breathing
    {
      id: 'track-size' as TrackId,
      name: 'Scale Size',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      expression: '=osc(@t, 14000)',
    },
    // Loop: slow overlap variation
    {
      id: 'track-overlap' as TrackId,
      name: 'Overlap',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      expression: '=osc(@t, 16000, 4000)',
    },
    // Loop: very gentle angle sway
    {
      id: 'track-angle' as TrackId,
      name: 'Angle',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      expression: '=osc(@t, 18000)',
    },
    // Loop: slow mask drift
    {
      id: 'track-mask-x' as TrackId,
      name: 'Mask X',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      expression: '=osc(@t, 20000)',
    },
  ],
}

const createOrganicScalesConfig = (): HeroViewConfig => ({
  viewport: { width: 1280, height: 720 },
  colors: { semanticContext: 'canvas' },
  layers: [
    {
      type: 'group',
      id: 'background-group',
      name: 'Background',
      visible: true,
      children: [
        {
          type: 'surface',
          id: 'background',
          name: 'Solid',
          visible: true,
          surface: {
            id: 'solid',
            params: {
              color1: $PropertyValue.static('F1'),
            },
          },
        },
      ],
    },
    {
      type: 'group',
      id: 'scales-group',
      name: 'Scales',
      visible: true,
      children: [
        {
          type: 'surface',
          id: 'scales-surface',
          name: 'Scales',
          visible: true,
          surface: {
            id: 'scales',
            params: {
              size: $PropertyValue.range('track-size', 30, 36),
              overlap: $PropertyValue.range('track-overlap', 0.4, 0.5),
              angle: $PropertyValue.range('track-angle', -5, 5),
              color1: $PropertyValue.static('B'),
              color2: $PropertyValue.static('auto'),
            },
          },
        },
        {
          type: 'processor',
          id: 'processor-scales-mask',
          name: 'Scales Mask',
          visible: true,
          modifiers: [
            {
              type: 'mask',
              enabled: true,
              shape: {
                id: 'circle',
                params: {
                  centerX: $PropertyValue.range('track-mask-x', 0.6, 0.7),
                  centerY: $PropertyValue.static(0.5),
                  radius: $PropertyValue.static(0.4),
                  cutout: $PropertyValue.static(false),
                },
              },
              children: [],
              invert: false,
              feather: 0.1,
            },
          ],
        },
      ],
    },
    {
      type: 'group',
      id: 'accent-group',
      name: 'Accent',
      visible: true,
      children: [
        {
          type: 'surface',
          id: 'accent-surface',
          name: 'Accent',
          visible: true,
          surface: {
            id: 'solid',
            params: {
              color1: $PropertyValue.static('A'),
            },
          },
        },
        {
          type: 'processor',
          id: 'processor-accent-mask',
          name: 'Accent Mask',
          visible: true,
          modifiers: [
            {
              type: 'mask',
              enabled: true,
              shape: {
                id: 'circle',
                params: {
                  centerX: $PropertyValue.static(0.25),
                  centerY: $PropertyValue.static(0.5),
                  radius: $PropertyValue.static(0.15),
                  cutout: $PropertyValue.static(false),
                },
              },
              children: [],
              invert: false,
              feather: 0.05,
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
        position: 'middle-left',
        content: 'Nature',
        colorKey: 'auto',
        fontSize: 4,
        fontId: 'cormorant-garamond',
      },
      {
        id: 'description-1',
        type: 'description',
        visible: true,
        position: 'middle-left',
        content: 'Inspired by the organic world',
        colorKey: 'auto',
        fontSize: 1.1,
        fontId: 'quicksand',
      },
    ],
  },
})

// ============================================================
// Preset 6: Morphing Blob
// Organic blob shape with continuous seed-based morphing
// ============================================================

const morphingBlobTimeline: Timeline = {
  loopType: 'forward',
  phases: [
    { id: 'phase-opening' as PhaseId, type: 'Opening', duration: 3000 },
    { id: 'phase-loop' as PhaseId, type: 'Loop', duration: 20000 },
  ],
  tracks: [
    // Opening: blob fades in with growing radius
    {
      id: 'track-radius-open' as TrackId,
      name: 'Radius Intro',
      clock: 'Phase',
      phaseId: 'phase-opening' as PhaseId,
      expression: '=smoothstep(0, 3000, @t)',
    },
    // Loop: continuous seed morphing (key animation - uses continuous seed function)
    {
      id: 'track-seed' as TrackId,
      name: 'Blob Seed',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      expression: '=phase(@t, 20000)',
    },
    // Loop: subtle radius breathing
    {
      id: 'track-radius' as TrackId,
      name: 'Blob Radius',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      expression: '=osc(@t, 12000)',
    },
    // Loop: amplitude variation
    {
      id: 'track-amplitude' as TrackId,
      name: 'Blob Amplitude',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      expression: '=osc(@t, 8000, 2000)',
    },
    // Loop: slow center drift X
    {
      id: 'track-center-x' as TrackId,
      name: 'Center X',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      expression: '=osc(@t, 16000)',
    },
    // Loop: slow center drift Y
    {
      id: 'track-center-y' as TrackId,
      name: 'Center Y',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      expression: '=osc(@t, 14000, 3500)',
    },
  ],
}

const createMorphingBlobConfig = (): HeroViewConfig => ({
  viewport: { width: 1280, height: 720 },
  colors: { semanticContext: 'canvas' },
  layers: [
    {
      type: 'group',
      id: 'background-group',
      name: 'Background',
      visible: true,
      children: [
        {
          type: 'surface',
          id: 'background',
          name: 'Gradient Background',
          visible: true,
          surface: {
            id: 'gradientGrainRadial',
            params: {
              centerX: $PropertyValue.static(0.5),
              centerY: $PropertyValue.static(0.5),
              radialStartAngle: $PropertyValue.static(0),
              radialSweepAngle: $PropertyValue.static(360),
              seed: $PropertyValue.static(77),
              sparsity: $PropertyValue.static(0.3),
              color1: $PropertyValue.static('F1'),
              color2: $PropertyValue.static('F2'),
            },
          },
        },
      ],
    },
    {
      type: 'group',
      id: 'blob-group',
      name: 'Morphing Blob',
      visible: true,
      children: [
        {
          type: 'surface',
          id: 'blob-surface',
          name: 'Blob Fill',
          visible: true,
          surface: {
            id: 'gradientGrainRadial',
            params: {
              centerX: $PropertyValue.range('track-center-x', 0.45, 0.55),
              centerY: $PropertyValue.range('track-center-y', 0.45, 0.55),
              radialStartAngle: $PropertyValue.static(0),
              radialSweepAngle: $PropertyValue.static(360),
              seed: $PropertyValue.static(42),
              sparsity: $PropertyValue.static(0.5),
              color1: $PropertyValue.static('A'),
              color2: $PropertyValue.static('B'),
            },
          },
        },
        {
          type: 'processor',
          id: 'processor-blob-mask',
          name: 'Blob Mask',
          visible: true,
          modifiers: [
            {
              type: 'mask',
              enabled: true,
              shape: {
                id: 'blob',
                params: {
                  centerX: $PropertyValue.range('track-center-x', 0.45, 0.55),
                  centerY: $PropertyValue.range('track-center-y', 0.45, 0.55),
                  baseRadius: $PropertyValue.range('track-radius', 0.35, 0.42),
                  amplitude: $PropertyValue.range('track-amplitude', 0.12, 0.18),
                  octaves: $PropertyValue.static(4),
                  seed: $PropertyValue.range('track-seed', 0, 100),
                },
              },
              children: [],
              invert: false,
              feather: 0.01,
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
        content: 'Morph',
        colorKey: 'auto',
        fontSize: 4.5,
        fontId: 'space-grotesk',
      },
      {
        id: 'description-1',
        type: 'description',
        visible: true,
        position: 'middle-center',
        content: 'Continuous transformation',
        colorKey: 'auto',
        fontSize: 1.1,
        fontId: 'quicksand',
      },
    ],
  },
})

// ============================================================
// Preset Collection
// ============================================================

export const ANIMATED_PRESETS: AnimatedPreset[] = [
  {
    id: 'breathing-circle',
    name: 'Breathing Circle',
    description: 'Gentle expansion with rhythmic stripe animation',
    timeline: breathingCircleTimeline,
    createConfig: createBreathingCircleConfig,
    colorPreset: {
      brand: { hue: 220, saturation: 65, value: 55 },
      accent: { hue: 340, saturation: 70, value: 60 },
      foundation: { hue: 220, saturation: 5, value: 95 },
    },
  },
  {
    id: 'rotating-sunburst',
    name: 'Rotating Sunburst',
    description: 'Dynamic rays with smooth continuous rotation',
    timeline: rotatingSunburstTimeline,
    createConfig: createRotatingSunburstConfig,
    colorPreset: {
      brand: { hue: 35, saturation: 85, value: 65 },
      accent: { hue: 15, saturation: 75, value: 55 },
      foundation: { hue: 40, saturation: 8, value: 97 },
    },
  },
  {
    id: 'flowing-waves',
    name: 'Flowing Waves',
    description: 'Ocean-inspired wave pattern with gentle motion',
    timeline: flowingWavesTimeline,
    createConfig: createFlowingWavesConfig,
    colorPreset: {
      brand: { hue: 200, saturation: 70, value: 50 },
      accent: { hue: 180, saturation: 60, value: 45 },
      foundation: { hue: 200, saturation: 10, value: 95 },
    },
  },
  {
    id: 'pulsing-grid',
    name: 'Pulsing Grid',
    description: 'Tech-inspired grid with rhythmic pulsation',
    timeline: pulsingGridTimeline,
    createConfig: createPulsingGridConfig,
    colorPreset: {
      brand: { hue: 160, saturation: 80, value: 50 },
      accent: { hue: 280, saturation: 65, value: 55 },
      foundation: { hue: 240, saturation: 15, value: 12 },
    },
  },
  {
    id: 'organic-scales',
    name: 'Organic Scales',
    description: 'Nature-inspired pattern with gentle breathing motion',
    timeline: organicScalesTimeline,
    createConfig: createOrganicScalesConfig,
    colorPreset: {
      brand: { hue: 145, saturation: 55, value: 50 },
      accent: { hue: 25, saturation: 70, value: 60 },
      foundation: { hue: 80, saturation: 8, value: 94 },
    },
  },
  {
    id: 'morphing-blob',
    name: 'Morphing Blob',
    description: 'Organic blob with continuous seed-based morphing',
    timeline: morphingBlobTimeline,
    createConfig: createMorphingBlobConfig,
    colorPreset: {
      brand: { hue: 280, saturation: 60, value: 55 },
      accent: { hue: 320, saturation: 70, value: 60 },
      foundation: { hue: 260, saturation: 10, value: 96 },
    },
  },
]

// ============================================================
// Default Export (for backward compatibility)
// ============================================================

// Default to the first preset
const defaultPreset = ANIMATED_PRESETS[0]!
export const animatedHeroTimeline = defaultPreset.timeline
export const createAnimatedHeroConfig = defaultPreset.createConfig

// Preset selection helper
export function getAnimatedPreset(id: string): AnimatedPreset | undefined {
  return ANIMATED_PRESETS.find((p) => p.id === id)
}
