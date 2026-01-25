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
 *
 * Dynamic schema-based type - uses string for type field.
 * Specific params are validated at runtime via SurfaceRegistry schemas.
 */
export interface SurfacePresetParams {
  type: string
  [key: string]: unknown
}

/**
 * Mask pattern config type (for matching)
 */
export interface MaskPatternConfig {
  type: 'circle' | 'rect' | 'blob' | 'perlin' | 'simplex' | 'curl' | 'linearGradient' | 'radialGradient' | 'boxGradient' | 'wavyLine'
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
  // Curl params
  intensity?: number
  // LinearGradient params
  angle?: number
  startOffset?: number
  endOffset?: number
  // RadialGradient params
  innerRadius?: number
  outerRadius?: number
  aspectRatio?: number
  // BoxGradient params
  cornerRadius?: number
  curve?: 'linear' | 'smooth' | 'easeIn' | 'easeOut'
  // WavyLine params
  position?: number
  direction?: 'vertical' | 'horizontal'
  frequency?: number
}

/**
 * Helper to safely get a number from unknown value
 */
const asNumber = (val: unknown, defaultVal: number): number =>
  typeof val === 'number' ? val : defaultVal

/**
 * Helper to safely get a boolean from unknown value
 */
const asBoolean = (val: unknown, defaultVal: boolean): boolean =>
  typeof val === 'boolean' ? val : defaultVal

/**
 * Find surface preset index by matching params
 * Returns null if no exact match found (custom params)
 */
