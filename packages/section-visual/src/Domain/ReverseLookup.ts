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
  type: 'solid' | 'stripe' | 'grid' | 'polkaDot' | 'checker' | 'linearGradient' | 'gradientGrainLinear' | 'gradientGrainCircular' | 'gradientGrainRadial' | 'gradientGrainPerlin' | 'gradientGrainCurl' | 'gradientGrainSimplex' | 'triangle' | 'hexagon' | 'asanoha' | 'seigaiha' | 'wave' | 'scales' | 'ogee' | 'sunburst' | 'paperTexture'
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
    if (surfaceConfig.type === 'linearGradient' && preset.params.type === 'linearGradient') {
      if (
        approxEqual(surfaceConfig.angle, preset.params.angle ?? 90) &&
        approxEqual(surfaceConfig.centerX, preset.params.centerX ?? 0.5) &&
        approxEqual(surfaceConfig.centerY, preset.params.centerY ?? 0.5)
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
 * Children-based mask pattern interface for matching
 */
export interface ChildrenBasedMaskPattern {
  label: string
  children: Array<{
    type: 'surface'
    surface: {
      id: string
      params: Record<string, { type: 'static'; value: unknown }>
    }
  }>
}

/**
 * Helper to get static value from children-based pattern params
 */
function getChildValue<T>(params: Record<string, { type: 'static'; value: unknown }>, key: string, defaultValue: T): T {
  const param = params[key]
  if (param && param.type === 'static') {
    return param.value as T
  }
  return defaultValue
}

/**
 * Find mask pattern index by matching children (children-based patterns).
 * Returns null if no exact match found (custom params).
 *
 * Note: This function matches the first child's surface configuration
 * against the pattern's first child.
 */
export const findMaskPatternIndex = (
  shapeConfig: MaskShapeConfig,
  patterns: ChildrenBasedMaskPattern[]
): number | null => {
  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i]
    if (!pattern?.children?.[0]) continue

    const firstChild = pattern.children[0]
    if (firstChild.type !== 'surface') continue

    const surfaceId = firstChild.surface.id
    const params = firstChild.surface.params

    // Match surface type to shape type
    if (surfaceId !== shapeConfig.type) continue

    if (shapeConfig.type === 'circle' && surfaceId === 'circle') {
      if (
        approxEqual(shapeConfig.centerX, getChildValue(params, 'centerX', 0.5)) &&
        approxEqual(shapeConfig.centerY, getChildValue(params, 'centerY', 0.5)) &&
        approxEqual(shapeConfig.radius, getChildValue(params, 'radius', 0.3))
      ) {
        return i
      }
    }
    if (shapeConfig.type === 'rect' && surfaceId === 'rect') {
      if (
        approxEqual(shapeConfig.left, getChildValue(params, 'left', 0)) &&
        approxEqual(shapeConfig.right, getChildValue(params, 'right', 1)) &&
        approxEqual(shapeConfig.top, getChildValue(params, 'top', 0)) &&
        approxEqual(shapeConfig.bottom, getChildValue(params, 'bottom', 1)) &&
        approxEqual(shapeConfig.radiusTopLeft ?? 0, getChildValue(params, 'radiusTopLeft', 0)) &&
        approxEqual(shapeConfig.radiusTopRight ?? 0, getChildValue(params, 'radiusTopRight', 0)) &&
        approxEqual(shapeConfig.radiusBottomLeft ?? 0, getChildValue(params, 'radiusBottomLeft', 0)) &&
        approxEqual(shapeConfig.radiusBottomRight ?? 0, getChildValue(params, 'radiusBottomRight', 0))
      ) {
        return i
      }
    }
    if (shapeConfig.type === 'blob' && surfaceId === 'blob') {
      if (
        approxEqual(shapeConfig.centerX, getChildValue(params, 'centerX', 0.5)) &&
        approxEqual(shapeConfig.centerY, getChildValue(params, 'centerY', 0.5)) &&
        approxEqual(shapeConfig.baseRadius, getChildValue(params, 'baseRadius', 0.4)) &&
        approxEqual(shapeConfig.amplitude, getChildValue(params, 'amplitude', 0.08)) &&
        shapeConfig.octaves === getChildValue(params, 'octaves', 2) &&
        shapeConfig.seed === getChildValue(params, 'seed', 1)
      ) {
        return i
      }
    }
    if (shapeConfig.type === 'perlin' && surfaceId === 'perlin') {
      if (
        shapeConfig.seed === getChildValue(params, 'seed', 12345) &&
        approxEqual(shapeConfig.threshold, getChildValue(params, 'threshold', 0.5)) &&
        approxEqual(shapeConfig.scale, getChildValue(params, 'scale', 4)) &&
        shapeConfig.octaves === getChildValue(params, 'octaves', 4)
      ) {
        return i
      }
    }
    if (shapeConfig.type === 'simplex' && surfaceId === 'simplex') {
      if (
        shapeConfig.seed === getChildValue(params, 'seed', 12345) &&
        approxEqual(shapeConfig.threshold, getChildValue(params, 'threshold', 0.5)) &&
        approxEqual(shapeConfig.scale, getChildValue(params, 'scale', 4)) &&
        shapeConfig.octaves === getChildValue(params, 'octaves', 4)
      ) {
        return i
      }
    }
    if (shapeConfig.type === 'curl' && surfaceId === 'curl') {
      if (
        shapeConfig.seed === getChildValue(params, 'seed', 12345) &&
        approxEqual(shapeConfig.threshold, getChildValue(params, 'threshold', 0.3)) &&
        approxEqual(shapeConfig.scale, getChildValue(params, 'scale', 4)) &&
        shapeConfig.octaves === getChildValue(params, 'octaves', 4) &&
        approxEqual(shapeConfig.intensity, getChildValue(params, 'intensity', 1))
      ) {
        return i
      }
    }
    if (shapeConfig.type === 'radialGradient' && surfaceId === 'radialGradient') {
      if (
        approxEqual(shapeConfig.centerX, getChildValue(params, 'centerX', 0.5)) &&
        approxEqual(shapeConfig.centerY, getChildValue(params, 'centerY', 0.5)) &&
        approxEqual(shapeConfig.innerRadius, getChildValue(params, 'innerRadius', 0.2)) &&
        approxEqual(shapeConfig.outerRadius, getChildValue(params, 'outerRadius', 0.6)) &&
        approxEqual(shapeConfig.aspectRatio, getChildValue(params, 'aspectRatio', 1))
      ) {
        return i
      }
    }
    if (shapeConfig.type === 'boxGradient' && surfaceId === 'boxGradient') {
      if (
        approxEqual(shapeConfig.left, getChildValue(params, 'left', 0.15)) &&
        approxEqual(shapeConfig.right, getChildValue(params, 'right', 0.15)) &&
        approxEqual(shapeConfig.top, getChildValue(params, 'top', 0.15)) &&
        approxEqual(shapeConfig.bottom, getChildValue(params, 'bottom', 0.15)) &&
        approxEqual(shapeConfig.cornerRadius, getChildValue(params, 'cornerRadius', 0)) &&
        shapeConfig.curve === getChildValue(params, 'curve', 'smooth')
      ) {
        return i
      }
    }
    if (shapeConfig.type === 'wavyLine' && surfaceId === 'wavyLine') {
      if (
        approxEqual(shapeConfig.position, getChildValue(params, 'position', 0.5)) &&
        shapeConfig.direction === getChildValue(params, 'direction', 'vertical') &&
        approxEqual(shapeConfig.amplitude, getChildValue(params, 'amplitude', 0.08)) &&
        approxEqual(shapeConfig.frequency, getChildValue(params, 'frequency', 3)) &&
        shapeConfig.octaves === getChildValue(params, 'octaves', 2) &&
        shapeConfig.seed === getChildValue(params, 'seed', 42)
      ) {
        return i
      }
    }
  }
  return null
}

/**
 * Find mask pattern index by matching shape type only (ignoring params).
 * Returns the first pattern that matches the shape type.
 * Use this when exact parameter matching fails but you need a baseline pattern.
 *
 * Works with children-based mask patterns.
 */
export const findMaskPatternIndexByType = (
  shapeConfig: MaskShapeConfig,
  patterns: ChildrenBasedMaskPattern[]
): number | null => {
  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i]
    if (!pattern?.children?.[0]) continue

    const firstChild = pattern.children[0]
    if (firstChild.type !== 'surface') continue

    const surfaceId = firstChild.surface.id

    // Match surface type to shape type
    if (surfaceId === shapeConfig.type) {
      return i
    }
  }
  return null
}
