/**
 * ShaderRegistry
 *
 * Central registry for all shader definitions (built-in and custom).
 * Provides lookup by UUID and resolution of both legacy and modern formats.
 *
 * Built-in shaders have stable UUIDs that remain consistent across versions.
 */

import {
  type ShaderDefinition,
  type ShaderParamSchema,
  createShaderDefinition,
} from '../Domain/ShaderDefinition'
import {
  type ShaderRef,
  type LegacyShaderRef,
  type SurfaceRef,
  isShaderRef,
  isLegacyShaderRef,
} from '../Domain/ShaderRef'

// ============================================================
// Built-in Shader UUIDs (stable, do not change)
// ============================================================

/**
 * Stable UUIDs for built-in surface shaders
 *
 * These UUIDs are permanent and should never be changed to maintain
 * backward compatibility with saved presets.
 */
export const SURFACE_SHADER_IDS = {
  solid: '00000000-0000-0000-0000-000000000001',
  stripe: '00000000-0000-0000-0000-000000000002',
  grid: '00000000-0000-0000-0000-000000000003',
  polkaDot: '00000000-0000-0000-0000-000000000004',
  checker: '00000000-0000-0000-0000-000000000005',
  triangle: '00000000-0000-0000-0000-000000000006',
  hexagon: '00000000-0000-0000-0000-000000000007',
  gradientGrain: '00000000-0000-0000-0000-000000000008',
  asanoha: '00000000-0000-0000-0000-000000000009',
  seigaiha: '00000000-0000-0000-0000-00000000000a',
  wave: '00000000-0000-0000-0000-00000000000b',
  scales: '00000000-0000-0000-0000-00000000000c',
  ogee: '00000000-0000-0000-0000-00000000000d',
  sunburst: '00000000-0000-0000-0000-00000000000e',
  image: '00000000-0000-0000-0000-00000000000f',
} as const

/**
 * Stable UUIDs for built-in mask shaders
 */
export const MASK_SHADER_IDS = {
  circle: '00000000-0000-0000-0001-000000000001',
  rect: '00000000-0000-0000-0001-000000000002',
  blob: '00000000-0000-0000-0001-000000000003',
  perlin: '00000000-0000-0000-0001-000000000004',
  linearGradient: '00000000-0000-0000-0001-000000000005',
  radialGradient: '00000000-0000-0000-0001-000000000006',
  boxGradient: '00000000-0000-0000-0001-000000000007',
} as const

/**
 * Stable UUIDs for built-in effect shaders
 */
export const EFFECT_SHADER_IDS = {
  vignette: '00000000-0000-0000-0002-000000000001',
  chromaticAberration: '00000000-0000-0000-0002-000000000002',
  dotHalftone: '00000000-0000-0000-0002-000000000003',
  lineHalftone: '00000000-0000-0000-0002-000000000004',
  blur: '00000000-0000-0000-0002-000000000005',
} as const

// ============================================================
// Parameter Schemas for Built-in Shaders
// ============================================================

const solidParamSchema: ShaderParamSchema = {
  type: 'object',
  properties: {},
}

const stripeParamSchema: ShaderParamSchema = {
  type: 'object',
  properties: {
    width1: { type: 'number', label: 'Width 1', default: 20, min: 1, max: 200, step: 1, unit: 'px' },
    width2: { type: 'number', label: 'Width 2', default: 20, min: 1, max: 200, step: 1, unit: 'px' },
    angle: { type: 'number', label: 'Angle', default: 45, min: 0, max: 360, step: 1, unit: 'deg' },
  },
}

const gridParamSchema: ShaderParamSchema = {
  type: 'object',
  properties: {
    lineWidth: { type: 'number', label: 'Line Width', default: 2, min: 1, max: 20, step: 1, unit: 'px' },
    cellSize: { type: 'number', label: 'Cell Size', default: 40, min: 10, max: 200, step: 1, unit: 'px' },
  },
}

const polkaDotParamSchema: ShaderParamSchema = {
  type: 'object',
  properties: {
    dotRadius: { type: 'number', label: 'Dot Radius', default: 10, min: 2, max: 50, step: 1, unit: 'px' },
    spacing: { type: 'number', label: 'Spacing', default: 40, min: 10, max: 200, step: 1, unit: 'px' },
    rowOffset: { type: 'number', label: 'Row Offset', default: 0.5, min: 0, max: 1, step: 0.1 },
  },
}

