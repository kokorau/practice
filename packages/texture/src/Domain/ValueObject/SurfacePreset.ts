/**
 * Surface Preset Type
 * Defines the available surface pattern types
 */
export type SurfacePresetType = 'solid' | 'stripe' | 'grid' | 'polkaDot' | 'checker' | 'gradientGrain'

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
 * Union of all surface preset params
 */
export type SurfacePresetParams =
  | SolidPresetParams
  | StripePresetParams
  | GridPresetParams
  | PolkaDotPresetParams
  | CheckerPresetParams
  | GradientGrainPresetParams

/**
 * Surface Preset
 * A reusable surface pattern definition with label and parameters
 */
export interface SurfacePreset {
  label: string
  params: SurfacePresetParams
}
