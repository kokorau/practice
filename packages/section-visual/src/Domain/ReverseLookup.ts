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
  type: 'solid' | 'stripe' | 'grid' | 'polkaDot' | 'checker' | 'gradientGrainLinear' | 'gradientGrainCircular' | 'gradientGrainRadial' | 'gradientGrainPerlin' | 'gradientGrainCurl' | 'gradientGrainSimplex' | 'triangle' | 'hexagon' | 'asanoha' | 'seigaiha' | 'wave' | 'scales' | 'ogee' | 'sunburst' | 'paperTexture'
  width1?: number
  width2?: number
  angle?: number
  lineWidth?: number
  cellSize?: number
  dotRadius?: number
  spacing?: number
  rowOffset?: number
  // GradientGrain common params
  centerX?: number
  centerY?: number
  seed?: number
  sparsity?: number
  // GradientGrain Circular params
  circularInvert?: boolean
  // GradientGrain Radial params
  radialStartAngle?: number
  radialSweepAngle?: number
  // GradientGrain Perlin/Curl params
  perlinScale?: number
  perlinOctaves?: number
  perlinContrast?: number
  perlinOffset?: number
  // GradientGrain Curl params
  curlIntensity?: number
  // GradientGrain Simplex params
  simplexScale?: number
  simplexOctaves?: number
  simplexContrast?: number
  simplexOffset?: number
  // Triangle/Hexagon/Textile pattern params
  size?: number
  radius?: number
  rings?: number
  amplitude?: number
  wavelength?: number
  thickness?: number
  overlap?: number
  width?: number
  height?: number
  rays?: number
  twist?: number
  // Paper texture params
  fiberScale?: number
  fiberStrength?: number
  fiberWarp?: number
  grainDensity?: number
  grainSize?: number
  bumpStrength?: number
  lightAngle?: number
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
 * Find surface preset index by matching params
 * Returns null if no exact match found (custom params)
 */
