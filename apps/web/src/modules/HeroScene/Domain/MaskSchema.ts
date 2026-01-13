/**
 * Mask Schema Definitions
 *
 * Schema definitions for mask shapes with UI metadata and validation.
 * Follows the same pattern as VignetteSchema for consistency.
 */

import { defineSchema, number, boolean, select, type Infer } from '@practice/schema'

// ============================================================
// Mask Shape Types
// ============================================================

export const MaskShapeOptions = [
  { value: 'circle' as const, label: 'Circle' },
  { value: 'rect' as const, label: 'Rectangle' },
  { value: 'blob' as const, label: 'Blob' },
  { value: 'perlin' as const, label: 'Perlin Noise' },
  { value: 'linearGradient' as const, label: 'Linear Gradient' },
  { value: 'radialGradient' as const, label: 'Radial Gradient' },
  { value: 'boxGradient' as const, label: 'Box Gradient' },
] as const

export type MaskShape =
  | 'circle'
  | 'rect'
  | 'blob'
  | 'perlin'
  | 'linearGradient'
  | 'radialGradient'
  | 'boxGradient'

// ============================================================
// Base Schema (shared fields)
// ============================================================

export const MaskBaseSchema = defineSchema({
  enabled: boolean({ label: 'Enabled', default: true }),
  shape: select({ label: 'Shape', options: MaskShapeOptions, default: 'circle' }),
  feather: number({ label: 'Feather', min: 0, max: 100, step: 1, default: 0, unit: 'px' }),
  invert: boolean({ label: 'Invert', default: false }),
})

export type MaskBase = Infer<typeof MaskBaseSchema>

// ============================================================
// Shape-specific Schemas
// ============================================================

export const CircleMaskSchema = defineSchema({
  centerX: number({ label: 'Center X', min: 0, max: 1, step: 0.01, default: 0.5 }),
  centerY: number({ label: 'Center Y', min: 0, max: 1, step: 0.01, default: 0.5 }),
  radius: number({ label: 'Radius', min: 0.01, max: 1, step: 0.01, default: 0.3 }),
  cutout: boolean({ label: 'Cutout', default: false, description: 'If true, texture is rendered outside the shape' }),
})

export type CircleMaskParams = Infer<typeof CircleMaskSchema>

export const RectMaskSchema = defineSchema({
  left: number({ label: 'Left', min: 0, max: 1, step: 0.01, default: 0.2 }),
  right: number({ label: 'Right', min: 0, max: 1, step: 0.01, default: 0.8 }),
  top: number({ label: 'Top', min: 0, max: 1, step: 0.01, default: 0.2 }),
  bottom: number({ label: 'Bottom', min: 0, max: 1, step: 0.01, default: 0.8 }),
  radiusTopLeft: number({ label: 'Top Left Radius', min: 0, max: 0.5, step: 0.01, default: 0 }),
  radiusTopRight: number({ label: 'Top Right Radius', min: 0, max: 0.5, step: 0.01, default: 0 }),
  radiusBottomLeft: number({ label: 'Bottom Left Radius', min: 0, max: 0.5, step: 0.01, default: 0 }),
  radiusBottomRight: number({ label: 'Bottom Right Radius', min: 0, max: 0.5, step: 0.01, default: 0 }),
  rotation: number({ label: 'Rotation', min: 0, max: 360, step: 1, default: 0, unit: 'deg' }),
  perspectiveX: number({ label: 'Perspective X', min: -0.5, max: 0.5, step: 0.01, default: 0 }),
  perspectiveY: number({ label: 'Perspective Y', min: -0.5, max: 0.5, step: 0.01, default: 0 }),
  cutout: boolean({ label: 'Cutout', default: false }),
})

export type RectMaskParams = Infer<typeof RectMaskSchema>

