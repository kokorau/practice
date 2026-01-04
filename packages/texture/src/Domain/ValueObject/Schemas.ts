/**
 * Shape and Surface Schemas
 *
 * Schema definitions for mask shapes and surface textures with UI metadata.
 */

import {
  defineSchema,
  number,
  boolean,
  select,
  getDefaults,
  type Infer,
} from '@practice/schema'

// ============================================================
// Shape Schemas (Mask Shapes)
// ============================================================

/**
 * Circle Mask Shape Schema
 */
export const CircleMaskShapeSchema = defineSchema({
  centerX: number({ label: 'Center X', min: 0, max: 1, step: 0.01, default: 0.5 }),
  centerY: number({ label: 'Center Y', min: 0, max: 1, step: 0.01, default: 0.5 }),
  radius: number({ label: 'Radius', min: 0.05, max: 1, step: 0.01, default: 0.3 }),
  cutout: boolean({ label: 'Cutout', default: true }),
})

export type CircleMaskShapeParams = Infer<typeof CircleMaskShapeSchema>

/**
 * Rect Mask Shape Schema
 */
export const RectMaskShapeSchema = defineSchema({
  left: number({ label: 'Left', min: 0, max: 1, step: 0.01, default: 0.25 }),
  right: number({ label: 'Right', min: 0, max: 1, step: 0.01, default: 0.75 }),
  top: number({ label: 'Top', min: 0, max: 1, step: 0.01, default: 0.15 }),
  bottom: number({ label: 'Bottom', min: 0, max: 1, step: 0.01, default: 0.85 }),
  radiusTopLeft: number({ label: 'TL Radius', min: 0, max: 0.5, step: 0.01, default: 0 }),
  radiusTopRight: number({ label: 'TR Radius', min: 0, max: 0.5, step: 0.01, default: 0 }),
  radiusBottomLeft: number({ label: 'BL Radius', min: 0, max: 0.5, step: 0.01, default: 0 }),
  radiusBottomRight: number({ label: 'BR Radius', min: 0, max: 0.5, step: 0.01, default: 0 }),
  cutout: boolean({ label: 'Cutout', default: true }),
})

export type RectMaskShapeParams = Infer<typeof RectMaskShapeSchema>

/**
 * Blob Mask Shape Schema
 */
export const BlobMaskShapeSchema = defineSchema({
  centerX: number({ label: 'Center X', min: 0, max: 1, step: 0.01, default: 0.5 }),
  centerY: number({ label: 'Center Y', min: 0, max: 1, step: 0.01, default: 0.5 }),
  baseRadius: number({ label: 'Base Radius', min: 0.1, max: 0.8, step: 0.01, default: 0.4 }),
  amplitude: number({ label: 'Amplitude', min: 0, max: 0.3, step: 0.01, default: 0.08 }),
  octaves: number({ label: 'Octaves', min: 1, max: 6, step: 1, default: 2 }),
  seed: number({ label: 'Seed', min: 0, max: 100, step: 1, default: 1 }),
  cutout: boolean({ label: 'Cutout', default: true }),
})

export type BlobMaskShapeParams = Infer<typeof BlobMaskShapeSchema>

/**
 * Perlin Noise Mask Shape Schema
 * Thresholded perlin noise for binary mask
 */
export const PerlinMaskShapeSchema = defineSchema({
  seed: number({ label: 'Seed', min: 0, max: 99999, step: 1, default: 12345 }),
  threshold: number({ label: 'Threshold', min: 0, max: 1, step: 0.01, default: 0.5 }),
  scale: number({ label: 'Scale', min: 0.5, max: 20, step: 0.5, default: 4 }),
  octaves: number({ label: 'Octaves', min: 1, max: 8, step: 1, default: 4 }),
  cutout: boolean({ label: 'Cutout', default: true }),
})

export type PerlinMaskShapeParams = Infer<typeof PerlinMaskShapeSchema>

// ============================================================
// Surface Schemas (Texture Patterns)
// ============================================================

/**
 * Stripe Surface Schema
 */
export const StripeSurfaceSchema = defineSchema({
  width1: number({ label: 'Width 1', min: 1, max: 100, step: 1, default: 20 }),
  width2: number({ label: 'Width 2', min: 1, max: 100, step: 1, default: 20 }),
  angle: number({ label: 'Angle', min: 0, max: 360, step: 1, default: 45 }),
})

export type StripeSurfaceParams = Infer<typeof StripeSurfaceSchema>

/**
 * Grid Surface Schema
 */
export const GridSurfaceSchema = defineSchema({
  lineWidth: number({ label: 'Line Width', min: 1, max: 20, step: 1, default: 2 }),
  cellSize: number({ label: 'Cell Size', min: 10, max: 200, step: 1, default: 40 }),
})