const checkerParamSchema: ShaderParamSchema = {
  type: 'object',
  properties: {
    cellSize: { type: 'number', label: 'Cell Size', default: 40, min: 10, max: 200, step: 1, unit: 'px' },
    angle: { type: 'number', label: 'Angle', default: 0, min: 0, max: 360, step: 1, unit: 'deg' },
  },
}

const triangleParamSchema: ShaderParamSchema = {
  type: 'object',
  properties: {
    size: { type: 'number', label: 'Size', default: 40, min: 10, max: 200, step: 1, unit: 'px' },
    angle: { type: 'number', label: 'Angle', default: 0, min: 0, max: 360, step: 1, unit: 'deg' },
  },
}

const hexagonParamSchema: ShaderParamSchema = {
  type: 'object',
  properties: {
    size: { type: 'number', label: 'Size', default: 30, min: 10, max: 100, step: 1, unit: 'px' },
    angle: { type: 'number', label: 'Angle', default: 0, min: 0, max: 360, step: 1, unit: 'deg' },
  },
}

const gradientGrainParamSchema: ShaderParamSchema = {
  type: 'object',
  properties: {
    depthMapType: {
      type: 'select',
      label: 'Depth Map Type',
      default: 'linear',
      options: [
        { value: 'linear', label: 'Linear' },
        { value: 'circular', label: 'Circular' },
        { value: 'radial', label: 'Radial' },
        { value: 'perlin', label: 'Perlin' },
      ],
    },
    angle: { type: 'number', label: 'Angle', default: 0, min: 0, max: 360, step: 1, unit: 'deg' },
    centerX: { type: 'number', label: 'Center X', default: 0.5, min: 0, max: 1, step: 0.01 },
    centerY: { type: 'number', label: 'Center Y', default: 0.5, min: 0, max: 1, step: 0.01 },
    radialStartAngle: { type: 'number', label: 'Radial Start Angle', default: 0, min: 0, max: 360, step: 1, unit: 'deg' },
    radialSweepAngle: { type: 'number', label: 'Radial Sweep Angle', default: 360, min: 0, max: 360, step: 1, unit: 'deg' },
    perlinScale: { type: 'number', label: 'Perlin Scale', default: 4, min: 1, max: 20, step: 0.5 },
    perlinOctaves: { type: 'number', label: 'Perlin Octaves', default: 4, min: 1, max: 8, step: 1 },
    perlinContrast: { type: 'number', label: 'Perlin Contrast', default: 1, min: 0, max: 2, step: 0.1 },
    perlinOffset: { type: 'number', label: 'Perlin Offset', default: 0, min: -1, max: 1, step: 0.1 },
    seed: { type: 'number', label: 'Seed', default: 42, min: 0, max: 1000, step: 1 },
    sparsity: { type: 'number', label: 'Sparsity', default: 0.5, min: 0, max: 1, step: 0.01 },
  },
}

const asanohaParamSchema: ShaderParamSchema = {
  type: 'object',
  properties: {
    size: { type: 'number', label: 'Size', default: 60, min: 20, max: 200, step: 1, unit: 'px' },
    lineWidth: { type: 'number', label: 'Line Width', default: 2, min: 1, max: 10, step: 0.5, unit: 'px' },
  },
}

const seigaihaParamSchema: ShaderParamSchema = {
  type: 'object',
  properties: {
    radius: { type: 'number', label: 'Radius', default: 40, min: 10, max: 100, step: 1, unit: 'px' },
    rings: { type: 'number', label: 'Rings', default: 3, min: 1, max: 10, step: 1 },
    lineWidth: { type: 'number', label: 'Line Width', default: 2, min: 1, max: 10, step: 0.5, unit: 'px' },
  },
}

const waveParamSchema: ShaderParamSchema = {
  type: 'object',
  properties: {
    amplitude: { type: 'number', label: 'Amplitude', default: 20, min: 5, max: 100, step: 1, unit: 'px' },
    wavelength: { type: 'number', label: 'Wavelength', default: 60, min: 20, max: 200, step: 1, unit: 'px' },
    thickness: { type: 'number', label: 'Thickness', default: 8, min: 1, max: 30, step: 1, unit: 'px' },
    angle: { type: 'number', label: 'Angle', default: 0, min: 0, max: 360, step: 1, unit: 'deg' },
  },
}

const scalesParamSchema: ShaderParamSchema = {
  type: 'object',
  properties: {
    size: { type: 'number', label: 'Size', default: 30, min: 10, max: 100, step: 1, unit: 'px' },
    overlap: { type: 'number', label: 'Overlap', default: 0.5, min: 0, max: 1, step: 0.05 },
    angle: { type: 'number', label: 'Angle', default: 0, min: 0, max: 360, step: 1, unit: 'deg' },
  },
}