export const BlobMaskSchema = defineSchema({
  centerX: number({ label: 'Center X', min: 0, max: 1, step: 0.01, default: 0.5 }),
  centerY: number({ label: 'Center Y', min: 0, max: 1, step: 0.01, default: 0.5 }),
  baseRadius: number({ label: 'Base Radius', min: 0.01, max: 1, step: 0.01, default: 0.3 }),
  amplitude: number({ label: 'Amplitude', min: 0, max: 0.5, step: 0.01, default: 0.1 }),
  octaves: number({ label: 'Octaves', min: 1, max: 8, step: 1, default: 3 }),
  seed: number({ label: 'Seed', min: 0, max: 1000, step: 1, default: 42 }),
  cutout: boolean({ label: 'Cutout', default: false }),
})

export type BlobMaskParams = Infer<typeof BlobMaskSchema>

export const PerlinMaskSchema = defineSchema({
  seed: number({ label: 'Seed', min: 0, max: 1000, step: 1, default: 42 }),
  threshold: number({ label: 'Threshold', min: 0, max: 1, step: 0.01, default: 0.5 }),
  scale: number({ label: 'Scale', min: 1, max: 20, step: 0.5, default: 4 }),
  octaves: number({ label: 'Octaves', min: 1, max: 8, step: 1, default: 4 }),
  cutout: boolean({ label: 'Cutout', default: false, description: 'If true, noise > threshold is opaque' }),
})

export type PerlinMaskParams = Infer<typeof PerlinMaskSchema>

export const LinearGradientMaskSchema = defineSchema({
  angle: number({ label: 'Angle', min: 0, max: 360, step: 1, default: 0, unit: 'deg' }),
  startOffset: number({ label: 'Start', min: 0, max: 1, step: 0.01, default: 0.3 }),
  endOffset: number({ label: 'End', min: 0, max: 1, step: 0.01, default: 0.7 }),
  cutout: boolean({ label: 'Cutout', default: false }),
})

export type LinearGradientMaskParams = Infer<typeof LinearGradientMaskSchema>

export const RadialGradientMaskSchema = defineSchema({
  centerX: number({ label: 'Center X', min: 0, max: 1, step: 0.01, default: 0.5 }),
  centerY: number({ label: 'Center Y', min: 0, max: 1, step: 0.01, default: 0.5 }),
  innerRadius: number({ label: 'Inner Radius', min: 0, max: 1, step: 0.01, default: 0.1 }),
  outerRadius: number({ label: 'Outer Radius', min: 0, max: 1.5, step: 0.01, default: 0.5 }),
  aspectRatio: number({ label: 'Aspect Ratio', min: 0.25, max: 4, step: 0.05, default: 1 }),
  cutout: boolean({ label: 'Cutout', default: false }),
})

export type RadialGradientMaskParams = Infer<typeof RadialGradientMaskSchema>

export const BoxGradientCurveOptions = [
  { value: 'linear' as const, label: 'Linear' },
  { value: 'smooth' as const, label: 'Smooth' },
  { value: 'easeIn' as const, label: 'Ease In' },
  { value: 'easeOut' as const, label: 'Ease Out' },
] as const

export type BoxGradientCurve = 'linear' | 'smooth' | 'easeIn' | 'easeOut'

export const BoxGradientMaskSchema = defineSchema({
  left: number({ label: 'Left', min: 0, max: 0.5, step: 0.01, default: 0.1 }),
  right: number({ label: 'Right', min: 0, max: 0.5, step: 0.01, default: 0.1 }),
  top: number({ label: 'Top', min: 0, max: 0.5, step: 0.01, default: 0.1 }),
  bottom: number({ label: 'Bottom', min: 0, max: 0.5, step: 0.01, default: 0.1 }),
  cornerRadius: number({ label: 'Corner Radius', min: 0, max: 0.5, step: 0.01, default: 0 }),
  curve: select({ label: 'Curve', options: BoxGradientCurveOptions, default: 'linear' }),
  cutout: boolean({ label: 'Cutout', default: false }),
})

export type BoxGradientMaskParams = Infer<typeof BoxGradientMaskSchema>

// ============================================================
// Schema Map
// ============================================================

export const MaskShapeSchemas = {
  circle: CircleMaskSchema,
  rect: RectMaskSchema,
  blob: BlobMaskSchema,
  perlin: PerlinMaskSchema,
  linearGradient: LinearGradientMaskSchema,
  radialGradient: RadialGradientMaskSchema,
  boxGradient: BoxGradientMaskSchema,
} as const

