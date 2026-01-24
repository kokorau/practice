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
  rotation: number({ label: 'Rotation', min: 0, max: 360, step: 1, default: 0 }),
  perspectiveX: number({ label: 'Perspective X', min: -0.5, max: 0.5, step: 0.01, default: 0 }),
  perspectiveY: number({ label: 'Perspective Y', min: -0.5, max: 0.5, step: 0.01, default: 0 }),
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

/**
 * Simplex Noise Mask Shape Schema
 * Thresholded simplex noise for binary mask (smoother than Perlin)
 */
export const SimplexMaskShapeSchema = defineSchema({
  seed: number({ label: 'Seed', min: 0, max: 99999, step: 1, default: 12345 }),
  threshold: number({ label: 'Threshold', min: 0, max: 1, step: 0.01, default: 0.5 }),
  scale: number({ label: 'Scale', min: 0.5, max: 20, step: 0.5, default: 4 }),
  octaves: number({ label: 'Octaves', min: 1, max: 8, step: 1, default: 4 }),
  cutout: boolean({ label: 'Cutout', default: true }),
})

export type SimplexMaskShapeParams = Infer<typeof SimplexMaskShapeSchema>

/**
 * Curl Noise Mask Shape Schema
 * Uses curl of perlin noise for flow-like mask patterns
 */
export const CurlMaskShapeSchema = defineSchema({
  seed: number({ label: 'Seed', min: 0, max: 99999, step: 1, default: 12345 }),
  threshold: number({ label: 'Threshold', min: 0, max: 1, step: 0.01, default: 0.3 }),
  scale: number({ label: 'Scale', min: 0.5, max: 20, step: 0.5, default: 4 }),
  octaves: number({ label: 'Octaves', min: 1, max: 8, step: 1, default: 4 }),
  intensity: number({ label: 'Intensity', min: 0.1, max: 3, step: 0.1, default: 1 }),
  cutout: boolean({ label: 'Cutout', default: true }),
})

export type CurlMaskShapeParams = Infer<typeof CurlMaskShapeSchema>

/**
 * Linear Gradient Mask Shape Schema
 * Smooth gradient fade along a direction
 */
export const LinearGradientMaskShapeSchema = defineSchema({
  angle: number({ label: 'Angle', min: 0, max: 360, step: 1, default: 0 }),
  startOffset: number({ label: 'Start', min: 0, max: 1, step: 0.01, default: 0.3 }),
  endOffset: number({ label: 'End', min: 0, max: 1, step: 0.01, default: 0.7 }),
  cutout: boolean({ label: 'Cutout', default: false }),
})

export type LinearGradientMaskShapeParams = Infer<typeof LinearGradientMaskShapeSchema>

/**
 * Radial Gradient Mask Shape Schema
 * Circular/elliptical gradient from center outward (vignette effect)
 */
export const RadialGradientMaskShapeSchema = defineSchema({
  centerX: number({ label: 'Center X', min: 0, max: 1, step: 0.01, default: 0.5 }),
  centerY: number({ label: 'Center Y', min: 0, max: 1, step: 0.01, default: 0.5 }),
  innerRadius: number({ label: 'Inner Radius', min: 0, max: 1, step: 0.01, default: 0.2 }),
  outerRadius: number({ label: 'Outer Radius', min: 0, max: 1.5, step: 0.01, default: 0.6 }),
  aspectRatio: number({ label: 'Aspect Ratio', min: 0.25, max: 4, step: 0.05, default: 1 }),
  cutout: boolean({ label: 'Cutout', default: false }),
})

export type RadialGradientMaskShapeParams = Infer<typeof RadialGradientMaskShapeSchema>

/**
 * Box Gradient curve type options for select field
 */
const boxGradientCurveOptions = [
  { value: 'linear' as const, label: 'Linear' },
  { value: 'smooth' as const, label: 'Smooth' },
  { value: 'easeIn' as const, label: 'Ease In' },
  { value: 'easeOut' as const, label: 'Ease Out' },
] as const

