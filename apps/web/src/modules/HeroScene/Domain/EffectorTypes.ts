/**
 * Effector Type Definitions
 *
 * Unified type system for effects and masks.
 * An "Effector" is a visual transformation that can be applied to layers:
 * - Effects: Color/appearance modifications (vignette, blur, halftone, etc.)
 * - Masks: Visibility/transparency modifications via grayscale map
 *
 * This module provides the foundation for treating masks as a special type of effect.
 */

import type { EffectType } from './EffectRegistry'
import type { ProcessorConfig, EffectFilterConfig, MaskProcessorConfig } from './HeroViewConfig'
import {
  MaskShapeSchemas,
  MaskBaseSchema,
  MaskShapeOptions,
  createDefaultMaskConfig,
  createMaskConfigForShape,
  type MaskConfig,
} from './MaskSchema'

// ============================================================
// Effector Categories
// ============================================================

/**
 * Effector category - how the effector modifies the layer
 */
export type EffectorCategory =
  | 'color-modification'       // Effects that modify color/appearance
  | 'transparency-modification' // Masks that modify visibility via grayscale

// ============================================================
// Mask Shape Types
// ============================================================

/**
 * All available mask shape types
 * These define the shape/pattern of the grayscale map
 */
export type MaskShapeType =
  | 'circle'
  | 'rect'
  | 'blob'
  | 'perlin'
  | 'linearGradient'
  | 'radialGradient'
  | 'boxGradient'
  | 'image'

/**
 * Array of all mask shape types for iteration
 */
export const MASK_SHAPE_TYPES: MaskShapeType[] = [
  'circle',
  'rect',
  'blob',
  'perlin',
  'linearGradient',
  'radialGradient',
  'boxGradient',
  'image',
]

// ============================================================
// Effector Type (Unified)
// ============================================================

/**
 * Effector type - unifies effect types and mask
 *
 * This type represents all possible effectors:
 * - All standard effects (vignette, blur, chromaticAberration, etc.)
 * - Mask as a special effector type
 */
export type EffectorType = EffectType | 'mask'

/**
 * Unified filter type including void (no effector)
 */
export type UnifiedFilterType = 'void' | EffectorType

/**
 * Array of all effector types
 */
export const EFFECTOR_TYPES: EffectorType[] = [
  'vignette',
  'chromaticAberration',
  'dotHalftone',
  'lineHalftone',
  'blur',
  'mask',
]

// ============================================================
// Effector Modifier (Unified)
// ============================================================

/**
 * Effector modifier - union of effect and mask configs
 *
 * This is the unified modifier type that can represent
 * any visual transformation applied to a layer.
 */
export type EffectorModifier = ProcessorConfig

// ============================================================
// Type Guards
// ============================================================

/**
 * Check if effector type is an effect (color-modification)
 */
export function isEffectType(type: EffectorType): type is EffectType {
  return type !== 'mask'
}

/**
 * Check if effector type is a mask (transparency-modification)
 */
export function isMaskType(type: EffectorType): type is 'mask' {
  return type === 'mask'
}

/**
 * Check if a string is a valid effector type
 */
export function isValidEffectorType(type: string): type is EffectorType {
  return EFFECTOR_TYPES.includes(type as EffectorType)
}

/**
 * Check if a string is a valid mask shape type
 */
export function isValidMaskShapeType(type: string): type is MaskShapeType {
  return MASK_SHAPE_TYPES.includes(type as MaskShapeType)
}

// ============================================================
// Effector Category Mapping
// ============================================================

/**
 * Get the category of an effector type
 */
export function getEffectorCategory(type: EffectorType): EffectorCategory {
  return type === 'mask' ? 'transparency-modification' : 'color-modification'
}

// ============================================================
// Effector Definition Interface (for future EFFECTOR_REGISTRY)
// ============================================================

/**
 * Base interface for effector definitions
 *
 * This interface will be used to define effectors in EFFECTOR_REGISTRY
 * in the next phase of the refactoring.
 */
export interface BaseEffectorDefinition {
  /** Effector ID (matches registry key) */
  id: EffectorType
  /** Display name for UI */
  displayName: string
  /** Effector category */
  category: EffectorCategory
}

/**
 * Effect-specific definition
 * Extends base with schema, default config, and shader spec creator
 */
export interface EffectEffectorDefinition extends BaseEffectorDefinition {
  category: 'color-modification'
  // Additional properties will be added in phase 2
}

/**
 * Mask-specific definition
 * Extends base with shape types and grayscale pipeline config
 */
export interface MaskEffectorDefinition extends BaseEffectorDefinition {
  id: 'mask'
  category: 'transparency-modification'
  /** Available mask shapes */
  shapes: MaskShapeType[]
  /** Base schema (shared fields) */
  baseSchema: typeof MaskBaseSchema
  /** Shape-specific schemas */
  shapeSchemas: typeof MaskShapeSchemas
  /** Shape options for UI select */
  shapeOptions: typeof MaskShapeOptions
  /** Create default mask config */
  createDefaultConfig: () => MaskConfig
  /** Create config for specific shape */
  createConfigForShape: typeof createMaskConfigForShape
}

/**
 * Union of all effector definitions
 */
export type EffectorDefinition = EffectEffectorDefinition | MaskEffectorDefinition

// ============================================================
// Factory Functions
// ============================================================

/**
 * Create an effector modifier from type
 *
 * @param type - Effector type
 * @returns Appropriate modifier (EffectFilterConfig or MaskProcessorConfig)
 */