// ============================================================
// Config Types (discriminated union)
// ============================================================

interface MaskConfigBase {
  enabled: boolean
  feather: number
  invert: boolean
}

export interface CircleMaskConfig extends MaskConfigBase {
  shape: 'circle'
  centerX: number
  centerY: number
  radius: number
  cutout: boolean
}

export interface RectMaskConfig extends MaskConfigBase {
  shape: 'rect'
  left: number
  right: number
  top: number
  bottom: number
  radiusTopLeft: number
  radiusTopRight: number
  radiusBottomLeft: number
  radiusBottomRight: number
  rotation: number
  perspectiveX: number
  perspectiveY: number
  cutout: boolean
}

export interface BlobMaskConfig extends MaskConfigBase {
  shape: 'blob'
  centerX: number
  centerY: number
  baseRadius: number
  amplitude: number
  octaves: number
  seed: number
  cutout: boolean
}

export interface PerlinMaskConfig extends MaskConfigBase {
  shape: 'perlin'
  seed: number
  threshold: number
  scale: number
  octaves: number
  cutout: boolean
}

export interface LinearGradientMaskConfig extends MaskConfigBase {
  shape: 'linearGradient'
  angle: number
  startOffset: number
  endOffset: number
  cutout: boolean
}

export interface RadialGradientMaskConfig extends MaskConfigBase {
  shape: 'radialGradient'
  centerX: number
  centerY: number
  innerRadius: number
  outerRadius: number
  aspectRatio: number
  cutout: boolean
}

export interface BoxGradientMaskConfig extends MaskConfigBase {
  shape: 'boxGradient'
  left: number
  right: number
  top: number
  bottom: number
  cornerRadius: number
  curve: BoxGradientCurve
  cutout: boolean
}

export type MaskConfig =
  | CircleMaskConfig
  | RectMaskConfig
  | BlobMaskConfig
  | PerlinMaskConfig
  | LinearGradientMaskConfig
  | RadialGradientMaskConfig
  | BoxGradientMaskConfig

// ============================================================
// Default Factory
// ============================================================

export const createDefaultMaskConfig = (): CircleMaskConfig => ({
  enabled: true,
  shape: 'circle',
  feather: 0,
  invert: false,
  centerX: 0.5,
  centerY: 0.5,
  radius: 0.3,
  cutout: false,
})

/**
 * Create mask config with proper defaults for a given shape
 * Preserves common properties (enabled, feather, invert) from existing config
 */
export function createMaskConfigForShape(
  shape: MaskShape,
  existing?: Partial<MaskConfig>
): MaskConfig {
  const base: MaskConfigBase = {
    enabled: existing?.enabled ?? true,
    feather: existing?.feather ?? 0,
    invert: existing?.invert ?? false,
  }

  switch (shape) {
    case 'circle':
      return {
        ...base,
        shape: 'circle',
        centerX: 0.5,
        centerY: 0.5,
        radius: 0.3,
        cutout: false,
      }
    case 'rect':
      return {
        ...base,
        shape: 'rect',
        left: 0.2,
        right: 0.8,
        top: 0.2,
        bottom: 0.8,
        radiusTopLeft: 0,
        radiusTopRight: 0,
        radiusBottomLeft: 0,
        radiusBottomRight: 0,
        rotation: 0,
        perspectiveX: 0,
        perspectiveY: 0,
        cutout: false,
      }
    case 'blob':
      return {
        ...base,
        shape: 'blob',
        centerX: 0.5,
        centerY: 0.5,
        baseRadius: 0.3,
        amplitude: 0.1,
        octaves: 3,
        seed: 42,
        cutout: false,
      }
    case 'perlin':
      return {
        ...base,
        shape: 'perlin',
        seed: 42,
        threshold: 0.5,
        scale: 4,
        octaves: 4,
        cutout: false,
      }
    case 'linearGradient':
      return {
        ...base,
        shape: 'linearGradient',
        angle: 0,
        startOffset: 0.3,
        endOffset: 0.7,
        cutout: false,
      }
    case 'radialGradient':
      return {
        ...base,
        shape: 'radialGradient',
        centerX: 0.5,
        centerY: 0.5,
        innerRadius: 0.1,
        outerRadius: 0.5,
        aspectRatio: 1,
        cutout: false,
      }
    case 'boxGradient':
      return {
        ...base,
        shape: 'boxGradient',
        left: 0.1,
        right: 0.1,
        top: 0.1,
        bottom: 0.1,
        cornerRadius: 0,
        curve: 'linear',
        cutout: false,
      }
  }
}