export type GridSurfaceParams = Infer<typeof GridSurfaceSchema>

/**
 * PolkaDot Surface Schema
 */
export const PolkaDotSurfaceSchema = defineSchema({
  dotRadius: number({ label: 'Dot Radius', min: 2, max: 50, step: 1, default: 10 }),
  spacing: number({ label: 'Spacing', min: 10, max: 100, step: 1, default: 40 }),
  rowOffset: number({ label: 'Row Offset', min: 0, max: 1, step: 0.1, default: 0.5 }),
})

export type PolkaDotSurfaceParams = Infer<typeof PolkaDotSurfaceSchema>

/**
 * Checker Surface Schema
 */
export const CheckerSurfaceSchema = defineSchema({
  cellSize: number({ label: 'Cell Size', min: 10, max: 100, step: 1, default: 30 }),
  angle: number({ label: 'Angle', min: 0, max: 360, step: 1, default: 0 }),
})

export type CheckerSurfaceParams = Infer<typeof CheckerSurfaceSchema>

/**
 * Depth Map Type options for select field
 */
const depthMapTypeOptions = [
  { value: 'linear' as const, label: 'Linear' },
  { value: 'circular' as const, label: 'Circular' },
  { value: 'radial' as const, label: 'Radial' },
  { value: 'perlin' as const, label: 'Perlin Noise' },
] as const

/**
 * Gradient Grain Surface Schema
 */
export const GradientGrainSurfaceSchema = defineSchema({
  depthMapType: select({ label: 'Depth Type', options: depthMapTypeOptions, default: 'linear' }),
  angle: number({ label: 'Angle', min: 0, max: 360, step: 1, default: 90 }),
  centerX: number({ label: 'Center X', min: 0, max: 1, step: 0.01, default: 0.5 }),
  centerY: number({ label: 'Center Y', min: 0, max: 1, step: 0.01, default: 0.5 }),
  radialStartAngle: number({ label: 'Start Angle', min: 0, max: 360, step: 1, default: 0 }),
  radialSweepAngle: number({ label: 'Sweep Angle', min: 1, max: 360, step: 1, default: 360 }),
  perlinScale: number({ label: 'Perlin Scale', min: 1, max: 20, step: 0.5, default: 4 }),
  perlinOctaves: number({ label: 'Octaves', min: 1, max: 8, step: 1, default: 4 }),
  perlinContrast: number({ label: 'Contrast', min: 0.1, max: 3, step: 0.05, default: 1 }),
  perlinOffset: number({ label: 'Offset', min: -0.5, max: 0.5, step: 0.01, default: 0 }),
  seed: number({ label: 'Seed', min: 0, max: 99999, step: 1, default: 12345 }),
  sparsity: number({ label: 'Sparsity', min: 0, max: 0.99, step: 0.01, default: 0.75 }),
})

export type GradientGrainSurfaceParams = Infer<typeof GradientGrainSurfaceSchema>

// ============================================================
// Factory Functions
// ============================================================

export const createDefaultCircleMaskParams = (): CircleMaskShapeParams =>
  getDefaults(CircleMaskShapeSchema)

export const createDefaultRectMaskParams = (): RectMaskShapeParams =>
  getDefaults(RectMaskShapeSchema)

export const createDefaultBlobMaskParams = (): BlobMaskShapeParams =>
  getDefaults(BlobMaskShapeSchema)

export const createDefaultPerlinMaskParams = (): PerlinMaskShapeParams =>
  getDefaults(PerlinMaskShapeSchema)

export const createDefaultStripeParams = (): StripeSurfaceParams =>
  getDefaults(StripeSurfaceSchema)

export const createDefaultGridParams = (): GridSurfaceParams =>
  getDefaults(GridSurfaceSchema)

export const createDefaultPolkaDotParams = (): PolkaDotSurfaceParams =>
  getDefaults(PolkaDotSurfaceSchema)

export const createDefaultCheckerParams = (): CheckerSurfaceParams =>
  getDefaults(CheckerSurfaceSchema)

export const createDefaultGradientGrainParams = (): GradientGrainSurfaceParams =>
  getDefaults(GradientGrainSurfaceSchema)

// ============================================================
// Schema Maps (for dynamic access by type)
// ============================================================

export const MaskShapeSchemas = {
  circle: CircleMaskShapeSchema,
  rect: RectMaskShapeSchema,
  blob: BlobMaskShapeSchema,
  perlin: PerlinMaskShapeSchema,
} as const

export const SurfaceSchemas = {
  stripe: StripeSurfaceSchema,
  grid: GridSurfaceSchema,
  polkaDot: PolkaDotSurfaceSchema,
  checker: CheckerSurfaceSchema,
  gradientGrain: GradientGrainSurfaceSchema,
} as const