const ogeeParamSchema: ShaderParamSchema = {
  type: 'object',
  properties: {
    width: { type: 'number', label: 'Width', default: 60, min: 20, max: 200, step: 1, unit: 'px' },
    height: { type: 'number', label: 'Height', default: 80, min: 30, max: 250, step: 1, unit: 'px' },
    lineWidth: { type: 'number', label: 'Line Width', default: 2, min: 1, max: 10, step: 0.5, unit: 'px' },
  },
}

const sunburstParamSchema: ShaderParamSchema = {
  type: 'object',
  properties: {
    rays: { type: 'number', label: 'Rays', default: 12, min: 3, max: 48, step: 1 },
    centerX: { type: 'number', label: 'Center X', default: 0.5, min: 0, max: 1, step: 0.01 },
    centerY: { type: 'number', label: 'Center Y', default: 0.5, min: 0, max: 1, step: 0.01 },
    twist: { type: 'number', label: 'Twist', default: 0, min: -1, max: 1, step: 0.01 },
  },
}

const imageParamSchema: ShaderParamSchema = {
  type: 'object',
  properties: {
    imageId: { type: 'string', label: 'Image ID', default: '' },
  },
}

// Mask parameter schemas
const circleMaskParamSchema: ShaderParamSchema = {
  type: 'object',
  properties: {
    centerX: { type: 'number', label: 'Center X', default: 0.5, min: 0, max: 1, step: 0.01 },
    centerY: { type: 'number', label: 'Center Y', default: 0.5, min: 0, max: 1, step: 0.01 },
    radius: { type: 'number', label: 'Radius', default: 0.3, min: 0.01, max: 1, step: 0.01 },
    cutout: { type: 'boolean', label: 'Cutout', default: false, description: 'Render outside the shape' },
  },
}

const rectMaskParamSchema: ShaderParamSchema = {
  type: 'object',
  properties: {
    left: { type: 'number', label: 'Left', default: 0.2, min: 0, max: 1, step: 0.01 },
    right: { type: 'number', label: 'Right', default: 0.8, min: 0, max: 1, step: 0.01 },
    top: { type: 'number', label: 'Top', default: 0.2, min: 0, max: 1, step: 0.01 },
    bottom: { type: 'number', label: 'Bottom', default: 0.8, min: 0, max: 1, step: 0.01 },
    radiusTopLeft: { type: 'number', label: 'Top Left Radius', default: 0, min: 0, max: 0.5, step: 0.01 },
    radiusTopRight: { type: 'number', label: 'Top Right Radius', default: 0, min: 0, max: 0.5, step: 0.01 },
    radiusBottomLeft: { type: 'number', label: 'Bottom Left Radius', default: 0, min: 0, max: 0.5, step: 0.01 },
    radiusBottomRight: { type: 'number', label: 'Bottom Right Radius', default: 0, min: 0, max: 0.5, step: 0.01 },
    rotation: { type: 'number', label: 'Rotation', default: 0, min: 0, max: 360, step: 1, unit: 'deg' },
    perspectiveX: { type: 'number', label: 'Perspective X', default: 0, min: -0.5, max: 0.5, step: 0.01 },
    perspectiveY: { type: 'number', label: 'Perspective Y', default: 0, min: -0.5, max: 0.5, step: 0.01 },
    cutout: { type: 'boolean', label: 'Cutout', default: false },
  },
}

const blobMaskParamSchema: ShaderParamSchema = {
  type: 'object',
  properties: {
    centerX: { type: 'number', label: 'Center X', default: 0.5, min: 0, max: 1, step: 0.01 },
    centerY: { type: 'number', label: 'Center Y', default: 0.5, min: 0, max: 1, step: 0.01 },
    baseRadius: { type: 'number', label: 'Base Radius', default: 0.3, min: 0.01, max: 1, step: 0.01 },
    amplitude: { type: 'number', label: 'Amplitude', default: 0.1, min: 0, max: 0.5, step: 0.01 },
    octaves: { type: 'number', label: 'Octaves', default: 3, min: 1, max: 8, step: 1 },
    seed: { type: 'number', label: 'Seed', default: 42, min: 0, max: 1000, step: 1 },
    cutout: { type: 'boolean', label: 'Cutout', default: false },
  },
}

