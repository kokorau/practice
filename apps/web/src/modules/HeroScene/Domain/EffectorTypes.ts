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
import type { EffectModifier, MaskModifier, ClipMaskConfig } from './Modifier'

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
 * Effector modifier - union of effect and mask modifiers
 *
 * This is the unified modifier type that can represent
 * any visual transformation applied to a layer.
 */
export type EffectorModifier = EffectModifier | MaskModifier

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
  /** Create default mask config */
  createDefaultConfig: () => ClipMaskConfig
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
 * @returns Appropriate modifier (EffectModifier or MaskModifier)
 */
export function createEffectorModifier(type: EffectorType): EffectorModifier {
  if (type === 'mask') {
    return {
      type: 'mask',
      enabled: true,
      config: {
        shape: 'circle',
        shapeParams: { type: 'circle', centerX: 0.5, centerY: 0.5, radius: 0.3 },
        invert: false,
        feather: 0,
      },
    }
  }
  // For effects, return placeholder (actual config is in effectManager)
  return {
    type: 'effect',
    hasEffect: true,
  }
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
