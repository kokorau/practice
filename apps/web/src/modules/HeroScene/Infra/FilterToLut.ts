/**
 * FilterToLut
 *
 * Bridge module to convert filter parameters to 1D LUT for GPU rendering.
 * Wraps the Filter module's $Adjustment and $Lut1D for use in HeroScene.
 */

import { $Adjustment, $Lut1D, type Lut1D } from '../../Filter/Domain'

/**
 * LUT parameters for GPU shader.
 * Each channel is a Float32Array with 256 entries (0.0-1.0).
 */
export interface Lut1DParams {
  lutR: Float32Array
  lutG: Float32Array
  lutB: Float32Array
}

/**
 * Basic filter parameters for color adjustment.
 * All values use normalized ranges.
 */
export interface BasicFilterParams {
  /** Exposure: -2 (dark) to +2 (bright) in EV */
  exposure: number
  /** Brightness: -1 (dark) to +1 (bright) */
  brightness: number
  /** Contrast: -1 (low) to +1 (high) */
  contrast: number
  /** Highlights: -1 (dark) to +1 (bright) */
  highlights: number
  /** Shadows: -1 (dark) to +1 (bright) */
  shadows: number
  /** Temperature: -1 (cool/blue) to +1 (warm/yellow) */
  temperature: number
  /** Tint: -1 (green) to +1 (magenta) */
  tint: number
}

/**
 * Create a 1D LUT from basic filter parameters.
 *
 * Uses the Filter module's Adjustment pipeline to generate
 * per-channel LUTs that can be applied via GPU shader.
 *
 * @param params - Filter parameters
 * @returns Lut1D with R, G, B channels (256 entries each, 0.0-1.0)
 */
export function createLutFromFilterParams(params: BasicFilterParams): Lut1D {
  // Create an Adjustment with only the basic parameters we support
  const adjustment = {
    ...$Adjustment.identity(),
    exposure: params.exposure,
    brightness: params.brightness,
    contrast: params.contrast,
    highlights: params.highlights,
    shadows: params.shadows,
    temperature: params.temperature,
    tint: params.tint,
  }

  // Convert adjustment to RGB LUTs
  const rgb = $Adjustment.toLutFloatRGB(adjustment)

  return $Lut1D.create(rgb.r, rgb.g, rgb.b)
}

/**
 * Convert Filter module's Lut1D to texture package's Lut1DParams.
 * This bridges the two different LUT representations.
 */
export function lut1DToLutParams(lut: Lut1D): Lut1DParams {
  return {
    lutR: lut.r,
    lutG: lut.g,
    lutB: lut.b,
  }
}

/**
 * Create a LutProvider function for use with FilterRenderNode.
 *
 * This is the main entry point for integrating filter processing
 * into the compositor pipeline.
 *
 * @param params - Filter parameters (same as FilterParams from FilterRenderNode)
 * @returns Lut1DParams ready for GPU shader
 */
export function createLutProvider(params: BasicFilterParams): Lut1DParams {
  const lut = createLutFromFilterParams(params)
  return lut1DToLutParams(lut)
}

/**
 * Check if filter params would produce any visible effect.
 *
 * Returns false if all parameters are at their neutral (zero) values.
 */
export function isFilterIdentity(params: BasicFilterParams): boolean {
  const threshold = 0.001
  return (
    Math.abs(params.exposure) < threshold &&
    Math.abs(params.brightness) < threshold &&
    Math.abs(params.contrast) < threshold &&
    Math.abs(params.highlights) < threshold &&
    Math.abs(params.shadows) < threshold &&
    Math.abs(params.temperature) < threshold &&
    Math.abs(params.tint) < threshold
  )
}

// Re-export Lut1D type for convenience
export type { Lut1D }