const perlinMaskParamSchema: ShaderParamSchema = {
  type: 'object',
  properties: {
    seed: { type: 'number', label: 'Seed', default: 42, min: 0, max: 1000, step: 1 },
    threshold: { type: 'number', label: 'Threshold', default: 0.5, min: 0, max: 1, step: 0.01 },
    scale: { type: 'number', label: 'Scale', default: 4, min: 1, max: 20, step: 0.5 },
    octaves: { type: 'number', label: 'Octaves', default: 4, min: 1, max: 8, step: 1 },
    cutout: { type: 'boolean', label: 'Cutout', default: false },
  },
}

const linearGradientMaskParamSchema: ShaderParamSchema = {
  type: 'object',
  properties: {
    angle: { type: 'number', label: 'Angle', default: 0, min: 0, max: 360, step: 1, unit: 'deg' },
    startOffset: { type: 'number', label: 'Start', default: 0.3, min: 0, max: 1, step: 0.01 },
    endOffset: { type: 'number', label: 'End', default: 0.7, min: 0, max: 1, step: 0.01 },
    cutout: { type: 'boolean', label: 'Cutout', default: false },
  },
}

const radialGradientMaskParamSchema: ShaderParamSchema = {
  type: 'object',
  properties: {
    centerX: { type: 'number', label: 'Center X', default: 0.5, min: 0, max: 1, step: 0.01 },
    centerY: { type: 'number', label: 'Center Y', default: 0.5, min: 0, max: 1, step: 0.01 },
    innerRadius: { type: 'number', label: 'Inner Radius', default: 0.1, min: 0, max: 1, step: 0.01 },
    outerRadius: { type: 'number', label: 'Outer Radius', default: 0.5, min: 0, max: 1.5, step: 0.01 },
    aspectRatio: { type: 'number', label: 'Aspect Ratio', default: 1, min: 0.25, max: 4, step: 0.05 },
    cutout: { type: 'boolean', label: 'Cutout', default: false },
  },
}

const boxGradientMaskParamSchema: ShaderParamSchema = {
  type: 'object',
  properties: {
    left: { type: 'number', label: 'Left', default: 0.1, min: 0, max: 0.5, step: 0.01 },
    right: { type: 'number', label: 'Right', default: 0.1, min: 0, max: 0.5, step: 0.01 },
    top: { type: 'number', label: 'Top', default: 0.1, min: 0, max: 0.5, step: 0.01 },
    bottom: { type: 'number', label: 'Bottom', default: 0.1, min: 0, max: 0.5, step: 0.01 },
    cornerRadius: { type: 'number', label: 'Corner Radius', default: 0, min: 0, max: 0.5, step: 0.01 },
    curve: {
      type: 'select',
      label: 'Curve',
      default: 'linear',
      options: [
        { value: 'linear', label: 'Linear' },
        { value: 'smooth', label: 'Smooth' },
        { value: 'easeIn', label: 'Ease In' },
        { value: 'easeOut', label: 'Ease Out' },
      ],
    },
    cutout: { type: 'boolean', label: 'Cutout', default: false },
  },
}

// Effect parameter schemas
const vignetteEffectParamSchema: ShaderParamSchema = {
  type: 'object',
  properties: {
    enabled: { type: 'boolean', label: 'Enabled', default: false },
    intensity: { type: 'number', label: 'Intensity', default: 0.5, min: 0, max: 1, step: 0.01 },
    softness: { type: 'number', label: 'Softness', default: 0.4, min: 0.1, max: 1, step: 0.01 },
    radius: { type: 'number', label: 'Radius', default: 0.8, min: 0.2, max: 1.5, step: 0.01 },
  },
}

const chromaticAberrationParamSchema: ShaderParamSchema = {
  type: 'object',
  properties: {
    enabled: { type: 'boolean', label: 'Enabled', default: false },
    intensity: { type: 'number', label: 'Intensity', default: 3, min: 0, max: 20, step: 0.5 },
  },
}

const dotHalftoneParamSchema: ShaderParamSchema = {
  type: 'object',
  properties: {
    enabled: { type: 'boolean', label: 'Enabled', default: false },
    dotSize: { type: 'number', label: 'Dot Size', default: 8, min: 2, max: 30, step: 1, unit: 'px' },
    spacing: { type: 'number', label: 'Spacing', default: 16, min: 4, max: 60, step: 1, unit: 'px' },
    angle: { type: 'number', label: 'Angle', default: 45, min: 0, max: 90, step: 1, unit: 'deg' },
  },
}