// ============================================================
// Type Guards
// ============================================================

export function isCircleMaskConfig(config: MaskConfig): config is CircleMaskConfig {
  return config.shape === 'circle'
}

export function isRectMaskConfig(config: MaskConfig): config is RectMaskConfig {
  return config.shape === 'rect'
}

export function isBlobMaskConfig(config: MaskConfig): config is BlobMaskConfig {
  return config.shape === 'blob'
}

export function isPerlinMaskConfig(config: MaskConfig): config is PerlinMaskConfig {
  return config.shape === 'perlin'
}

export function isLinearGradientMaskConfig(config: MaskConfig): config is LinearGradientMaskConfig {
  return config.shape === 'linearGradient'
}

export function isRadialGradientMaskConfig(config: MaskConfig): config is RadialGradientMaskConfig {
  return config.shape === 'radialGradient'
}

export function isBoxGradientMaskConfig(config: MaskConfig): config is BoxGradientMaskConfig {
  return config.shape === 'boxGradient'
}

// ============================================================
// Migration Helpers (ClipMaskConfig → MaskConfig)
// ============================================================

/**
 * Legacy ClipMaskConfig shape type
 * Used for migration from old format to new MaskConfig
 */
export type LegacyClipMaskShape = 'circle' | 'rect' | 'blob' | 'perlin' | 'image'

/**
 * Legacy ClipMaskConfig interface
 * Represents the old mask configuration format from Modifier.ts
 */
export interface LegacyClipMaskConfig {
  shape: LegacyClipMaskShape
  shapeParams: {
    type: LegacyClipMaskShape
    [key: string]: unknown
  }
  invert: boolean
  feather: number
  surface?: unknown
}

/**
 * Legacy MaskModifier interface
 * Represents the old mask modifier format from Modifier.ts
 */
export interface LegacyMaskModifier {
  type: 'mask'
  enabled: boolean
  config: LegacyClipMaskConfig
}

/**
 * Check if a shape is supported by the new MaskConfig
 */
export function isSupportedMaskShape(shape: string): shape is MaskShape {
  return ['circle', 'rect', 'blob', 'perlin', 'linearGradient', 'radialGradient', 'boxGradient'].includes(shape)
}

/**
 * Migrate legacy ClipMaskConfig to new MaskConfig
 *
 * This function converts the old nested shapeParams format to the new flat format.
 * If the shape is 'image' (not supported in new format), returns null.
 *
 * @param legacy - Legacy ClipMaskConfig from Modifier.ts
 * @param enabled - Whether the mask is enabled (from MaskModifier)
 * @returns New MaskConfig or null if migration not possible
 */