export function createEffectorModifier(type: EffectorType): EffectorModifier {
  if (type === 'mask') {
    return {
      type: 'mask',
      enabled: true,
      shape: { type: 'circle', centerX: 0.5, centerY: 0.5, radius: 0.3, cutout: false },
      invert: false,
      feather: 0,
    } as MaskProcessorConfig
  }
  // For effects, return a default EffectFilterConfig
  return {
    type: 'effect',
    enabled: true,
    config: {
      vignette: { enabled: false, shape: 'ellipse', intensity: 0.5, softness: 0.4, radius: 0.8, aspectRatio: 1, centerX: 0.5, centerY: 0.5, color: [0, 0, 0, 1] },
      chromaticAberration: { enabled: false, intensity: 3 },
      dotHalftone: { enabled: false, dotSize: 8, spacing: 16, angle: 45 },
      lineHalftone: { enabled: false, lineWidth: 4, spacing: 12, angle: 45 },
      blur: { enabled: false, radius: 8 },
    },
  } as EffectFilterConfig
}

// ============================================================
// Utility Functions
// ============================================================

/**
 * Get display name for effector type
 */
export function getEffectorDisplayName(type: EffectorType): string {
  const displayNames: Record<EffectorType, string> = {
    vignette: 'Vignette',
    chromaticAberration: 'Chromatic Aberration',
    dotHalftone: 'Dot Halftone',
    lineHalftone: 'Line Halftone',
    blur: 'Blur',
    pixelation: 'Pixelation',
    mask: 'Mask',
  }
  return displayNames[type]
}

/**
 * Get display name for mask shape type
 */
export function getMaskShapeDisplayName(shape: MaskShapeType): string {
  const displayNames: Record<MaskShapeType, string> = {
    circle: 'Circle',
    rect: 'Rectangle',
    blob: 'Blob',
    perlin: 'Perlin Noise',
    linearGradient: 'Linear Gradient',
    radialGradient: 'Radial Gradient',
    boxGradient: 'Box Gradient',
    image: 'Image',
  }
  return displayNames[shape]
}

// ============================================================
// Mask Effector Definition
// ============================================================

/**
 * Mask effector definition
 *
 * Defines the mask as an effector with shape-based configuration.
 * This is the single source of truth for mask shape schemas and factories.
 */
export const MASK_EFFECTOR_DEFINITION: MaskEffectorDefinition = {
  id: 'mask',
  displayName: 'Mask',
  category: 'transparency-modification',
  shapes: MASK_SHAPE_TYPES,
  baseSchema: MaskBaseSchema,
  shapeSchemas: MaskShapeSchemas,
  shapeOptions: MaskShapeOptions,
  createDefaultConfig: createDefaultMaskConfig,
  createConfigForShape: createMaskConfigForShape,
}

// ============================================================
// Effector Registry
// ============================================================

/**
 * Unified Effector Registry
 *
 * Central registry for both effects and masks.
 * This allows treating masks as a special type of effector
 * with a consistent interface for UI generation and config management.
 *
 * Note: Effect definitions are in EFFECT_REGISTRY (EffectRegistry.ts)
 * for backward compatibility. This registry adds mask support.
 */
export const EFFECTOR_REGISTRY = {
  mask: MASK_EFFECTOR_DEFINITION,
} as const

/**
 * Get effector definition by type
 */
export function getEffectorDefinition(type: 'mask'): MaskEffectorDefinition
export function getEffectorDefinition(type: EffectorType): MaskEffectorDefinition | undefined
export function getEffectorDefinition(type: EffectorType): MaskEffectorDefinition | undefined {
  if (type === 'mask') {
    return EFFECTOR_REGISTRY.mask
  }
  return undefined
}

/**
 * Check if effector is registered
 */
export function isRegisteredEffector(type: string): type is 'mask' {
  return type in EFFECTOR_REGISTRY
}

// ============================================================
// Re-exports from MaskSchema
// ============================================================

export {
  // Schemas
  MaskBaseSchema,
  MaskShapeSchemas,
  MaskShapeOptions,
  // Type exports
  type MaskShape,
  type MaskConfig,
  // Config type exports
  type CircleMaskConfig,
  type RectMaskConfig,
  type BlobMaskConfig,
  type PerlinMaskConfig,
  type LinearGradientMaskConfig,
  type RadialGradientMaskConfig,
  type BoxGradientMaskConfig,
  type BoxGradientCurve,
  // Param type exports
  type CircleMaskParams,
  type RectMaskParams,
  type BlobMaskParams,
  type PerlinMaskParams,
  type LinearGradientMaskParams,
  type RadialGradientMaskParams,
  type BoxGradientMaskParams,
  // Factory functions
  createDefaultMaskConfig,
  createMaskConfigForShape,
  // Type guards
  isCircleMaskConfig,
  isRectMaskConfig,
  isBlobMaskConfig,
  isPerlinMaskConfig,
  isLinearGradientMaskConfig,
  isRadialGradientMaskConfig,
  isBoxGradientMaskConfig,
  // Migration helpers
  type LegacyClipMaskShape,
  type LegacyClipMaskConfig,
  type LegacyMaskModifier,
  isSupportedMaskShape,
  migrateClipMaskConfig,
  migrateMaskModifier,
  toLegacyClipMaskConfig,
  toLegacyMaskModifier,
} from './MaskSchema'