const lineHalftoneParamSchema: ShaderParamSchema = {
  type: 'object',
  properties: {
    enabled: { type: 'boolean', label: 'Enabled', default: false },
    lineWidth: { type: 'number', label: 'Line Width', default: 4, min: 1, max: 20, step: 1, unit: 'px' },
    spacing: { type: 'number', label: 'Spacing', default: 12, min: 4, max: 40, step: 1, unit: 'px' },
    angle: { type: 'number', label: 'Angle', default: 45, min: 0, max: 180, step: 1, unit: 'deg' },
  },
}

const blurEffectParamSchema: ShaderParamSchema = {
  type: 'object',
  properties: {
    enabled: { type: 'boolean', label: 'Enabled', default: false },
    radius: { type: 'number', label: 'Blur Radius', default: 8, min: 1, max: 30, step: 1, unit: 'px' },
  },
}

// ============================================================
// Built-in Shader Definitions
// ============================================================

/**
 * All built-in surface shader definitions
 */
export const SURFACE_SHADERS: ShaderDefinition[] = [
  createShaderDefinition({
    id: SURFACE_SHADER_IDS.solid,
    name: 'Solid',
    description: 'Single solid color',
    category: 'surface',
    paramSchema: solidParamSchema,
    tags: ['basic', 'solid'],
  }),
  createShaderDefinition({
    id: SURFACE_SHADER_IDS.stripe,
    name: 'Stripe',
    description: 'Two-color stripe pattern with configurable widths and angle',
    category: 'surface',
    paramSchema: stripeParamSchema,
    tags: ['geometric', 'stripes', 'classic'],
  }),
  createShaderDefinition({
    id: SURFACE_SHADER_IDS.grid,
    name: 'Grid',
    description: 'Grid pattern with configurable line width and cell size',
    category: 'surface',
    paramSchema: gridParamSchema,
    tags: ['geometric', 'grid', 'classic'],
  }),
  createShaderDefinition({
    id: SURFACE_SHADER_IDS.polkaDot,
    name: 'Polka Dot',
    description: 'Polka dot pattern with configurable size and spacing',
    category: 'surface',
    paramSchema: polkaDotParamSchema,
    tags: ['geometric', 'dots', 'playful'],
  }),
  createShaderDefinition({
    id: SURFACE_SHADER_IDS.checker,
    name: 'Checker',
    description: 'Checkerboard pattern with configurable cell size',
    category: 'surface',
    paramSchema: checkerParamSchema,
    tags: ['geometric', 'checker', 'classic'],
  }),
  createShaderDefinition({
    id: SURFACE_SHADER_IDS.triangle,
    name: 'Triangle',
    description: 'Triangular tessellation pattern',
    category: 'surface',
    paramSchema: triangleParamSchema,
    tags: ['geometric', 'triangles'],
  }),
  createShaderDefinition({
    id: SURFACE_SHADER_IDS.hexagon,
    name: 'Hexagon',
    description: 'Hexagonal honeycomb pattern',
    category: 'surface',
    paramSchema: hexagonParamSchema,
    tags: ['geometric', 'hexagon', 'honeycomb'],
  }),
  createShaderDefinition({
    id: SURFACE_SHADER_IDS.gradientGrain,
    name: 'Gradient Grain',
    description: 'Grainy gradient with multiple depth map options',
    category: 'surface',
    paramSchema: gradientGrainParamSchema,
    tags: ['gradient', 'grain', 'noise', 'artistic'],
  }),
  createShaderDefinition({
    id: SURFACE_SHADER_IDS.asanoha,
    name: 'Asanoha',
    description: 'Traditional Japanese hemp leaf pattern',
    category: 'surface',
    paramSchema: asanohaParamSchema,
    tags: ['japanese', 'traditional', 'textile'],
  }),
  createShaderDefinition({
    id: SURFACE_SHADER_IDS.seigaiha,
    name: 'Seigaiha',
    description: 'Traditional Japanese wave pattern',
    category: 'surface',
    paramSchema: seigaihaParamSchema,
    tags: ['japanese', 'traditional', 'waves'],
  }),
  createShaderDefinition({
    id: SURFACE_SHADER_IDS.wave,
    name: 'Wave',
    description: 'Wavy line pattern',
    category: 'surface',
    paramSchema: waveParamSchema,
    tags: ['organic', 'waves', 'flowing'],
  }),
  createShaderDefinition({
    id: SURFACE_SHADER_IDS.scales,
    name: 'Scales',
    description: 'Fish scale or roof tile pattern',
    category: 'surface',
    paramSchema: scalesParamSchema,
    tags: ['organic', 'scales', 'natural'],
  }),
  createShaderDefinition({
    id: SURFACE_SHADER_IDS.ogee,
    name: 'Ogee',
    description: 'Classic ogee architectural pattern',
    category: 'surface',
    paramSchema: ogeeParamSchema,
    tags: ['architectural', 'classic', 'elegant'],
  }),
  createShaderDefinition({
    id: SURFACE_SHADER_IDS.sunburst,
    name: 'Sunburst',
    description: 'Radial sunburst pattern',
    category: 'surface',
    paramSchema: sunburstParamSchema,
    tags: ['radial', 'sunburst', 'dramatic'],
  }),
  createShaderDefinition({
    id: SURFACE_SHADER_IDS.image,
    name: 'Image',
    description: 'Custom image texture',
    category: 'surface',
    paramSchema: imageParamSchema,
    tags: ['image', 'custom'],
  }),
]

