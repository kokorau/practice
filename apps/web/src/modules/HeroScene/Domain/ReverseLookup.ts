/**
 * Reverse lookup utilities for HeroViewConfig
 *
 * These functions help find the corresponding preset index from config parameters
 */

import type { MaskShapeConfig } from './HeroViewConfig'
import type { BackgroundSurfaceConfig, MaskSurfaceConfig } from './HeroViewConfig'

/**
 * Compare two numbers with tolerance (for floating point comparison)
 */
export const approxEqual = (a: number, b: number, epsilon = 0.0001): boolean =>
  Math.abs(a - b) < epsilon

/**
 * Surface preset params type (for matching)
 */
export interface SurfacePresetParams {
  type: 'solid' | 'stripe' | 'grid' | 'polkaDot' | 'checker' | 'gradientGrain'
  width1?: number
  width2?: number
  angle?: number
  lineWidth?: number
  cellSize?: number
  dotRadius?: number
  spacing?: number
  rowOffset?: number
  // GradientGrain params
  depthMapType?: string
  centerX?: number
  centerY?: number
  radialStartAngle?: number
  radialSweepAngle?: number
  perlinScale?: number
  perlinOctaves?: number
  perlinContrast?: number
  perlinOffset?: number
  seed?: number
  sparsity?: number
}

/**
 * Mask pattern config type (for matching)
 */
export interface MaskPatternConfig {
  type: 'circle' | 'rect' | 'blob' | 'perlin'
  centerX?: number
  centerY?: number
  radius?: number
  left?: number
  right?: number
  top?: number
  bottom?: number
  radiusTopLeft?: number
  radiusTopRight?: number
  radiusBottomLeft?: number
  radiusBottomRight?: number
  baseRadius?: number
  amplitude?: number
  octaves?: number
  seed?: number
  threshold?: number
  scale?: number
  cutout?: boolean
}

/**
 * Find surface preset index by matching params
 * Returns null if no exact match found (custom params)
 */
export const findSurfacePresetIndex = (
  surfaceConfig: BackgroundSurfaceConfig | MaskSurfaceConfig,
  presets: { params: SurfacePresetParams }[]
): number | null => {
  if (surfaceConfig.type === 'image') return null

  for (let i = 0; i < presets.length; i++) {
    const preset = presets[i]
    if (!preset || preset.params.type !== surfaceConfig.type) continue

    if (surfaceConfig.type === 'solid' && preset.params.type === 'solid') {
      return i
    }
    if (surfaceConfig.type === 'stripe' && preset.params.type === 'stripe') {
      if (
        approxEqual(surfaceConfig.width1, preset.params.width1 ?? 0) &&
        approxEqual(surfaceConfig.width2, preset.params.width2 ?? 0) &&
        approxEqual(surfaceConfig.angle, preset.params.angle ?? 0)
      ) {
        return i
      }
    }
    if (surfaceConfig.type === 'grid' && preset.params.type === 'grid') {
      if (
        approxEqual(surfaceConfig.lineWidth, preset.params.lineWidth ?? 0) &&
        approxEqual(surfaceConfig.cellSize, preset.params.cellSize ?? 0)
      ) {
        return i
      }
    }
    if (surfaceConfig.type === 'polkaDot' && preset.params.type === 'polkaDot') {
      if (
        approxEqual(surfaceConfig.dotRadius, preset.params.dotRadius ?? 0) &&
        approxEqual(surfaceConfig.spacing, preset.params.spacing ?? 0) &&
        approxEqual(surfaceConfig.rowOffset, preset.params.rowOffset ?? 0)
      ) {
        return i
      }
    }
    if (surfaceConfig.type === 'checker' && preset.params.type === 'checker') {
      if (
        approxEqual(surfaceConfig.cellSize, preset.params.cellSize ?? 0) &&
        approxEqual(surfaceConfig.angle, preset.params.angle ?? 0)
      ) {
        return i
      }
    }
    if (surfaceConfig.type === 'gradientGrain' && preset.params.type === 'gradientGrain') {
      if (
        surfaceConfig.depthMapType === preset.params.depthMapType &&
        approxEqual(surfaceConfig.angle, preset.params.angle ?? 0) &&
        approxEqual(surfaceConfig.centerX, preset.params.centerX ?? 0.5) &&
        approxEqual(surfaceConfig.centerY, preset.params.centerY ?? 0.5) &&
        approxEqual(surfaceConfig.seed, preset.params.seed ?? 0) &&
        approxEqual(surfaceConfig.sparsity, preset.params.sparsity ?? 0.75)
      ) {
        return i
      }
    }
  }
  return null
}

/**
 * Find mask pattern index by matching shape params
 * Returns null if no exact match found (custom params)
 */
export const findMaskPatternIndex = (
  shapeConfig: MaskShapeConfig,
  patterns: { maskConfig: MaskPatternConfig }[]
): number | null => {
  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i]
    const maskConfig = pattern?.maskConfig
    if (!maskConfig || maskConfig.type !== shapeConfig.type) continue

    // Check cutout first (default to true if undefined)
    const shapeCutout = shapeConfig.cutout ?? true
    const maskCutout = maskConfig.cutout ?? true
    if (shapeCutout !== maskCutout) continue

    if (shapeConfig.type === 'circle' && maskConfig.type === 'circle') {
      if (
        approxEqual(shapeConfig.centerX, maskConfig.centerX ?? 0) &&
        approxEqual(shapeConfig.centerY, maskConfig.centerY ?? 0) &&
        approxEqual(shapeConfig.radius, maskConfig.radius ?? 0)
      ) {
        return i
      }
    }
    if (shapeConfig.type === 'rect' && maskConfig.type === 'rect') {
      if (
        approxEqual(shapeConfig.left, maskConfig.left ?? 0) &&
        approxEqual(shapeConfig.right, maskConfig.right ?? 0) &&
        approxEqual(shapeConfig.top, maskConfig.top ?? 0) &&
        approxEqual(shapeConfig.bottom, maskConfig.bottom ?? 0) &&
        approxEqual(shapeConfig.radiusTopLeft ?? 0, maskConfig.radiusTopLeft ?? 0) &&
        approxEqual(shapeConfig.radiusTopRight ?? 0, maskConfig.radiusTopRight ?? 0) &&
        approxEqual(shapeConfig.radiusBottomLeft ?? 0, maskConfig.radiusBottomLeft ?? 0) &&
        approxEqual(shapeConfig.radiusBottomRight ?? 0, maskConfig.radiusBottomRight ?? 0)
      ) {
        return i
      }
    }
    if (shapeConfig.type === 'blob' && maskConfig.type === 'blob') {
      if (
        approxEqual(shapeConfig.centerX, maskConfig.centerX ?? 0) &&
        approxEqual(shapeConfig.centerY, maskConfig.centerY ?? 0) &&
        approxEqual(shapeConfig.baseRadius, maskConfig.baseRadius ?? 0) &&
        approxEqual(shapeConfig.amplitude, maskConfig.amplitude ?? 0) &&
        shapeConfig.octaves === maskConfig.octaves &&
        shapeConfig.seed === maskConfig.seed
      ) {
        return i
      }
    }
    if (shapeConfig.type === 'perlin' && maskConfig.type === 'perlin') {
      if (
        shapeConfig.seed === maskConfig.seed &&
        approxEqual(shapeConfig.threshold, maskConfig.threshold ?? 0.5) &&
        approxEqual(shapeConfig.scale, maskConfig.scale ?? 4) &&
        shapeConfig.octaves === maskConfig.octaves
      ) {
        return i
      }
    }
  }
  return null
}
