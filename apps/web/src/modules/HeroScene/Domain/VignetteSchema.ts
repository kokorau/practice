/**
 * Vignette Schema Definitions
 *
 * Schema definitions for vignette effect with multiple shape variants.
 */

import { defineSchema, number, boolean, select, type Infer } from '@practice/schema'

// ============================================================
// Vignette Shape Types
// ============================================================

export const VignetteShapeOptions = [
  { value: 'ellipse' as const, label: 'Ellipse' },
  { value: 'circle' as const, label: 'Circle' },
  { value: 'rectangle' as const, label: 'Rectangle' },
  { value: 'linear' as const, label: 'Linear' },
] as const

export type VignetteShape = 'ellipse' | 'circle' | 'rectangle' | 'linear'

// ============================================================
// Base Schema (shared fields)
// ============================================================

export const VignetteBaseSchema = defineSchema({
  enabled: boolean({ label: 'Enabled', default: false }),
  shape: select({ label: 'Shape', options: VignetteShapeOptions, default: 'ellipse' }),
  intensity: number({ label: 'Intensity', min: 0, max: 1, step: 0.01, default: 0.5 }),
  softness: number({ label: 'Softness', min: 0.01, max: 1, step: 0.01, default: 0.4 }),
})

export type VignetteBase = Infer<typeof VignetteBaseSchema>

// ============================================================
// Shape-specific Schemas
// ============================================================

export const EllipseVignetteSchema = defineSchema({
  radius: number({ label: 'Radius', min: 0.2, max: 1.5, step: 0.01, default: 0.8 }),
  centerX: number({ label: 'Center X', min: 0, max: 1, step: 0.01, default: 0.5 }),
  centerY: number({ label: 'Center Y', min: 0, max: 1, step: 0.01, default: 0.5 }),
  aspectRatio: number({ label: 'Aspect Ratio', min: 0.25, max: 4, step: 0.05, default: 1 }),
})

export type EllipseVignetteParams = Infer<typeof EllipseVignetteSchema>

export const CircleVignetteSchema = defineSchema({
  radius: number({ label: 'Radius', min: 0.2, max: 1.5, step: 0.01, default: 0.8 }),
  centerX: number({ label: 'Center X', min: 0, max: 1, step: 0.01, default: 0.5 }),
  centerY: number({ label: 'Center Y', min: 0, max: 1, step: 0.01, default: 0.5 }),
})

export type CircleVignetteParams = Infer<typeof CircleVignetteSchema>

export const RectVignetteSchema = defineSchema({
  centerX: number({ label: 'Center X', min: 0, max: 1, step: 0.01, default: 0.5 }),
  centerY: number({ label: 'Center Y', min: 0, max: 1, step: 0.01, default: 0.5 }),
  width: number({ label: 'Width', min: 0.1, max: 1, step: 0.01, default: 0.8 }),
  height: number({ label: 'Height', min: 0.1, max: 1, step: 0.01, default: 0.6 }),
  cornerRadius: number({ label: 'Corner Radius', min: 0, max: 0.5, step: 0.01, default: 0 }),
})

export type RectVignetteParams = Infer<typeof RectVignetteSchema>

export const LinearVignetteSchema = defineSchema({
  angle: number({ label: 'Angle', min: 0, max: 360, step: 1, default: 0 }),
  startOffset: number({ label: 'Start', min: 0, max: 1, step: 0.01, default: 0.3 }),
  endOffset: number({ label: 'End', min: 0, max: 1, step: 0.01, default: 0.7 }),
})

export type LinearVignetteParams = Infer<typeof LinearVignetteSchema>

// ============================================================
// Schema Map
// ============================================================

export const VignetteShapeSchemas = {
  ellipse: EllipseVignetteSchema,
  circle: CircleVignetteSchema,
  rectangle: RectVignetteSchema,
  linear: LinearVignetteSchema,
} as const

// ============================================================
// Config Types (discriminated union)
// ============================================================

interface VignetteConfigBase {
  enabled: boolean
  intensity: number
  softness: number
  color: [number, number, number, number]
}

export interface EllipseVignetteConfig extends VignetteConfigBase {
  shape: 'ellipse'
  radius: number
  centerX: number
  centerY: number
  aspectRatio: number
}

export interface CircleVignetteConfig extends VignetteConfigBase {
  shape: 'circle'
  radius: number
  centerX: number
  centerY: number
}

export interface RectVignetteConfig extends VignetteConfigBase {
  shape: 'rectangle'
  centerX: number
  centerY: number
  width: number
  height: number
  cornerRadius: number
}

export interface LinearVignetteConfig extends VignetteConfigBase {
  shape: 'linear'
  angle: number
  startOffset: number
  endOffset: number
}

export type VignetteConfig =
  | EllipseVignetteConfig
  | CircleVignetteConfig
  | RectVignetteConfig
  | LinearVignetteConfig

// ============================================================
// Default Factory
// ============================================================

export const createDefaultVignetteConfig = (): EllipseVignetteConfig => ({
  enabled: false,
  shape: 'ellipse',
  intensity: 0.5,
  softness: 0.4,
  color: [0, 0, 0, 1],
  radius: 0.8,
  centerX: 0.5,
  centerY: 0.5,
  aspectRatio: 1,
})

/**
 * Create vignette config with proper defaults for a given shape
 * Preserves common properties (enabled, intensity, softness, color) from existing config
 */
export function createVignetteConfigForShape(
  shape: VignetteShape,
  existing?: Partial<VignetteConfig>
): VignetteConfig {
  const base = {
    enabled: existing?.enabled ?? false,
    intensity: existing?.intensity ?? 0.5,
    softness: existing?.softness ?? 0.4,
    color: existing?.color ?? [0, 0, 0, 1] as [number, number, number, number],
  }

  switch (shape) {
    case 'ellipse':
      return {
        ...base,
        shape: 'ellipse',
        radius: 0.8,
        centerX: 0.5,
        centerY: 0.5,
        aspectRatio: 1,
      }
    case 'circle':
      return {
        ...base,
        shape: 'circle',
        radius: 0.8,
        centerX: 0.5,
        centerY: 0.5,
      }
    case 'rectangle':
      return {
        ...base,
        shape: 'rectangle',
        centerX: 0.5,
        centerY: 0.5,
        width: 0.8,
        height: 0.6,
        cornerRadius: 0,
      }
    case 'linear':
      return {
        ...base,
        shape: 'linear',
        angle: 0,
        startOffset: 0.3,
        endOffset: 0.7,
      }
  }
}