/**
 * All built-in mask shader definitions
 */
export const MASK_SHADERS: ShaderDefinition[] = [
  createShaderDefinition({
    id: MASK_SHADER_IDS.circle,
    name: 'Circle',
    description: 'Circular mask shape',
    category: 'mask',
    paramSchema: circleMaskParamSchema,
    tags: ['shape', 'circle', 'basic'],
  }),
  createShaderDefinition({
    id: MASK_SHADER_IDS.rect,
    name: 'Rectangle',
    description: 'Rectangular mask with optional rounded corners',
    category: 'mask',
    paramSchema: rectMaskParamSchema,
    tags: ['shape', 'rectangle', 'basic'],
  }),
  createShaderDefinition({
    id: MASK_SHADER_IDS.blob,
    name: 'Blob',
    description: 'Organic blob shape with noise-based edges',
    category: 'mask',
    paramSchema: blobMaskParamSchema,
    tags: ['shape', 'organic', 'blob'],
  }),
  createShaderDefinition({
    id: MASK_SHADER_IDS.perlin,
    name: 'Perlin Noise',
    description: 'Perlin noise-based mask',
    category: 'mask',
    paramSchema: perlinMaskParamSchema,
    tags: ['noise', 'procedural', 'organic'],
  }),
  createShaderDefinition({
    id: MASK_SHADER_IDS.linearGradient,
    name: 'Linear Gradient',
    description: 'Linear gradient fade mask',
    category: 'mask',
    paramSchema: linearGradientMaskParamSchema,
    tags: ['gradient', 'fade', 'linear'],
  }),
  createShaderDefinition({
    id: MASK_SHADER_IDS.radialGradient,
    name: 'Radial Gradient',
    description: 'Radial gradient fade mask',
    category: 'mask',
    paramSchema: radialGradientMaskParamSchema,
    tags: ['gradient', 'fade', 'radial'],
  }),
  createShaderDefinition({
    id: MASK_SHADER_IDS.boxGradient,
    name: 'Box Gradient',
    description: 'Box-shaped gradient with fade from edges',
    category: 'mask',
    paramSchema: boxGradientMaskParamSchema,
    tags: ['gradient', 'fade', 'box', 'vignette'],
  }),
]

/**
 * All built-in effect shader definitions
 */
export const EFFECT_SHADERS: ShaderDefinition[] = [
  createShaderDefinition({
    id: EFFECT_SHADER_IDS.vignette,
    name: 'Vignette',
    description: 'Darkened edges effect',
    category: 'effect',
    paramSchema: vignetteEffectParamSchema,
    tags: ['post-process', 'vignette', 'classic'],
  }),
  createShaderDefinition({
    id: EFFECT_SHADER_IDS.chromaticAberration,
    name: 'Chromatic Aberration',
    description: 'Color fringing effect',
    category: 'effect',
    paramSchema: chromaticAberrationParamSchema,
    tags: ['post-process', 'chromatic', 'lens'],
  }),
  createShaderDefinition({
    id: EFFECT_SHADER_IDS.dotHalftone,
    name: 'Dot Halftone',
    description: 'Classic halftone dot pattern effect',
    category: 'effect',
    paramSchema: dotHalftoneParamSchema,
    tags: ['post-process', 'halftone', 'print'],
  }),
  createShaderDefinition({
    id: EFFECT_SHADER_IDS.lineHalftone,
    name: 'Line Halftone',
    description: 'Line-based halftone effect',
    category: 'effect',
    paramSchema: lineHalftoneParamSchema,
    tags: ['post-process', 'halftone', 'engraving'],
  }),
  createShaderDefinition({
    id: EFFECT_SHADER_IDS.blur,
    name: 'Blur',
    description: 'Gaussian blur effect',
    category: 'effect',
    paramSchema: blurEffectParamSchema,
    tags: ['post-process', 'blur', 'soft'],
  }),
]