export function migrateClipMaskConfig(
  legacy: LegacyClipMaskConfig,
  enabled: boolean = true
): MaskConfig | null {
  const { shape, shapeParams, invert, feather } = legacy

  // Image masks are not supported in new format
  if (shape === 'image') {
    return null
  }

  const base = { enabled, invert, feather }

  switch (shape) {
    case 'circle': {
      const params = shapeParams as { type: 'circle'; centerX?: number; centerY?: number; radius?: number }
      return {
        ...base,
        shape: 'circle',
        centerX: params.centerX ?? 0.5,
        centerY: params.centerY ?? 0.5,
        radius: params.radius ?? 0.3,
        cutout: false,
      }
    }
    case 'rect': {
      const params = shapeParams as {
        type: 'rect'
        centerX?: number
        centerY?: number
        width?: number
        height?: number
        left?: number
        right?: number
        top?: number
        bottom?: number
        cornerRadius?: [number, number, number, number]
        radiusTopLeft?: number
        radiusTopRight?: number
        radiusBottomLeft?: number
        radiusBottomRight?: number
      }
      // Handle both old (centerX/Y, width/height) and new (left/right/top/bottom) formats
      const left = params.left ?? (params.centerX !== undefined && params.width !== undefined
        ? params.centerX - params.width / 2
        : 0.2)
      const right = params.right ?? (params.centerX !== undefined && params.width !== undefined
        ? params.centerX + params.width / 2
        : 0.8)
      const top = params.top ?? (params.centerY !== undefined && params.height !== undefined
        ? params.centerY - params.height / 2
        : 0.2)
      const bottom = params.bottom ?? (params.centerY !== undefined && params.height !== undefined
        ? params.centerY + params.height / 2
        : 0.8)
      const cornerRadius = params.cornerRadius ?? [0, 0, 0, 0]
      return {
        ...base,
        shape: 'rect',
        left,
        right,
        top,
        bottom,
        radiusTopLeft: params.radiusTopLeft ?? cornerRadius[0],
        radiusTopRight: params.radiusTopRight ?? cornerRadius[1],
        radiusBottomRight: params.radiusBottomRight ?? cornerRadius[2],
        radiusBottomLeft: params.radiusBottomLeft ?? cornerRadius[3],
        rotation: 0,
        perspectiveX: 0,
        perspectiveY: 0,
        cutout: false,
      }
    }
    case 'blob': {
      const params = shapeParams as {
        type: 'blob'
        centerX?: number
        centerY?: number
        baseRadius?: number
        amplitude?: number
        octaves?: number
        seed?: number
      }
      return {
        ...base,
        shape: 'blob',
        centerX: params.centerX ?? 0.5,
        centerY: params.centerY ?? 0.5,
        baseRadius: params.baseRadius ?? 0.3,
        amplitude: params.amplitude ?? 0.1,
        octaves: params.octaves ?? 3,
        seed: params.seed ?? 42,
        cutout: false,
      }
    }
    case 'perlin': {
      const params = shapeParams as {
        type: 'perlin'
        seed?: number
        threshold?: number
        scale?: number
        octaves?: number
      }
      return {
        ...base,
        shape: 'perlin',
        seed: params.seed ?? 42,
        threshold: params.threshold ?? 0.5,
        scale: params.scale ?? 4,
        octaves: params.octaves ?? 4,
        cutout: false,
      }
    }
    default:
      return null
  }
}

/**
 * Migrate legacy MaskModifier to new MaskConfig
 *
 * @param modifier - Legacy MaskModifier from Modifier.ts
 * @returns New MaskConfig or null if migration not possible
 */
export function migrateMaskModifier(modifier: LegacyMaskModifier): MaskConfig | null {
  return migrateClipMaskConfig(modifier.config, modifier.enabled)
}

/**
 * Convert new MaskConfig back to legacy ClipMaskConfig format
 *
 * This is useful for backward compatibility with code that still uses the old format.
 *
 * @param config - New MaskConfig
 * @returns Legacy ClipMaskConfig format
 */
export function toLegacyClipMaskConfig(config: MaskConfig): LegacyClipMaskConfig {
  const { shape, invert, feather, ...shapeParams } = config

  // Remove base properties from shape params
  const cleanShapeParams = { ...shapeParams }
  delete (cleanShapeParams as Record<string, unknown>).enabled

  return {
    shape: shape as LegacyClipMaskShape,
    shapeParams: {
      type: shape as LegacyClipMaskShape,
      ...cleanShapeParams,
    },
    invert,
    feather,
  }
}

/**
 * Convert new MaskConfig to legacy MaskModifier format
 *
 * @param config - New MaskConfig
 * @returns Legacy MaskModifier format
 */
export function toLegacyMaskModifier(config: MaskConfig): LegacyMaskModifier {
  return {
    type: 'mask',
    enabled: config.enabled,
    config: toLegacyClipMaskConfig(config),
  }
}
