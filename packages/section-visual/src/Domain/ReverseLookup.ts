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
 * Uses generic string type to support dynamic schema-based surface types
 */
export interface SurfacePresetParams {
  id: string
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
 * Helper to get number from unknown with default
 */
const asNumber = (val: unknown, defaultVal: number): number =>
  typeof val === 'number' ? val : defaultVal

/**
 * Helper to get boolean from unknown with default
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
    if (!preset || preset.params.id !== surfaceConfig.id) continue

    const p = preset.params

    if (surfaceConfig.id === 'solid' && p.id === 'solid') {
      return i
    }
    if (surfaceConfig.id === 'stripe' && p.id === 'stripe') {
      if (
        approxEqual(surfaceConfig.width1, asNumber(p.width1, 0)) &&
        approxEqual(surfaceConfig.width2, asNumber(p.width2, 0)) &&
        approxEqual(surfaceConfig.angle, asNumber(p.angle, 0))
      ) {
        return i
      }
    }
    if (surfaceConfig.id === 'grid' && p.id === 'grid') {
      if (
        approxEqual(surfaceConfig.lineWidth, asNumber(p.lineWidth, 0)) &&
        approxEqual(surfaceConfig.cellSize, asNumber(p.cellSize, 0))
      ) {
        return i
      }
    }
    if (surfaceConfig.id === 'polkaDot' && p.id === 'polkaDot') {
      if (
        approxEqual(surfaceConfig.dotRadius, asNumber(p.dotRadius, 0)) &&
        approxEqual(surfaceConfig.spacing, asNumber(p.spacing, 0)) &&
        approxEqual(surfaceConfig.rowOffset, asNumber(p.rowOffset, 0))
      ) {
        return i
      }
    }
    if (surfaceConfig.id === 'checker' && p.id === 'checker') {
      if (
        approxEqual(surfaceConfig.cellSize, asNumber(p.cellSize, 0)) &&
        approxEqual(surfaceConfig.angle, asNumber(p.angle, 0))
      ) {
        return i
      }
    }
    if (surfaceConfig.id === 'linearGradient' && p.id === 'linearGradient') {
      if (
        approxEqual(surfaceConfig.angle, asNumber(p.angle, 90)) &&
        approxEqual(surfaceConfig.centerX, asNumber(p.centerX, 0.5)) &&
        approxEqual(surfaceConfig.centerY, asNumber(p.centerY, 0.5))
      ) {
        return i
      }
    }
    if (surfaceConfig.id === 'gradientGrainLinear' && p.id === 'gradientGrainLinear') {
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
    if (surfaceConfig.id === 'gradientGrainCircular' && p.id === 'gradientGrainCircular') {
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
    if (surfaceConfig.id === 'gradientGrainRadial' && p.id === 'gradientGrainRadial') {
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
    if (surfaceConfig.id === 'gradientGrainPerlin' && p.id === 'gradientGrainPerlin') {
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
    if (surfaceConfig.id === 'gradientGrainCurl' && p.id === 'gradientGrainCurl') {
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
    if (surfaceConfig.id === 'gradientGrainSimplex' && p.id === 'gradientGrainSimplex') {
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
    if (surfaceConfig.id === 'triangle' && p.id === 'triangle') {
      if (
        approxEqual(surfaceConfig.size, asNumber(p.size, 0)) &&
        approxEqual(surfaceConfig.angle, asNumber(p.angle, 0))
      ) {
        return i
      }
    }
    if (surfaceConfig.id === 'hexagon' && p.id === 'hexagon') {
      if (
        approxEqual(surfaceConfig.size, asNumber(p.size, 0)) &&
        approxEqual(surfaceConfig.angle, asNumber(p.angle, 0))
      ) {
        return i
      }
    }
    if (surfaceConfig.id === 'asanoha' && p.id === 'asanoha') {
      if (
        approxEqual(surfaceConfig.size, asNumber(p.size, 0)) &&
        approxEqual(surfaceConfig.lineWidth, asNumber(p.lineWidth, 0))
      ) {
        return i
      }
    }
    if (surfaceConfig.id === 'seigaiha' && p.id === 'seigaiha') {
      if (
        approxEqual(surfaceConfig.radius, asNumber(p.radius, 0)) &&
        approxEqual(surfaceConfig.rings, asNumber(p.rings, 0)) &&
        approxEqual(surfaceConfig.lineWidth, asNumber(p.lineWidth, 0))
      ) {
        return i
      }
    }
    if (surfaceConfig.id === 'wave' && p.id === 'wave') {
      if (
        approxEqual(surfaceConfig.amplitude, asNumber(p.amplitude, 0)) &&
        approxEqual(surfaceConfig.wavelength, asNumber(p.wavelength, 0)) &&
        approxEqual(surfaceConfig.thickness, asNumber(p.thickness, 0)) &&
        approxEqual(surfaceConfig.angle, asNumber(p.angle, 0))
      ) {
        return i
      }
    }
    if (surfaceConfig.id === 'scales' && p.id === 'scales') {
      if (
        approxEqual(surfaceConfig.size, asNumber(p.size, 0)) &&
        approxEqual(surfaceConfig.overlap, asNumber(p.overlap, 0)) &&
        approxEqual(surfaceConfig.angle, asNumber(p.angle, 0))
      ) {
        return i
      }
    }
    if (surfaceConfig.id === 'ogee' && p.id === 'ogee') {
      if (
        approxEqual(surfaceConfig.width, asNumber(p.width, 0)) &&
        approxEqual(surfaceConfig.height, asNumber(p.height, 0)) &&
        approxEqual(surfaceConfig.lineWidth, asNumber(p.lineWidth, 0))
      ) {
        return i
      }
    }
    if (surfaceConfig.id === 'sunburst' && p.id === 'sunburst') {
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
 * Children-based mask pattern interface for matching
 */
export interface ChildrenBasedMaskPattern {
  label: string
  children: Array<{
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
    const surfaceId = firstChild.surface.id

    // Match surface type to shape type
    if (surfaceId === shapeConfig.type) {
      return i
    }
  }
  return null
}