/**
 * Box Gradient Mask Shape Schema
 * Rectangular vignette effect with fade from edges toward center
 */
export const BoxGradientMaskShapeSchema = defineSchema({
  left: number({ label: 'Left', min: 0, max: 0.5, step: 0.01, default: 0.15 }),
  right: number({ label: 'Right', min: 0, max: 0.5, step: 0.01, default: 0.15 }),
  top: number({ label: 'Top', min: 0, max: 0.5, step: 0.01, default: 0.15 }),
  bottom: number({ label: 'Bottom', min: 0, max: 0.5, step: 0.01, default: 0.15 }),
  cornerRadius: number({ label: 'Corner Radius', min: 0, max: 1, step: 0.01, default: 0 }),
  curve: select({ label: 'Curve', options: boxGradientCurveOptions, default: 'smooth' }),
  cutout: boolean({ label: 'Cutout', default: false }),
})

export interface BoxGradientMaskShapeParams {
  left: number
  right: number
  top: number
  bottom: number
  cornerRadius: number
  curve: 'linear' | 'smooth' | 'easeIn' | 'easeOut'
  cutout: boolean
}

/**
 * Wavy Line direction options for select field
 */
const wavyLineDirectionOptions = [
  { value: 'vertical' as const, label: 'Vertical' },
  { value: 'horizontal' as const, label: 'Horizontal' },
] as const

/**
 * Wavy Line Mask Shape Schema
 * Organic dividing line using 1D Perlin noise
 */
export const WavyLineMaskShapeSchema = defineSchema({
  position: number({ label: 'Position', min: 0, max: 1, step: 0.01, default: 0.5 }),
  direction: select({ label: 'Direction', options: wavyLineDirectionOptions, default: 'vertical' }),
  amplitude: number({ label: 'Amplitude', min: 0, max: 0.3, step: 0.01, default: 0.08 }),
  frequency: number({ label: 'Frequency', min: 1, max: 20, step: 0.5, default: 3 }),
  octaves: number({ label: 'Octaves', min: 1, max: 5, step: 1, default: 2 }),
  seed: number({ label: 'Seed', min: 0, max: 1000, step: 1, default: 42 }),
  cutout: boolean({ label: 'Cutout', default: false }),
})

export interface WavyLineMaskShapeParams {
  position: number
  direction: 'vertical' | 'horizontal'
  amplitude: number
  frequency: number
  octaves: number
  seed: number
  cutout: boolean
}

// ============================================================
// Surface Schemas (Texture Patterns)
// ============================================================

/**
 * Solid Surface Schema (empty - no configurable params)
 */
export const SolidSurfaceSchema = defineSchema({})

export type SolidSurfaceParams = Infer<typeof SolidSurfaceSchema>

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
 * Default curve points for gradient grain (quadratic easing)
 * Values represent Y coordinates at equal X intervals: [0/6, 1/6, 2/6, 3/6, 4/6, 5/6, 6/6]
 * Pattern: (i/6)² where i = 0,1,2,3,4,5,6
 */
export const DEFAULT_GRADIENT_GRAIN_CURVE_POINTS: readonly number[] = [
  0,     // (0/6)² = 0
  1/36,  // (1/6)² = 1/36
  4/36,  // (2/6)² = 4/36
  9/36,  // (3/6)² = 9/36
  16/36, // (4/6)² = 16/36
  25/36, // (5/6)² = 25/36
  1,     // (6/6)² = 1
] as const

/**
 * Gradient Grain Linear Surface Schema
 */
export const GradientGrainLinearSurfaceSchema = defineSchema({
  angle: number({ label: 'Angle', min: 0, max: 360, step: 1, default: 90 }),
  centerX: number({ label: 'Center X', min: 0, max: 1, step: 0.01, default: 0.5 }),
  centerY: number({ label: 'Center Y', min: 0, max: 1, step: 0.01, default: 0.5 }),
  seed: number({ label: 'Seed', min: 0, max: 99999, step: 1, default: 12345 }),
  sparsity: number({ label: 'Sparsity', min: 0, max: 0.99, step: 0.01, default: 0.75 }),
})

