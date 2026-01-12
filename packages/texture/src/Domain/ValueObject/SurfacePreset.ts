/**
 * Surface Preset Type
 * Defines the available surface pattern types
 */
export type SurfacePresetType =
  | 'solid'
  | 'stripe'
  | 'grid'
  | 'polkaDot'
  | 'checker'
  | 'gradientGrain'
  | 'triangle'
  | 'hexagon'
  | 'asanoha'
  | 'seigaiha'
  | 'wave'
  | 'scales'
  | 'ogee'
  | 'sunburst'

/**
 * Depth Map Type for Gradient Grain
 */
export type DepthMapType = 'linear' | 'circular' | 'radial' | 'perlin'

/**
 * Solid surface params (no additional params needed)
 */
export interface SolidPresetParams {
  type: 'solid'
}

/**
 * Stripe surface params
 */
export interface StripePresetParams {
  type: 'stripe'
  width1: number
  width2: number
  angle: number
}

/**
 * Grid surface params
 */
export interface GridPresetParams {
  type: 'grid'
  lineWidth: number
  cellSize: number
}

/**
 * Polka dot surface params
 */
export interface PolkaDotPresetParams {
  type: 'polkaDot'
  dotRadius: number
  spacing: number
  rowOffset: number
}

/**
 * Checker surface params
 */
export interface CheckerPresetParams {
  type: 'checker'
  cellSize: number
  angle: number
}

/**
 * Gradient Grain surface params
 */
export interface GradientGrainPresetParams {
  type: 'gradientGrain'
  depthMapType: DepthMapType
  angle: number
  centerX: number
  centerY: number
  radialStartAngle: number
  radialSweepAngle: number
  perlinScale: number
  perlinOctaves: number
  perlinContrast: number
  perlinOffset: number
  seed: number
  sparsity: number
}

/**
 * Triangle tessellation surface params
 */
export interface TrianglePresetParams {
  type: 'triangle'
  /** Triangle edge length (px) */
  size: number
  /** Rotation angle (radians) */
  angle: number
}

/**
 * Asanoha (麻の葉) surface params
 */
export interface AsanohaPresetParams {
  type: 'asanoha'
  size: number
  lineWidth: number
}

/**
 * Seigaiha (青海波) surface params
 */
export interface SeigaihaPresetParams {
  type: 'seigaiha'
  radius: number
  rings: number
  lineWidth: number
}

/**
 * Wave surface params
 */
export interface WavePresetParams {
  type: 'wave'
  amplitude: number
  wavelength: number
  thickness: number
  angle: number
}

/**
 * Hexagon tessellation surface params
 */
export interface HexagonPresetParams {
  type: 'hexagon'
  /** Hexagon radius (px) - center to vertex */
  size: number
  /** Rotation angle (radians) */
  angle: number
}

/**
 * Scales surface params
 */
export interface ScalesPresetParams {
  type: 'scales'
  size: number
  overlap: number
  angle: number
}

/**
 * Ogee surface params
 */
export interface OgeePresetParams {
  type: 'ogee'
  width: number
  height: number
  lineWidth: number
}

/**
 * Sunburst (放射) surface params
 */
export interface SunburstPresetParams {
  type: 'sunburst'
  rays: number
  centerX: number
  centerY: number
  twist: number
}

/**
 * Union of all surface preset params
 */
export type SurfacePresetParams =
  | SolidPresetParams
  | StripePresetParams
  | GridPresetParams
  | PolkaDotPresetParams
  | CheckerPresetParams
  | GradientGrainPresetParams
  | TrianglePresetParams
  | HexagonPresetParams
  | AsanohaPresetParams
  | SeigaihaPresetParams
  | WavePresetParams
  | ScalesPresetParams
  | OgeePresetParams
  | SunburstPresetParams

/**
 * Surface Preset
 * A reusable surface pattern definition with label and parameters
 */
export interface SurfacePreset {
  label: string
  params: SurfacePresetParams
}
