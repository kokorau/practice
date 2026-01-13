/**
 * Mask Shader Registry
 *
 * Centralized registry for mask shape shader specifications.
 * This module provides a unified interface for creating mask render specs
 * based on shape type.
 *
 * Each mask shape has an associated shader that generates a grayscale map:
 * - White (1.0) = fully opaque
 * - Black (0.0) = fully transparent
 * - Gray values = partial transparency
 */

import {
  createCircleMaskSpec,
  createRectMaskSpec,
  createPerlinMaskSpec,
  createLinearGradientMaskSpec,
  createRadialGradientMaskSpec,
  createBoxGradientMaskSpec,
  type CircleMaskParams,
  type RectMaskParams,
  type PerlinMaskParams,
  type LinearGradientMaskParams,
  type RadialGradientMaskParams,
  type BoxGradientMaskParams,
  type Viewport,
} from '@practice/texture'

import type { MaskShape, MaskConfig } from './MaskSchema'

// ============================================================
// Types
// ============================================================

/** Common colors for mask rendering */
export interface MaskColors {
  innerColor: [number, number, number, number]
  outerColor: [number, number, number, number]
}

/** Default grayscale colors for mask generation */
export const DEFAULT_MASK_COLORS: MaskColors = {
  innerColor: [1, 1, 1, 1], // White (opaque)
  outerColor: [0, 0, 0, 1], // Black (transparent)
}

// ============================================================
// Shader Spec Creators
// ============================================================

/**
 * Create mask render spec for circle shape
 */
export function createCircleMaskShaderSpec(
  config: MaskConfig,
  viewport: Viewport,
  colors: MaskColors = DEFAULT_MASK_COLORS
) {
  if (config.shape !== 'circle') {
    throw new Error(`Expected circle shape, got ${config.shape}`)
  }

  const params: CircleMaskParams = {
    centerX: config.centerX,
    centerY: config.centerY,
    radius: config.radius,
    innerColor: colors.innerColor,
    outerColor: colors.outerColor,
    cutout: config.cutout,
  }

  return createCircleMaskSpec(params, viewport)
}

/**
 * Create mask render spec for rect shape
 */
export function createRectMaskShaderSpec(
  config: MaskConfig,
  viewport: Viewport,
  colors: MaskColors = DEFAULT_MASK_COLORS
) {
  if (config.shape !== 'rect') {
    throw new Error(`Expected rect shape, got ${config.shape}`)
  }

  const params: RectMaskParams = {
    left: config.left,
    right: config.right,
    top: config.top,
    bottom: config.bottom,
    radiusTopLeft: config.radiusTopLeft,
    radiusTopRight: config.radiusTopRight,
    radiusBottomLeft: config.radiusBottomLeft,
    radiusBottomRight: config.radiusBottomRight,
    rotation: config.rotation,
    perspectiveX: config.perspectiveX,
    perspectiveY: config.perspectiveY,
    innerColor: colors.innerColor,
    outerColor: colors.outerColor,
    cutout: config.cutout,
  }

  return createRectMaskSpec(params, viewport)
}

/**
 * Create mask render spec for perlin shape
 */
export function createPerlinMaskShaderSpec(
  config: MaskConfig,
  viewport: Viewport,
  colors: MaskColors = DEFAULT_MASK_COLORS
) {
  if (config.shape !== 'perlin') {
    throw new Error(`Expected perlin shape, got ${config.shape}`)
  }

  const params: PerlinMaskParams = {
    seed: config.seed,
    threshold: config.threshold,
    scale: config.scale,
    octaves: config.octaves,
    innerColor: colors.innerColor,
    outerColor: colors.outerColor,
    cutout: config.cutout,
  }

  return createPerlinMaskSpec(params, viewport)
}

/**
 * Create mask render spec for linear gradient shape
 */
export function createLinearGradientMaskShaderSpec(
  config: MaskConfig,
  viewport: Viewport,
  colors: MaskColors = DEFAULT_MASK_COLORS
) {
  if (config.shape !== 'linearGradient') {
    throw new Error(`Expected linearGradient shape, got ${config.shape}`)
  }

  const params: LinearGradientMaskParams = {
    angle: config.angle,
    startOffset: config.startOffset,
    endOffset: config.endOffset,
    innerColor: colors.innerColor,
    outerColor: colors.outerColor,
    cutout: config.cutout,
  }

  return createLinearGradientMaskSpec(params, viewport)
}