export type GradientGrainLinearSurfaceParams = Infer<typeof GradientGrainLinearSurfaceSchema>

/**
 * Gradient Grain Circular Surface Schema
 */
export const GradientGrainCircularSurfaceSchema = defineSchema({
  centerX: number({ label: 'Center X', min: 0, max: 1, step: 0.01, default: 0.5 }),
  centerY: number({ label: 'Center Y', min: 0, max: 1, step: 0.01, default: 0.5 }),
  circularInvert: boolean({ label: 'Invert', default: false }),
  seed: number({ label: 'Seed', min: 0, max: 99999, step: 1, default: 12345 }),
  sparsity: number({ label: 'Sparsity', min: 0, max: 0.99, step: 0.01, default: 0.75 }),
})

export type GradientGrainCircularSurfaceParams = Infer<typeof GradientGrainCircularSurfaceSchema>

/**
 * Gradient Grain Radial Surface Schema
 */
export const GradientGrainRadialSurfaceSchema = defineSchema({
  centerX: number({ label: 'Center X', min: 0, max: 1, step: 0.01, default: 0.5 }),
  centerY: number({ label: 'Center Y', min: 0, max: 1, step: 0.01, default: 0.5 }),
  radialStartAngle: number({ label: 'Start Angle', min: 0, max: 360, step: 1, default: 0 }),
  radialSweepAngle: number({ label: 'Sweep Angle', min: 1, max: 360, step: 1, default: 360 }),
  seed: number({ label: 'Seed', min: 0, max: 99999, step: 1, default: 12345 }),
  sparsity: number({ label: 'Sparsity', min: 0, max: 0.99, step: 0.01, default: 0.75 }),
})

export type GradientGrainRadialSurfaceParams = Infer<typeof GradientGrainRadialSurfaceSchema>

/**
 * Gradient Grain Perlin Surface Schema
 */
export const GradientGrainPerlinSurfaceSchema = defineSchema({
  perlinScale: number({ label: 'Scale', min: 1, max: 20, step: 0.5, default: 4 }),
  perlinOctaves: number({ label: 'Octaves', min: 1, max: 8, step: 1, default: 4 }),
  perlinContrast: number({ label: 'Contrast', min: 0.1, max: 3, step: 0.05, default: 1 }),
  perlinOffset: number({ label: 'Offset', min: -0.5, max: 0.5, step: 0.01, default: 0 }),
  seed: number({ label: 'Seed', min: 0, max: 99999, step: 1, default: 12345 }),
  sparsity: number({ label: 'Sparsity', min: 0, max: 0.99, step: 0.01, default: 0.75 }),
})

export type GradientGrainPerlinSurfaceParams = Infer<typeof GradientGrainPerlinSurfaceSchema>

/**
 * Gradient Grain Curl Surface Schema
 */
export const GradientGrainCurlSurfaceSchema = defineSchema({
  perlinScale: number({ label: 'Scale', min: 1, max: 20, step: 0.5, default: 4 }),
  perlinOctaves: number({ label: 'Octaves', min: 1, max: 8, step: 1, default: 4 }),
  perlinContrast: number({ label: 'Contrast', min: 0.1, max: 3, step: 0.05, default: 1 }),
  perlinOffset: number({ label: 'Offset', min: -0.5, max: 0.5, step: 0.01, default: 0 }),
  curlIntensity: number({ label: 'Curl Intensity', min: 0.5, max: 3, step: 0.1, default: 1 }),
  seed: number({ label: 'Seed', min: 0, max: 99999, step: 1, default: 12345 }),
  sparsity: number({ label: 'Sparsity', min: 0, max: 0.99, step: 0.01, default: 0.75 }),
})

