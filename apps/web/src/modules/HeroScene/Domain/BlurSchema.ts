/**
 * Blur Schema Definitions
 *
 * Schema definitions for blur effect with multiple shape mask variants.
 * Supports regional blur effects like tilt-shift, radial focus, etc.
 */

import { defineSchema, number, boolean, select, type Infer } from '@practice/schema'

// ============================================================
// Blur Mask Shape Types
// ============================================================

export const BlurMaskShapeOptions = [
  { value: 'none' as const, label: 'None (Full)' },
  { value: 'linear' as const, label: 'Linear' },
  { value: 'radial' as const, label: 'Radial' },
  { value: 'rectangular' as const, label: 'Rectangular' },
] as const

export type BlurMaskShape = 'none' | 'linear' | 'radial' | 'rectangular'

// ============================================================
// Base Schema (shared fields)
// ============================================================

export const BlurBaseSchema = defineSchema({
  enabled: boolean({ label: 'Enabled', default: false }),
  radius: number({ label: 'Blur Radius', min: 1, max: 30, step: 1, default: 8 }),
  maskShape: select({ label: 'Mask Shape', options: BlurMaskShapeOptions, default: 'none' }),
  invert: boolean({ label: 'Invert Mask', default: false }),
})

export type BlurBase = Infer<typeof BlurBaseSchema>

// ============================================================
// Shape-specific Schemas
// ============================================================

/** Linear mask (tilt-shift effect) */
export const LinearBlurSchema = defineSchema({
  angle: number({ label: 'Angle', min: 0, max: 360, step: 1, default: 0 }),
  centerX: number({ label: 'Center X', min: 0, max: 1, step: 0.01, default: 0.5 }),
  centerY: number({ label: 'Center Y', min: 0, max: 1, step: 0.01, default: 0.5 }),
  focusWidth: number({ label: 'Focus Width', min: 0, max: 1, step: 0.01, default: 0.3 }),
  feather: number({ label: 'Feather', min: 0.01, max: 1, step: 0.01, default: 0.2 }),
})

export type LinearBlurParams = Infer<typeof LinearBlurSchema>

/** Radial mask (focus effect - circular or elliptical) */
export const RadialBlurSchema = defineSchema({
  centerX: number({ label: 'Center X', min: 0, max: 1, step: 0.01, default: 0.5 }),
  centerY: number({ label: 'Center Y', min: 0, max: 1, step: 0.01, default: 0.5 }),
  innerRadius: number({ label: 'Inner Radius', min: 0, max: 1, step: 0.01, default: 0.2 }),
  outerRadius: number({ label: 'Outer Radius', min: 0.01, max: 1.5, step: 0.01, default: 0.6 }),
  aspectRatio: number({ label: 'Aspect Ratio', min: 0.25, max: 4, step: 0.05, default: 1 }),
})

export type RadialBlurParams = Infer<typeof RadialBlurSchema>

/** Rectangular mask (box-shaped blur region) */
export const RectangularBlurSchema = defineSchema({
  centerX: number({ label: 'Center X', min: 0, max: 1, step: 0.01, default: 0.5 }),
  centerY: number({ label: 'Center Y', min: 0, max: 1, step: 0.01, default: 0.5 }),
  width: number({ label: 'Width', min: 0.1, max: 1, step: 0.01, default: 0.6 }),
  height: number({ label: 'Height', min: 0.1, max: 1, step: 0.01, default: 0.4 }),
  feather: number({ label: 'Feather', min: 0.01, max: 0.5, step: 0.01, default: 0.1 }),
  cornerRadius: number({ label: 'Corner Radius', min: 0, max: 0.5, step: 0.01, default: 0 }),
})

export type RectangularBlurParams = Infer<typeof RectangularBlurSchema>

// ============================================================
// Schema Map
// ============================================================

export const BlurMaskShapeSchemas = {
  linear: LinearBlurSchema,
  radial: RadialBlurSchema,
  rectangular: RectangularBlurSchema,
} as const

// ============================================================
// Config Types (discriminated union)
// ============================================================

interface BlurConfigBase {
  enabled: boolean
  radius: number
  invert: boolean
}

export interface NoneBlurConfig extends BlurConfigBase {
  maskShape: 'none'
}

export interface LinearBlurConfig extends BlurConfigBase {
  maskShape: 'linear'
  angle: number
  centerX: number
  centerY: number
  focusWidth: number
  feather: number
}

export interface RadialBlurConfig extends BlurConfigBase {
  maskShape: 'radial'
  centerX: number
  centerY: number
  innerRadius: number
  outerRadius: number
  aspectRatio: number
}

export interface RectangularBlurConfig extends BlurConfigBase {
  maskShape: 'rectangular'
  centerX: number
  centerY: number
  width: number
  height: number
  feather: number
  cornerRadius: number
}

export type BlurConfig =
  | NoneBlurConfig
  | LinearBlurConfig
  | RadialBlurConfig
  | RectangularBlurConfig

// ============================================================
// Default Factory
// ============================================================

export const createDefaultBlurConfig = (): NoneBlurConfig => ({
  enabled: false,
  radius: 8,
  maskShape: 'none',
  invert: false,
})

/**
 * Create blur config with proper defaults for a given mask shape
 * Preserves common properties (enabled, radius, invert) from existing config
 */
export function createBlurConfigForShape(
  maskShape: BlurMaskShape,
  existing?: Partial<BlurConfig>
): BlurConfig {
  const base = {
    enabled: existing?.enabled ?? false,
    radius: existing?.radius ?? 8,
    invert: existing?.invert ?? false,
  }

  switch (maskShape) {
    case 'none':
      return {
        ...base,
        maskShape: 'none',
      }
    case 'linear':
      return {
        ...base,
        maskShape: 'linear',
        angle: 0,
        centerX: 0.5,
        centerY: 0.5,
        focusWidth: 0.3,
        feather: 0.2,
      }
    case 'radial':
      return {
        ...base,
        maskShape: 'radial',
        centerX: 0.5,
        centerY: 0.5,
        innerRadius: 0.2,
        outerRadius: 0.6,
        aspectRatio: 1,
      }
    case 'rectangular':
      return {
        ...base,
        maskShape: 'rectangular',
        centerX: 0.5,
        centerY: 0.5,
        width: 0.6,
        height: 0.4,
        feather: 0.1,
        cornerRadius: 0,
      }
  }
}

// ============================================================
// Migration Helper
// ============================================================

interface LegacyBlurConfig {
  enabled: boolean
  radius: number
}

/**
 * Migrate legacy blur config to new format
 */
export function migrateBlurConfig(
  legacy: LegacyBlurConfig | BlurConfig
): BlurConfig {
  // If already has maskShape, return as-is
  if ('maskShape' in legacy) {
    return legacy
  }

  // Migrate to none (preserves existing behavior - full screen blur)
  return {
    enabled: legacy.enabled,
    radius: legacy.radius,
    maskShape: 'none',
    invert: false,
  }
}
