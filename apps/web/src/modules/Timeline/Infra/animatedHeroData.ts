/**
 * Animated Hero Data
 *
 * Timeline data with DSL-based tracks that animate HeroScene parameters.
 * Multiple preset options available for different visual styles.
 *
 * ## Expression Convention
 *
 * All track expressions follow a normalized pattern:
 * 1. Base functions output 0-1 range: osc(), smoothstep(), phase(), etc.
 * 2. range() converts the 0-1 value to the final parameter value
 *
 * Pattern: `range(<0-1 function>, min, max)`
 *
 * Examples:
 * - `range(osc(t, 4000), 30, 60)` → oscillates between 30° and 60°
 * - `range(smoothstep(0, 3000, t), 0.1, 0.45)` → eases from 0.1 to 0.45
 * - `range(phase(t, 12000), 0, 360)` → linear 0° to 360° rotation
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
      targetParam: 'mask-radius',
      expression: 'range(smoothstep(0, 4000, t), 0.2, 0.4)',
    },
    // Loop: very gentle angle oscillation
    {
      id: 'track-stripe-angle' as TrackId,
      name: 'Stripe Angle',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      targetParam: 'stripe-angle',
      expression: 'range(osc(t, 12000), 40, 50)',
    },
    // Loop: subtle width breathing
    {
      id: 'track-stripe-width' as TrackId,
      name: 'Stripe Width',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      targetParam: 'stripe-width',
      expression: 'range(osc(t, 8000, 2000), 20, 28)',
    },
    // Loop: slow horizontal drift
    {
      id: 'track-mask-center-x' as TrackId,
      name: 'Mask Center X',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      targetParam: 'mask-center-x',
      expression: 'range(osc(t, 16000), 0.42, 0.58)',
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
              width1: $PropertyValue.binding('stripe-width'),
              width2: $PropertyValue.static(20),
              angle: $PropertyValue.binding('stripe-angle'),
            },
          },
          colors: { primary: 'B', secondary: 'Bt' },
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
                  centerX: $PropertyValue.binding('mask-center-x'),
                  centerY: $PropertyValue.static(0.5),
                  radius: $PropertyValue.binding('mask-radius'),
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
      targetParam: 'sunburst-rays',
      expression: 'range(smoothstep(0, 3500, t), 12, 16)',
    },
    // Loop: slow continuous rotation (30 seconds for full rotation)
    {
      id: 'track-twist' as TrackId,
      name: 'Twist',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      targetParam: 'sunburst-twist',
      expression: 'range(phase(t, 30000), 0, 360)',
    },
    // Loop: subtle rays breathing
    {
      id: 'track-rays-loop' as TrackId,
      name: 'Rays',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      targetParam: 'sunburst-rays',
      expression: 'range(osc(t, 15000), 14, 18)',
    },
    // Loop: very slow center drift
    {
      id: 'track-center-x' as TrackId,
      name: 'Center X',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      targetParam: 'sunburst-center-x',
      expression: 'range(osc(t, 20000), 0.45, 0.55)',
    },
    // Loop: very slow vertical drift
    {
      id: 'track-center-y' as TrackId,
      name: 'Center Y',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      targetParam: 'sunburst-center-y',
      expression: 'range(osc(t, 25000, 6000), 0.45, 0.55)',
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
              rays: $PropertyValue.binding('sunburst-rays'),
              centerX: $PropertyValue.binding('sunburst-center-x'),
              centerY: $PropertyValue.binding('sunburst-center-y'),
              twist: $PropertyValue.binding('sunburst-twist'),
            },
          },
          colors: { primary: 'A', secondary: 'At' },
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
          surface: { id: 'solid', params: {} },
          colors: { primary: 'B', secondary: 'Bt' },
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
                  centerX: $PropertyValue.binding('sunburst-center-x'),
                  centerY: $PropertyValue.binding('sunburst-center-y'),
                  radius: $PropertyValue.static(0.15),
                  cutout: $PropertyValue.static(false),
                },
              },
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
      targetParam: 'wave-amplitude',
      expression: 'range(smoothstep(0, 3000, t), 15, 25)',
    },
    // Loop: subtle amplitude breathing
    {
      id: 'track-amplitude' as TrackId,
      name: 'Amplitude',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      targetParam: 'wave-amplitude',
      expression: 'range(osc(t, 12000), 22, 30)',
    },
    // Loop: slow wavelength variation
    {
      id: 'track-wavelength' as TrackId,
      name: 'Wavelength',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      targetParam: 'wave-wavelength',
      expression: 'range(osc(t, 18000, 4500), 80, 100)',
    },
    // Loop: very gentle angle sway
    {
      id: 'track-wave-angle' as TrackId,
      name: 'Wave Angle',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      targetParam: 'wave-angle',
      expression: 'range(osc(t, 20000), -5, 5)',
    },
    // Loop: slow thickness breathing
    {
      id: 'track-thickness' as TrackId,
      name: 'Thickness',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      targetParam: 'wave-thickness',
      expression: 'range(osc(t, 10000, 2500), 4, 6)',
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
              amplitude: $PropertyValue.binding('wave-amplitude'),
              wavelength: $PropertyValue.binding('wave-wavelength'),
              thickness: $PropertyValue.binding('wave-thickness'),
              angle: $PropertyValue.binding('wave-angle'),
            },
          },
          colors: { primary: 'B', secondary: 'Bt' },
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
            id: 'gradientGrain',
            params: {
              depthMapType: $PropertyValue.static('linear'),
              angle: $PropertyValue.static(90),
              centerX: $PropertyValue.static(0.5),
              centerY: $PropertyValue.static(0.5),
              radialStartAngle: $PropertyValue.static(0),
              radialSweepAngle: $PropertyValue.static(360),
              perlinScale: $PropertyValue.static(3),
              perlinOctaves: $PropertyValue.static(3),
              perlinContrast: $PropertyValue.static(0.8),
              perlinOffset: $PropertyValue.static(0),
              seed: $PropertyValue.static(123),
              sparsity: $PropertyValue.static(0.4),
            },
          },
          colors: { primary: 'A', secondary: 'F1' },
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
      targetParam: 'grid-cell',
      expression: 'range(smoothstep(0, 2500, t), 50, 40)',
    },
    // Loop: subtle cell size breathing
    {
      id: 'track-cell' as TrackId,
      name: 'Cell Size',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      targetParam: 'grid-cell',
      expression: 'range(osc(t, 10000), 36, 44)',
    },
    // Loop: very subtle line width change
    {
      id: 'track-line-width' as TrackId,
      name: 'Line Width',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      targetParam: 'grid-line',
      expression: 'range(osc(t, 8000, 2000), 1.5, 2.5)',
    },
    // Loop: slow mask size breathing
    {
      id: 'track-mask-radius' as TrackId,
      name: 'Mask Radius',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      targetParam: 'mask-radius',
      expression: 'range(osc(t, 14000), 0.35, 0.45)',
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
              lineWidth: $PropertyValue.binding('grid-line'),
              cellSize: $PropertyValue.binding('grid-cell'),
            },
          },
          colors: { primary: 'F1', secondary: 'B' },
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
          surface: { id: 'solid', params: {} },
          colors: { primary: 'A', secondary: 'At' },
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
                  radius: $PropertyValue.binding('mask-radius'),
                  cutout: $PropertyValue.static(false),
                },
              },
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
      targetParam: 'scales-size',
      expression: 'range(smoothstep(0, 3500, t), 40, 32)',
    },
    // Loop: subtle scale size breathing
    {
      id: 'track-size' as TrackId,
      name: 'Scale Size',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      targetParam: 'scales-size',
      expression: 'range(osc(t, 14000), 30, 36)',
    },
    // Loop: slow overlap variation
    {
      id: 'track-overlap' as TrackId,
      name: 'Overlap',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      targetParam: 'scales-overlap',
      expression: 'range(osc(t, 16000, 4000), 0.4, 0.5)',
    },
    // Loop: very gentle angle sway
    {
      id: 'track-angle' as TrackId,
      name: 'Angle',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      targetParam: 'scales-angle',
      expression: 'range(osc(t, 18000), -5, 5)',
    },
    // Loop: slow mask drift
    {
      id: 'track-mask-x' as TrackId,
      name: 'Mask X',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      targetParam: 'mask-center-x',
      expression: 'range(osc(t, 20000), 0.6, 0.7)',
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
          surface: { id: 'solid', params: {} },
          colors: { primary: 'F1', secondary: 'F2' },
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
              size: $PropertyValue.binding('scales-size'),
              overlap: $PropertyValue.binding('scales-overlap'),
              angle: $PropertyValue.binding('scales-angle'),
            },
          },
          colors: { primary: 'B', secondary: 'Bt' },
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
                  centerX: $PropertyValue.binding('mask-center-x'),
                  centerY: $PropertyValue.static(0.5),
                  radius: $PropertyValue.static(0.4),
                  cutout: $PropertyValue.static(false),
                },
              },
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
          surface: { id: 'solid', params: {} },
          colors: { primary: 'A', secondary: 'At' },
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