export type GradientGrainCurlSurfaceParams = Infer<typeof GradientGrainCurlSurfaceSchema>

/**
 * Gradient Grain Simplex Surface Schema
 */
export const GradientGrainSimplexSurfaceSchema = defineSchema({
  simplexScale: number({ label: 'Scale', min: 1, max: 20, step: 0.5, default: 4 }),
  simplexOctaves: number({ label: 'Octaves', min: 1, max: 8, step: 1, default: 4 }),
  simplexContrast: number({ label: 'Contrast', min: 0.1, max: 3, step: 0.05, default: 1 }),
  simplexOffset: number({ label: 'Offset', min: -0.5, max: 0.5, step: 0.01, default: 0 }),
  seed: number({ label: 'Seed', min: 0, max: 99999, step: 1, default: 12345 }),
  sparsity: number({ label: 'Sparsity', min: 0, max: 0.99, step: 0.01, default: 0.75 }),
})

export type GradientGrainSimplexSurfaceParams = Infer<typeof GradientGrainSimplexSurfaceSchema>

/**
 * Triangle Surface Schema
 */
export const TriangleSurfaceSchema = defineSchema({
  size: number({ label: 'Size', min: 10, max: 100, step: 1, default: 30 }),
  angle: number({ label: 'Angle', min: 0, max: 360, step: 1, default: 0 }),
})

export type TriangleSurfaceParams = Infer<typeof TriangleSurfaceSchema>

/**
 * Hexagon Surface Schema
 */
export const HexagonSurfaceSchema = defineSchema({
  size: number({ label: 'Size', min: 10, max: 100, step: 1, default: 20 }),
  angle: number({ label: 'Angle', min: 0, max: 360, step: 1, default: 0 }),
})

export type HexagonSurfaceParams = Infer<typeof HexagonSurfaceSchema>

/**
 * Asanoha Surface Schema
 */
export const AsanohaSurfaceSchema = defineSchema({
  size: number({ label: 'Size', min: 10, max: 100, step: 1, default: 40 }),
  lineWidth: number({ label: 'Line Width', min: 0.5, max: 5, step: 0.5, default: 1 }),
})

export type AsanohaSurfaceParams = Infer<typeof AsanohaSurfaceSchema>

/**
 * Seigaiha Surface Schema
 */
export const SeigaihaSurfaceSchema = defineSchema({
  radius: number({ label: 'Radius', min: 10, max: 80, step: 1, default: 30 }),
  rings: number({ label: 'Rings', min: 2, max: 5, step: 1, default: 3 }),
  lineWidth: number({ label: 'Line Width', min: 0.5, max: 5, step: 0.5, default: 1 }),
})

export type SeigaihaSurfaceParams = Infer<typeof SeigaihaSurfaceSchema>

/**
 * Wave Surface Schema
 */
export const WaveSurfaceSchema = defineSchema({
  amplitude: number({ label: 'Amplitude', min: 1, max: 50, step: 1, default: 10 }),
  wavelength: number({ label: 'Wavelength', min: 10, max: 100, step: 1, default: 40 }),
  thickness: number({ label: 'Thickness', min: 1, max: 30, step: 1, default: 8 }),
  angle: number({ label: 'Angle', min: 0, max: 360, step: 1, default: 0 }),
})

export type WaveSurfaceParams = Infer<typeof WaveSurfaceSchema>

/**
 * Scales Surface Schema
 */
export const ScalesSurfaceSchema = defineSchema({
  size: number({ label: 'Size', min: 10, max: 60, step: 1, default: 24 }),
  overlap: number({ label: 'Overlap', min: 0, max: 1, step: 0.1, default: 0.5 }),
  angle: number({ label: 'Angle', min: 0, max: 360, step: 1, default: 0 }),
})

export type ScalesSurfaceParams = Infer<typeof ScalesSurfaceSchema>

/**
 * Ogee Surface Schema
 */