export const findSurfacePresetIndex = (
  surfaceConfig: BackgroundSurfaceConfig | MaskSurfaceConfig,
  presets: { params: SurfacePresetParams }[]
): number | null => {
  for (let i = 0; i < presets.length; i++) {
    const preset = presets[i]
    const p = preset?.params
    if (!p || p.type !== surfaceConfig.type) continue

    if (surfaceConfig.type === 'solid' && p.type === 'solid') {
      return i
    }
    if (surfaceConfig.type === 'stripe' && p.type === 'stripe') {
      if (
        approxEqual(surfaceConfig.width1, asNumber(p.width1, 0)) &&
        approxEqual(surfaceConfig.width2, asNumber(p.width2, 0)) &&
        approxEqual(surfaceConfig.angle, asNumber(p.angle, 0))
      ) {
        return i
      }
    }
    if (surfaceConfig.type === 'grid' && p.type === 'grid') {
      if (
        approxEqual(surfaceConfig.lineWidth, asNumber(p.lineWidth, 0)) &&
        approxEqual(surfaceConfig.cellSize, asNumber(p.cellSize, 0))
      ) {
        return i
      }
    }
    if (surfaceConfig.type === 'polkaDot' && p.type === 'polkaDot') {
      if (
        approxEqual(surfaceConfig.dotRadius, asNumber(p.dotRadius, 0)) &&
        approxEqual(surfaceConfig.spacing, asNumber(p.spacing, 0)) &&
        approxEqual(surfaceConfig.rowOffset, asNumber(p.rowOffset, 0))
      ) {
        return i
      }
    }
    if (surfaceConfig.type === 'checker' && p.type === 'checker') {
      if (
        approxEqual(surfaceConfig.cellSize, asNumber(p.cellSize, 0)) &&
        approxEqual(surfaceConfig.angle, asNumber(p.angle, 0))
      ) {
        return i
      }
    }
    if (surfaceConfig.type === 'linearGradient' && p.type === 'linearGradient') {
      if (
        approxEqual(surfaceConfig.angle, asNumber(p.angle, 90)) &&
        approxEqual(surfaceConfig.centerX, asNumber(p.centerX, 0.5)) &&
        approxEqual(surfaceConfig.centerY, asNumber(p.centerY, 0.5))
      ) {
        return i
      }
    }
    if (surfaceConfig.type === 'gradientGrainLinear' && p.type === 'gradientGrainLinear') {
      if (
        approxEqual(surfaceConfig.angle, asNumber(p.angle, 90)) &&
        approxEqual(surfaceConfig.centerX, asNumber(p.centerX, 0.5)) &&
        approxEqual(surfaceConfig.centerY, asNumber(p.centerY, 0.5)) &&
        approxEqual(surfaceConfig.seed, asNumber(p.seed, 12345)) &&
        approxEqual(surfaceConfig.sparsity, asNumber(p.sparsity, 0.75))
      ) {
        return i
      }
    }
    if (surfaceConfig.type === 'gradientGrainCircular' && p.type === 'gradientGrainCircular') {
      if (
        approxEqual(surfaceConfig.centerX, asNumber(p.centerX, 0.5)) &&
        approxEqual(surfaceConfig.centerY, asNumber(p.centerY, 0.5)) &&
        (surfaceConfig.circularInvert ?? false) === asBoolean(p.circularInvert, false) &&
        approxEqual(surfaceConfig.seed, asNumber(p.seed, 12345)) &&
        approxEqual(surfaceConfig.sparsity, asNumber(p.sparsity, 0.75))
      ) {
        return i
      }
    }
    if (surfaceConfig.type === 'gradientGrainRadial' && p.type === 'gradientGrainRadial') {
      if (
        approxEqual(surfaceConfig.centerX, asNumber(p.centerX, 0.5)) &&
        approxEqual(surfaceConfig.centerY, asNumber(p.centerY, 0.5)) &&
        approxEqual(surfaceConfig.radialStartAngle, asNumber(p.radialStartAngle, 0)) &&
        approxEqual(surfaceConfig.radialSweepAngle, asNumber(p.radialSweepAngle, 360)) &&
        approxEqual(surfaceConfig.seed, asNumber(p.seed, 12345)) &&
        approxEqual(surfaceConfig.sparsity, asNumber(p.sparsity, 0.75))
      ) {
        return i
      }
    }
    if (surfaceConfig.type === 'gradientGrainPerlin' && p.type === 'gradientGrainPerlin') {
      if (
        approxEqual(surfaceConfig.perlinScale, asNumber(p.perlinScale, 4)) &&
        approxEqual(surfaceConfig.perlinOctaves, asNumber(p.perlinOctaves, 4)) &&
        approxEqual(surfaceConfig.perlinContrast, asNumber(p.perlinContrast, 1)) &&
        approxEqual(surfaceConfig.perlinOffset, asNumber(p.perlinOffset, 0)) &&
        approxEqual(surfaceConfig.seed, asNumber(p.seed, 12345)) &&
        approxEqual(surfaceConfig.sparsity, asNumber(p.sparsity, 0.75))
      ) {
        return i
      }
    }
    if (surfaceConfig.type === 'gradientGrainCurl' && p.type === 'gradientGrainCurl') {
      if (
        approxEqual(surfaceConfig.perlinScale, asNumber(p.perlinScale, 4)) &&
        approxEqual(surfaceConfig.perlinOctaves, asNumber(p.perlinOctaves, 4)) &&
        approxEqual(surfaceConfig.perlinContrast, asNumber(p.perlinContrast, 1)) &&
        approxEqual(surfaceConfig.perlinOffset, asNumber(p.perlinOffset, 0)) &&
        approxEqual(surfaceConfig.curlIntensity, asNumber(p.curlIntensity, 1)) &&
        approxEqual(surfaceConfig.seed, asNumber(p.seed, 12345)) &&
        approxEqual(surfaceConfig.sparsity, asNumber(p.sparsity, 0.75))
      ) {
        return i
      }
    }
    if (surfaceConfig.type === 'gradientGrainSimplex' && p.type === 'gradientGrainSimplex') {
      if (
        approxEqual(surfaceConfig.simplexScale, asNumber(p.simplexScale, 4)) &&
        approxEqual(surfaceConfig.simplexOctaves, asNumber(p.simplexOctaves, 4)) &&
        approxEqual(surfaceConfig.simplexContrast, asNumber(p.simplexContrast, 1)) &&
        approxEqual(surfaceConfig.simplexOffset, asNumber(p.simplexOffset, 0)) &&
        approxEqual(surfaceConfig.seed, asNumber(p.seed, 12345)) &&
        approxEqual(surfaceConfig.sparsity, asNumber(p.sparsity, 0.75))
      ) {
        return i
      }
    }
    if (surfaceConfig.type === 'triangle' && p.type === 'triangle') {
      if (
        approxEqual(surfaceConfig.size, asNumber(p.size, 0)) &&
        approxEqual(surfaceConfig.angle, asNumber(p.angle, 0))
      ) {
        return i
      }
    }
    if (surfaceConfig.type === 'hexagon' && p.type === 'hexagon') {
      if (
        approxEqual(surfaceConfig.size, asNumber(p.size, 0)) &&
        approxEqual(surfaceConfig.angle, asNumber(p.angle, 0))
      ) {
        return i
      }
    }
    if (surfaceConfig.type === 'asanoha' && p.type === 'asanoha') {
      if (
        approxEqual(surfaceConfig.size, asNumber(p.size, 0)) &&
        approxEqual(surfaceConfig.lineWidth, asNumber(p.lineWidth, 0))
      ) {
        return i
      }
    }
    if (surfaceConfig.type === 'seigaiha' && p.type === 'seigaiha') {
      if (
        approxEqual(surfaceConfig.radius, asNumber(p.radius, 0)) &&
        approxEqual(surfaceConfig.rings, asNumber(p.rings, 0)) &&
        approxEqual(surfaceConfig.lineWidth, asNumber(p.lineWidth, 0))
      ) {
        return i
      }
    }
    if (surfaceConfig.type === 'wave' && p.type === 'wave') {
      if (
        approxEqual(surfaceConfig.amplitude, asNumber(p.amplitude, 0)) &&
        approxEqual(surfaceConfig.wavelength, asNumber(p.wavelength, 0)) &&
        approxEqual(surfaceConfig.thickness, asNumber(p.thickness, 0)) &&
        approxEqual(surfaceConfig.angle, asNumber(p.angle, 0))
      ) {
        return i
      }
    }
    if (surfaceConfig.type === 'scales' && p.type === 'scales') {
      if (
        approxEqual(surfaceConfig.size, asNumber(p.size, 0)) &&
        approxEqual(surfaceConfig.overlap, asNumber(p.overlap, 0)) &&
        approxEqual(surfaceConfig.angle, asNumber(p.angle, 0))
      ) {
        return i
      }
    }
    if (surfaceConfig.type === 'ogee' && p.type === 'ogee') {
      if (
        approxEqual(surfaceConfig.width, asNumber(p.width, 0)) &&
        approxEqual(surfaceConfig.height, asNumber(p.height, 0)) &&
        approxEqual(surfaceConfig.lineWidth, asNumber(p.lineWidth, 0))
      ) {
        return i
      }
    }
    if (surfaceConfig.type === 'sunburst' && p.type === 'sunburst') {
      if (
        approxEqual(surfaceConfig.rays, asNumber(p.rays, 0)) &&
        approxEqual(surfaceConfig.centerX, asNumber(p.centerX, 0.5)) &&
        approxEqual(surfaceConfig.centerY, asNumber(p.centerY, 0.5)) &&
        approxEqual(surfaceConfig.twist, asNumber(p.twist, 0))
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
    if (shapeConfig.type === 'simplex' && maskConfig.type === 'simplex') {
      if (
        shapeConfig.seed === maskConfig.seed &&
        approxEqual(shapeConfig.threshold, maskConfig.threshold ?? 0.5) &&
        approxEqual(shapeConfig.scale, maskConfig.scale ?? 4) &&
        shapeConfig.octaves === maskConfig.octaves
      ) {
        return i
      }
    }
    if (shapeConfig.type === 'curl' && maskConfig.type === 'curl') {
      if (
        shapeConfig.seed === maskConfig.seed &&
        approxEqual(shapeConfig.threshold, maskConfig.threshold ?? 0.3) &&
        approxEqual(shapeConfig.scale, maskConfig.scale ?? 4) &&
        shapeConfig.octaves === maskConfig.octaves &&
        approxEqual(shapeConfig.intensity, maskConfig.intensity ?? 1)
      ) {
        return i
      }
    }
    if (shapeConfig.type === 'linearGradient' && maskConfig.type === 'linearGradient') {
      if (
        approxEqual(shapeConfig.angle, maskConfig.angle ?? 0) &&
        approxEqual(shapeConfig.startOffset, maskConfig.startOffset ?? 0.3) &&
        approxEqual(shapeConfig.endOffset, maskConfig.endOffset ?? 0.7)
      ) {
        return i
      }
    }
    if (shapeConfig.type === 'radialGradient' && maskConfig.type === 'radialGradient') {
      if (
        approxEqual(shapeConfig.centerX, maskConfig.centerX ?? 0.5) &&
        approxEqual(shapeConfig.centerY, maskConfig.centerY ?? 0.5) &&
        approxEqual(shapeConfig.innerRadius, maskConfig.innerRadius ?? 0) &&
        approxEqual(shapeConfig.outerRadius, maskConfig.outerRadius ?? 0.5) &&
        approxEqual(shapeConfig.aspectRatio, maskConfig.aspectRatio ?? 1)
      ) {
        return i
      }
    }
    if (shapeConfig.type === 'boxGradient' && maskConfig.type === 'boxGradient') {
      if (
        approxEqual(shapeConfig.left, maskConfig.left ?? 0.15) &&
        approxEqual(shapeConfig.right, maskConfig.right ?? 0.15) &&
        approxEqual(shapeConfig.top, maskConfig.top ?? 0.15) &&
        approxEqual(shapeConfig.bottom, maskConfig.bottom ?? 0.15) &&
        approxEqual(shapeConfig.cornerRadius, maskConfig.cornerRadius ?? 0) &&
        shapeConfig.curve === maskConfig.curve
      ) {
        return i
      }
    }
    if (shapeConfig.type === 'wavyLine' && maskConfig.type === 'wavyLine') {
      if (
        approxEqual(shapeConfig.position, maskConfig.position ?? 0.5) &&
        shapeConfig.direction === maskConfig.direction &&
        approxEqual(shapeConfig.amplitude, maskConfig.amplitude ?? 0.08) &&
        approxEqual(shapeConfig.frequency, maskConfig.frequency ?? 3) &&
        shapeConfig.octaves === maskConfig.octaves &&
        shapeConfig.seed === maskConfig.seed
      ) {
        return i
      }
    }
  }
  return null
}

/**
 * Find mask pattern index by matching shape type only (ignoring params)
 * Returns the first pattern that matches the shape type
 * Use this when exact parameter matching fails but you need a baseline pattern
 */
export const findMaskPatternIndexByType = (
  shapeConfig: MaskShapeConfig,
  patterns: { maskConfig: MaskPatternConfig }[]
): number | null => {
  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i]
    const maskConfig = pattern?.maskConfig
    if (maskConfig && maskConfig.type === shapeConfig.type) {
      // Check cutout (default to true if undefined)
      const shapeCutout = shapeConfig.cutout ?? true
      const maskCutout = maskConfig.cutout ?? true
      if (shapeCutout === maskCutout) {
        return i
      }
    }
  }
  return null
}