/**
 * Create mask render spec for radial gradient shape
 */
export function createRadialGradientMaskShaderSpec(
  config: MaskConfig,
  viewport: Viewport,
  colors: MaskColors = DEFAULT_MASK_COLORS
) {
  if (config.shape !== 'radialGradient') {
    throw new Error(`Expected radialGradient shape, got ${config.shape}`)
  }

  const params: RadialGradientMaskParams = {
    centerX: config.centerX,
    centerY: config.centerY,
    innerRadius: config.innerRadius,
    outerRadius: config.outerRadius,
    aspectRatio: config.aspectRatio,
    innerColor: colors.innerColor,
    outerColor: colors.outerColor,
    cutout: config.cutout,
  }

  return createRadialGradientMaskSpec(params, viewport)
}

/**
 * Create mask render spec for box gradient shape
 */
export function createBoxGradientMaskShaderSpec(
  config: MaskConfig,
  viewport: Viewport,
  colors: MaskColors = DEFAULT_MASK_COLORS
) {
  if (config.shape !== 'boxGradient') {
    throw new Error(`Expected boxGradient shape, got ${config.shape}`)
  }

  const params: BoxGradientMaskParams = {
    left: config.left,
    right: config.right,
    top: config.top,
    bottom: config.bottom,
    cornerRadius: config.cornerRadius,
    curve: config.curve,
    innerColor: colors.innerColor,
    outerColor: colors.outerColor,
    cutout: config.cutout,
  }

  return createBoxGradientMaskSpec(params, viewport)
}

// ============================================================
// Unified Shader Spec Creator
// ============================================================

/**
 * Create mask render spec based on shape type
 *
 * This is the main entry point for creating mask shaders.
 * It dispatches to the appropriate shape-specific creator based on the config's shape.
 *
 * Note: Blob shape is not yet supported as a standalone mask shader.
 * It's currently only available in combination with texture patterns.
 */
export function createMaskShaderSpec(
  config: MaskConfig,
  viewport: Viewport,
  colors: MaskColors = DEFAULT_MASK_COLORS
) {
  switch (config.shape) {
    case 'circle':
      return createCircleMaskShaderSpec(config, viewport, colors)
    case 'rect':
      return createRectMaskShaderSpec(config, viewport, colors)
    case 'perlin':
      return createPerlinMaskShaderSpec(config, viewport, colors)
    case 'linearGradient':
      return createLinearGradientMaskShaderSpec(config, viewport, colors)
    case 'radialGradient':
      return createRadialGradientMaskShaderSpec(config, viewport, colors)
    case 'boxGradient':
      return createBoxGradientMaskShaderSpec(config, viewport, colors)
    case 'blob':
      // Blob masks are handled separately in maskedTexture shaders
      // as they require both mask and texture parameters
      throw new Error(
        'Blob mask standalone shader not available. Use maskedTexture shaders instead.'
      )
    default:
      throw new Error(`Unknown mask shape: ${(config as MaskConfig).shape}`)
  }
}

// ============================================================
// Mask Shape Shader Registry
// ============================================================

/**
 * Registry of shader spec creators by shape type
 */
export const MASK_SHADER_REGISTRY: Partial<
  Record<
    MaskShape,
    (config: MaskConfig, viewport: Viewport, colors?: MaskColors) => ReturnType<typeof createCircleMaskSpec>
  >
> = {
  circle: createCircleMaskShaderSpec,
  rect: createRectMaskShaderSpec,
  perlin: createPerlinMaskShaderSpec,
  linearGradient: createLinearGradientMaskShaderSpec,
  radialGradient: createRadialGradientMaskShaderSpec,
  boxGradient: createBoxGradientMaskShaderSpec,
  // blob: Not available as standalone shader
}

/**
 * Check if a mask shape has a standalone shader
 */
export function hasMaskShader(shape: MaskShape): boolean {
  return shape in MASK_SHADER_REGISTRY
}

/**
 * Get list of shapes that have standalone shaders
 */
export const MASK_SHAPES_WITH_SHADER: MaskShape[] = [
  'circle',
  'rect',
  'perlin',
  'linearGradient',
  'radialGradient',
  'boxGradient',
]