export const OgeeSurfaceSchema = defineSchema({
  width: number({ label: 'Width', min: 20, max: 100, step: 1, default: 40 }),
  height: number({ label: 'Height', min: 30, max: 120, step: 1, default: 60 }),
  lineWidth: number({ label: 'Line Width', min: 0.5, max: 5, step: 0.5, default: 2 }),
})

export type OgeeSurfaceParams = Infer<typeof OgeeSurfaceSchema>

/**
 * Sunburst Surface Schema
 */
export const SunburstSurfaceSchema = defineSchema({
  rays: number({ label: 'Rays', min: 4, max: 32, step: 1, default: 12 }),
  centerX: number({ label: 'Center X', min: 0, max: 1, step: 0.01, default: 0.5 }),
  centerY: number({ label: 'Center Y', min: 0, max: 1, step: 0.01, default: 0.5 }),
  twist: number({ label: 'Twist', min: 0, max: 2, step: 0.1, default: 0 }),
})

export type SunburstSurfaceParams = Infer<typeof SunburstSurfaceSchema>

/**
 * Paper Texture Surface Schema
 * Subtle paper-like texture with fiber strands and grain particles
 */
export const PaperTextureSurfaceSchema = defineSchema({
  fiberScale: number({ label: 'Fiber Scale', min: 5, max: 50, step: 1, default: 20 }),
  fiberStrength: number({ label: 'Fiber Strength', min: 0, max: 1, step: 0.05, default: 0.5 }),
  fiberWarp: number({ label: 'Fiber Warp', min: 0, max: 0.5, step: 0.02, default: 0.1 }),
  grainDensity: number({ label: 'Grain Density', min: 0, max: 1, step: 0.05, default: 0.3 }),
  grainSize: number({ label: 'Grain Size', min: 0.5, max: 3, step: 0.1, default: 1.5 }),
  bumpStrength: number({ label: 'Bump Strength', min: 0, max: 0.1, step: 0.005, default: 0.03 }),
  lightAngle: number({ label: 'Light Angle', min: 0, max: 360, step: 5, default: 135 }),
  seed: number({ label: 'Seed', min: 0, max: 99999, step: 1, default: 12345 }),
})

export type PaperTextureSurfaceParams = Infer<typeof PaperTextureSurfaceSchema>

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

export const createDefaultSimplexMaskParams = (): SimplexMaskShapeParams =>
  getDefaults(SimplexMaskShapeSchema)

export const createDefaultCurlMaskParams = (): CurlMaskShapeParams =>
  getDefaults(CurlMaskShapeSchema)

export const createDefaultLinearGradientMaskParams = (): LinearGradientMaskShapeParams =>
  getDefaults(LinearGradientMaskShapeSchema)

export const createDefaultRadialGradientMaskParams = (): RadialGradientMaskShapeParams =>
  getDefaults(RadialGradientMaskShapeSchema)

export const createDefaultBoxGradientMaskParams = (): BoxGradientMaskShapeParams =>
  getDefaults(BoxGradientMaskShapeSchema) as BoxGradientMaskShapeParams

export const createDefaultWavyLineMaskParams = (): WavyLineMaskShapeParams =>
  getDefaults(WavyLineMaskShapeSchema) as WavyLineMaskShapeParams

export const createDefaultSolidParams = (): SolidSurfaceParams =>
  getDefaults(SolidSurfaceSchema)

export const createDefaultStripeParams = (): StripeSurfaceParams =>
  getDefaults(StripeSurfaceSchema)

export const createDefaultGridParams = (): GridSurfaceParams =>
  getDefaults(GridSurfaceSchema)

export const createDefaultPolkaDotParams = (): PolkaDotSurfaceParams =>
  getDefaults(PolkaDotSurfaceSchema)

export const createDefaultCheckerParams = (): CheckerSurfaceParams =>
  getDefaults(CheckerSurfaceSchema)

export const createDefaultGradientGrainLinearParams = (): GradientGrainLinearSurfaceParams =>
  getDefaults(GradientGrainLinearSurfaceSchema)