export const findSurfacePresetIndex = (
  surfaceConfig: BackgroundSurfaceConfig | MaskSurfaceConfig,
  presets: { params: SurfacePresetParams }[]
): number | null => {
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
    if (surfaceConfig.type === 'gradientGrainLinear' && preset.params.type === 'gradientGrainLinear') {
      if (
        approxEqual(surfaceConfig.angle, preset.params.angle ?? 90) &&
        approxEqual(surfaceConfig.centerX, preset.params.centerX ?? 0.5) &&
        approxEqual(surfaceConfig.centerY, preset.params.centerY ?? 0.5) &&
        approxEqual(surfaceConfig.seed, preset.params.seed ?? 12345) &&
        approxEqual(surfaceConfig.sparsity, preset.params.sparsity ?? 0.75)
      ) {
        return i
      }
    }
    if (surfaceConfig.type === 'gradientGrainCircular' && preset.params.type === 'gradientGrainCircular') {
      if (
        approxEqual(surfaceConfig.centerX, preset.params.centerX ?? 0.5) &&
        approxEqual(surfaceConfig.centerY, preset.params.centerY ?? 0.5) &&
        (surfaceConfig.circularInvert ?? false) === (preset.params.circularInvert ?? false) &&
        approxEqual(surfaceConfig.seed, preset.params.seed ?? 12345) &&
        approxEqual(surfaceConfig.sparsity, preset.params.sparsity ?? 0.75)
      ) {
        return i
      }
    }
    if (surfaceConfig.type === 'gradientGrainRadial' && preset.params.type === 'gradientGrainRadial') {
      if (
        approxEqual(surfaceConfig.centerX, preset.params.centerX ?? 0.5) &&
        approxEqual(surfaceConfig.centerY, preset.params.centerY ?? 0.5) &&
        approxEqual(surfaceConfig.radialStartAngle, preset.params.radialStartAngle ?? 0) &&
        approxEqual(surfaceConfig.radialSweepAngle, preset.params.radialSweepAngle ?? 360) &&
        approxEqual(surfaceConfig.seed, preset.params.seed ?? 12345) &&
        approxEqual(surfaceConfig.sparsity, preset.params.sparsity ?? 0.75)
      ) {
        return i
      }
    }
    if (surfaceConfig.type === 'gradientGrainPerlin' && preset.params.type === 'gradientGrainPerlin') {
      if (
        approxEqual(surfaceConfig.perlinScale, preset.params.perlinScale ?? 4) &&
        approxEqual(surfaceConfig.perlinOctaves, preset.params.perlinOctaves ?? 4) &&
        approxEqual(surfaceConfig.perlinContrast, preset.params.perlinContrast ?? 1) &&
        approxEqual(surfaceConfig.perlinOffset, preset.params.perlinOffset ?? 0) &&
        approxEqual(surfaceConfig.seed, preset.params.seed ?? 12345) &&
        approxEqual(surfaceConfig.sparsity, preset.params.sparsity ?? 0.75)
      ) {
        return i
      }
    }
    if (surfaceConfig.type === 'gradientGrainCurl' && preset.params.type === 'gradientGrainCurl') {
      if (
        approxEqual(surfaceConfig.perlinScale, preset.params.perlinScale ?? 4) &&
        approxEqual(surfaceConfig.perlinOctaves, preset.params.perlinOctaves ?? 4) &&
        approxEqual(surfaceConfig.perlinContrast, preset.params.perlinContrast ?? 1) &&
        approxEqual(surfaceConfig.perlinOffset, preset.params.perlinOffset ?? 0) &&
        approxEqual(surfaceConfig.curlIntensity, preset.params.curlIntensity ?? 1) &&
        approxEqual(surfaceConfig.seed, preset.params.seed ?? 12345) &&
        approxEqual(surfaceConfig.sparsity, preset.params.sparsity ?? 0.75)
      ) {
        return i
      }
    }
    if (surfaceConfig.type === 'gradientGrainSimplex' && preset.params.type === 'gradientGrainSimplex') {
      if (
        approxEqual(surfaceConfig.simplexScale, preset.params.simplexScale ?? 4) &&
        approxEqual(surfaceConfig.simplexOctaves, preset.params.simplexOctaves ?? 4) &&
        approxEqual(surfaceConfig.simplexContrast, preset.params.simplexContrast ?? 1) &&
        approxEqual(surfaceConfig.simplexOffset, preset.params.simplexOffset ?? 0) &&
        approxEqual(surfaceConfig.seed, preset.params.seed ?? 12345) &&
        approxEqual(surfaceConfig.sparsity, preset.params.sparsity ?? 0.75)
      ) {
        return i
      }
    }
    if (surfaceConfig.type === 'triangle' && preset.params.type === 'triangle') {
      if (
        approxEqual(surfaceConfig.size, preset.params.size ?? 0) &&
        approxEqual(surfaceConfig.angle, preset.params.angle ?? 0)
      ) {
        return i
      }
    }
    if (surfaceConfig.type === 'hexagon' && preset.params.type === 'hexagon') {
      if (
        approxEqual(surfaceConfig.size, preset.params.size ?? 0) &&
        approxEqual(surfaceConfig.angle, preset.params.angle ?? 0)
      ) {
        return i
      }
    }
    if (surfaceConfig.type === 'asanoha' && preset.params.type === 'asanoha') {
      if (
        approxEqual(surfaceConfig.size, preset.params.size ?? 0) &&
        approxEqual(surfaceConfig.lineWidth, preset.params.lineWidth ?? 0)
      ) {
        return i
      }
    }
    if (surfaceConfig.type === 'seigaiha' && preset.params.type === 'seigaiha') {
      if (
        approxEqual(surfaceConfig.radius, preset.params.radius ?? 0) &&
        approxEqual(surfaceConfig.rings, preset.params.rings ?? 0) &&
        approxEqual(surfaceConfig.lineWidth, preset.params.lineWidth ?? 0)
      ) {
        return i
      }
    }
    if (surfaceConfig.type === 'wave' && preset.params.type === 'wave') {
      if (
        approxEqual(surfaceConfig.amplitude, preset.params.amplitude ?? 0) &&
        approxEqual(surfaceConfig.wavelength, preset.params.wavelength ?? 0) &&
        approxEqual(surfaceConfig.thickness, preset.params.thickness ?? 0) &&
        approxEqual(surfaceConfig.angle, preset.params.angle ?? 0)
      ) {
        return i
      }
    }
    if (surfaceConfig.type === 'scales' && preset.params.type === 'scales') {
      if (
        approxEqual(surfaceConfig.size, preset.params.size ?? 0) &&
        approxEqual(surfaceConfig.overlap, preset.params.overlap ?? 0) &&
        approxEqual(surfaceConfig.angle, preset.params.angle ?? 0)
      ) {
        return i
      }
    }
    if (surfaceConfig.type === 'ogee' && preset.params.type === 'ogee') {
      if (
        approxEqual(surfaceConfig.width, preset.params.width ?? 0) &&
        approxEqual(surfaceConfig.height, preset.params.height ?? 0) &&
        approxEqual(surfaceConfig.lineWidth, preset.params.lineWidth ?? 0)
      ) {
        return i
      }
    }
    if (surfaceConfig.type === 'sunburst' && preset.params.type === 'sunburst') {
      if (
        approxEqual(surfaceConfig.rays, preset.params.rays ?? 0) &&
        approxEqual(surfaceConfig.centerX, preset.params.centerX ?? 0.5) &&
        approxEqual(surfaceConfig.centerY, preset.params.centerY ?? 0.5) &&
        approxEqual(surfaceConfig.twist, preset.params.twist ?? 0)
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