// ============================================================
// Registry Class
// ============================================================

/**
 * ShaderRegistry class for managing shader definitions
 */
export class ShaderRegistry {
  private shaders = new Map<string, ShaderDefinition>()
  private typeToIdMap = new Map<string, string>()

  constructor() {
    // Register all built-in shaders
    this.registerBuiltinShaders()
  }

  private registerBuiltinShaders(): void {
    // Register surface shaders
    for (const shader of SURFACE_SHADERS) {
      this.shaders.set(shader.id, shader)
    }
    // Build type-to-id map for surface shaders
    this.typeToIdMap.set('solid', SURFACE_SHADER_IDS.solid)
    this.typeToIdMap.set('stripe', SURFACE_SHADER_IDS.stripe)
    this.typeToIdMap.set('grid', SURFACE_SHADER_IDS.grid)
    this.typeToIdMap.set('polkaDot', SURFACE_SHADER_IDS.polkaDot)
    this.typeToIdMap.set('checker', SURFACE_SHADER_IDS.checker)
    this.typeToIdMap.set('triangle', SURFACE_SHADER_IDS.triangle)
    this.typeToIdMap.set('hexagon', SURFACE_SHADER_IDS.hexagon)
    this.typeToIdMap.set('gradientGrain', SURFACE_SHADER_IDS.gradientGrain)
    this.typeToIdMap.set('asanoha', SURFACE_SHADER_IDS.asanoha)
    this.typeToIdMap.set('seigaiha', SURFACE_SHADER_IDS.seigaiha)
    this.typeToIdMap.set('wave', SURFACE_SHADER_IDS.wave)
    this.typeToIdMap.set('scales', SURFACE_SHADER_IDS.scales)
    this.typeToIdMap.set('ogee', SURFACE_SHADER_IDS.ogee)
    this.typeToIdMap.set('sunburst', SURFACE_SHADER_IDS.sunburst)
    this.typeToIdMap.set('image', SURFACE_SHADER_IDS.image)

    // Register mask shaders
    for (const shader of MASK_SHADERS) {
      this.shaders.set(shader.id, shader)
    }
    // Build type-to-id map for mask shaders
    this.typeToIdMap.set('mask:circle', MASK_SHADER_IDS.circle)
    this.typeToIdMap.set('mask:rect', MASK_SHADER_IDS.rect)
    this.typeToIdMap.set('mask:blob', MASK_SHADER_IDS.blob)
    this.typeToIdMap.set('mask:perlin', MASK_SHADER_IDS.perlin)
    this.typeToIdMap.set('mask:linearGradient', MASK_SHADER_IDS.linearGradient)
    this.typeToIdMap.set('mask:radialGradient', MASK_SHADER_IDS.radialGradient)
    this.typeToIdMap.set('mask:boxGradient', MASK_SHADER_IDS.boxGradient)

    // Register effect shaders
    for (const shader of EFFECT_SHADERS) {
      this.shaders.set(shader.id, shader)
    }
    // Build type-to-id map for effect shaders
    this.typeToIdMap.set('effect:vignette', EFFECT_SHADER_IDS.vignette)
    this.typeToIdMap.set('effect:chromaticAberration', EFFECT_SHADER_IDS.chromaticAberration)
    this.typeToIdMap.set('effect:dotHalftone', EFFECT_SHADER_IDS.dotHalftone)
    this.typeToIdMap.set('effect:lineHalftone', EFFECT_SHADER_IDS.lineHalftone)
    this.typeToIdMap.set('effect:blur', EFFECT_SHADER_IDS.blur)
  }

  /**
   * Get a shader by UUID
   */
  getById(id: string): ShaderDefinition | undefined {
    return this.shaders.get(id)
  }

  /**
   * Get a shader UUID by legacy type name
   *
   * @param type - Legacy type name (e.g., 'stripe', 'mask:circle', 'effect:vignette')
   * @returns UUID or undefined if not found
   */
  getIdByType(type: string): string | undefined {
    return this.typeToIdMap.get(type)
  }

  /**
   * Get a shader by legacy type name
   */
  getByType(type: string): ShaderDefinition | undefined {
    const id = this.typeToIdMap.get(type)
    return id ? this.shaders.get(id) : undefined
  }