export const createDefaultGradientGrainCircularParams = (): GradientGrainCircularSurfaceParams =>
  getDefaults(GradientGrainCircularSurfaceSchema)

export const createDefaultGradientGrainRadialParams = (): GradientGrainRadialSurfaceParams =>
  getDefaults(GradientGrainRadialSurfaceSchema)

export const createDefaultGradientGrainPerlinParams = (): GradientGrainPerlinSurfaceParams =>
  getDefaults(GradientGrainPerlinSurfaceSchema)

export const createDefaultGradientGrainCurlParams = (): GradientGrainCurlSurfaceParams =>
  getDefaults(GradientGrainCurlSurfaceSchema)

export const createDefaultGradientGrainSimplexParams = (): GradientGrainSimplexSurfaceParams =>
  getDefaults(GradientGrainSimplexSurfaceSchema)

export const createDefaultTriangleParams = (): TriangleSurfaceParams =>
  getDefaults(TriangleSurfaceSchema)

export const createDefaultHexagonParams = (): HexagonSurfaceParams =>
  getDefaults(HexagonSurfaceSchema)

export const createDefaultAsanohaParams = (): AsanohaSurfaceParams =>
  getDefaults(AsanohaSurfaceSchema)

export const createDefaultSeigaihaParams = (): SeigaihaSurfaceParams =>
  getDefaults(SeigaihaSurfaceSchema)

export const createDefaultWaveParams = (): WaveSurfaceParams =>
  getDefaults(WaveSurfaceSchema)

export const createDefaultScalesParams = (): ScalesSurfaceParams =>
  getDefaults(ScalesSurfaceSchema)

export const createDefaultOgeeParams = (): OgeeSurfaceParams =>
  getDefaults(OgeeSurfaceSchema)

export const createDefaultSunburstParams = (): SunburstSurfaceParams =>
  getDefaults(SunburstSurfaceSchema)

export const createDefaultPaperTextureParams = (): PaperTextureSurfaceParams =>
  getDefaults(PaperTextureSurfaceSchema)

// ============================================================
// Schema Maps (for dynamic access by type)
// ============================================================

export const MaskShapeSchemas = {
  circle: CircleMaskShapeSchema,
  rect: RectMaskShapeSchema,
  blob: BlobMaskShapeSchema,
  perlin: PerlinMaskShapeSchema,
  simplex: SimplexMaskShapeSchema,
  curl: CurlMaskShapeSchema,
  linearGradient: LinearGradientMaskShapeSchema,
  radialGradient: RadialGradientMaskShapeSchema,
  boxGradient: BoxGradientMaskShapeSchema,
  wavyLine: WavyLineMaskShapeSchema,
} as const

export const SurfaceSchemas = {
  solid: SolidSurfaceSchema,
  stripe: StripeSurfaceSchema,
  grid: GridSurfaceSchema,
  polkaDot: PolkaDotSurfaceSchema,
  checker: CheckerSurfaceSchema,
  gradientGrainLinear: GradientGrainLinearSurfaceSchema,
  gradientGrainCircular: GradientGrainCircularSurfaceSchema,
  gradientGrainRadial: GradientGrainRadialSurfaceSchema,
  gradientGrainPerlin: GradientGrainPerlinSurfaceSchema,
  gradientGrainCurl: GradientGrainCurlSurfaceSchema,
  gradientGrainSimplex: GradientGrainSimplexSurfaceSchema,
  triangle: TriangleSurfaceSchema,
  hexagon: HexagonSurfaceSchema,
  asanoha: AsanohaSurfaceSchema,
  seigaiha: SeigaihaSurfaceSchema,
  wave: WaveSurfaceSchema,
  scales: ScalesSurfaceSchema,
  ogee: OgeeSurfaceSchema,
  sunburst: SunburstSurfaceSchema,
  paperTexture: PaperTextureSurfaceSchema,
} as const