  /**
   * Get all shaders of a given category
   */
  getByCategory(category: ShaderDefinition['category']): ShaderDefinition[] {
    return Array.from(this.shaders.values()).filter((s) => s.category === category)
  }

  /**
   * Get all surface shaders
   */
  getSurfaceShaders(): ShaderDefinition[] {
    return this.getByCategory('surface')
  }

  /**
   * Get all mask shaders
   */
  getMaskShaders(): ShaderDefinition[] {
    return this.getByCategory('mask')
  }

  /**
   * Get all effect shaders
   */
  getEffectShaders(): ShaderDefinition[] {
    return this.getByCategory('effect')
  }

  /**
   * Register a custom shader
   */
  register(shader: ShaderDefinition): void {
    this.shaders.set(shader.id, shader)
  }

  /**
   * Check if a shader exists
   */
  has(id: string): boolean {
    return this.shaders.has(id)
  }

  /**
   * Get the total number of registered shaders
   */
  get size(): number {
    return this.shaders.size
  }
}

// ============================================================
// Singleton Instance
// ============================================================

/**
 * Global shader registry instance
 */
export const shaderRegistry = new ShaderRegistry()

// ============================================================
// Resolver Functions
// ============================================================

/**
 * Resolve a shader reference (legacy or UUID) to a ShaderDefinition
 *
 * @param ref - Either a legacy type-based reference or a UUID-based ShaderRef
 * @returns The resolved ShaderDefinition or undefined if not found
 *
 * @example
 * ```typescript
 * // Legacy format
 * const shader1 = resolveShader({ type: 'stripe', width1: 20, width2: 20, angle: 45 })
 *
 * // UUID format
 * const shader2 = resolveShader({ shaderId: '00000000-0000-0000-0000-000000000002' })
 * ```
 */
export function resolveShader(ref: SurfaceRef): ShaderDefinition | undefined {
  if (isShaderRef(ref)) {
    return shaderRegistry.getById(ref.shaderId)
  }
  if (isLegacyShaderRef(ref)) {
    return shaderRegistry.getByType(ref.type)
  }
  return undefined
}

/**
 * Resolve a shader reference and return both the definition and merged params
 *
 * @param ref - Either a legacy type-based reference or a UUID-based ShaderRef
 * @returns Object with shader definition and merged parameters, or undefined if not found
 */
export function resolveShaderWithParams(ref: SurfaceRef): {
  shader: ShaderDefinition
  params: Record<string, unknown>
} | undefined {
  const shader = resolveShader(ref)
  if (!shader) return undefined

  // Get default params from schema
  const defaultParams: Record<string, unknown> = {}
  for (const [key, def] of Object.entries(shader.paramSchema.properties)) {
    defaultParams[key] = def.default
  }

  // Merge with provided params
  let providedParams: Record<string, unknown>
  if (isShaderRef(ref)) {
    providedParams = ref.params ?? {}
  } else {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { type, ...rest } = ref
    providedParams = rest
  }

  return {
    shader,
    params: { ...defaultParams, ...providedParams },
  }
}

/**
 * Convert a legacy reference to a UUID-based ShaderRef
 *
 * @param legacyRef - Legacy type-based reference
 * @returns UUID-based ShaderRef or undefined if type not recognized
 */
export function convertToShaderRef(legacyRef: LegacyShaderRef): ShaderRef | undefined {
  const shaderId = shaderRegistry.getIdByType(legacyRef.type)
  if (!shaderId) return undefined

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { type, ...params } = legacyRef
  return {
    shaderId,
    params: Object.keys(params).length > 0 ? params : undefined,
  }
}

/**
 * Convert a ShaderRef to legacy format
 *
 * @param ref - UUID-based ShaderRef
 * @returns Legacy format reference or undefined if shader not found
 */
export function convertToLegacyRef(ref: ShaderRef): LegacyShaderRef | undefined {
  const shader = shaderRegistry.getById(ref.shaderId)
  if (!shader) return undefined

  // Find the legacy type for this shader
  let legacyType: string | undefined
  for (const [type, id] of Object.entries(SURFACE_SHADER_IDS)) {
    if (id === ref.shaderId) {
      legacyType = type
      break
    }
  }

  if (!legacyType) return undefined

  // Get default params
  const defaultParams: Record<string, unknown> = {}
  for (const [key, def] of Object.entries(shader.paramSchema.properties)) {
    defaultParams[key] = def.default
  }

  // Merge with provided params
  const params = { ...defaultParams, ...(ref.params ?? {}) }

  return { type: legacyType, ...params } as LegacyShaderRef
}
