/**
 * Modifier Type Definitions
 *
 * Unified abstraction for effects and masks that can be applied to layers.
 * Modifiers transform layer content in a pipeline:
 * - Effects: Visual transformations (vignette, halftone, etc.)
 * - Masks: Clipping operations (shapes that define visible regions)
 */

import type { LayerEffectConfig } from './EffectSchema'

// ============================================================
// ClipMaskConfig type (inline to avoid circular import)
// ============================================================

/**
 * Mask shape type
 */
export type ClipMaskShape = 'circle' | 'rect' | 'blob' | 'perlin' | 'image'

/**
 * Mask shape parameters (simplified for modifier usage)
 */
export interface ClipMaskShapeParams {
  type: ClipMaskShape
  [key: string]: unknown
}

/**
 * Clip mask configuration
 */
export interface ClipMaskConfig {
  shape: ClipMaskShape
  shapeParams: ClipMaskShapeParams
  invert: boolean
  feather: number
  surface?: unknown
}

// ============================================================
// Effect Modifier
// ============================================================

/**
 * Effect modifier configuration.
 * Applies visual effects to a layer or group.
 */
export interface EffectModifier {
  type: 'effect'
  /** Whether this modifier is enabled */
  enabled: boolean
  /** Effect configuration */
  config: LayerEffectConfig
}

// ============================================================
// Mask Modifier
// ============================================================

/**
 * Mask modifier configuration.
 * Clips layer content using a shape.
 */
export interface MaskModifier {
  type: 'mask'
  /** Whether this modifier is enabled */
  enabled: boolean
  /** Mask configuration */
  config: ClipMaskConfig
}

// ============================================================
// Modifier Union Type
// ============================================================

/**
 * Modifier type union.
 * A modifier can be either an effect or a mask.
 */
export type Modifier = EffectModifier | MaskModifier

// ============================================================
// Factory Functions
// ============================================================

import { createDefaultEffectConfig } from './EffectSchema'

/**
 * Create default shape params for a given shape type
 */
const createDefaultShapeParams = (shape: ClipMaskShape): ClipMaskShapeParams => {
  switch (shape) {
    case 'circle':
      return { type: 'circle', centerX: 0.5, centerY: 0.5, radius: 0.3 }
    case 'rect':
      return { type: 'rect', centerX: 0.5, centerY: 0.5, width: 0.6, height: 0.4, cornerRadius: [0, 0, 0, 0] }
    case 'blob':
      return { type: 'blob', centerX: 0.5, centerY: 0.5, baseRadius: 0.3, amplitude: 0.1, octaves: 3, seed: 42 }
    case 'perlin':
      return { type: 'perlin', scale: 4, octaves: 4, threshold: 0.5, seed: 42 }
    case 'image':
      return { type: 'image', source: '' }
  }
}

/**
 * Create a default clip mask config
 */
const createDefaultClipMaskConfig = (
  shape: ClipMaskShape = 'circle',
  options?: Partial<ClipMaskConfig>
): ClipMaskConfig => ({
  shape,
  shapeParams: createDefaultShapeParams(shape),
  invert: false,
  feather: 0,
  ...options,
})

/**
 * Create a default effect modifier
 */
export const createEffectModifier = (
  config?: Partial<LayerEffectConfig>
): EffectModifier => ({
  type: 'effect',
  enabled: true,
  config: {
    ...createDefaultEffectConfig(),
    ...config,
  },
})

/**
 * Create a default mask modifier
 */
export const createMaskModifier = (
  config?: Partial<ClipMaskConfig>
): MaskModifier => ({
  type: 'mask',
  enabled: true,
  config: createDefaultClipMaskConfig(config?.shape ?? 'circle', config),
})

// ============================================================
// Utility Functions
// ============================================================

/**
 * Check if modifier is an effect
 */
export const isEffectModifier = (modifier: Modifier): modifier is EffectModifier =>
  modifier.type === 'effect'

/**
 * Check if modifier is a mask
 */
export const isMaskModifier = (modifier: Modifier): modifier is MaskModifier =>
  modifier.type === 'mask'

/**
 * Get enabled effects from modifier list
 */
export const getEnabledEffects = (modifiers: Modifier[]): EffectModifier[] =>
  modifiers.filter((m): m is EffectModifier => isEffectModifier(m) && m.enabled)

/**
 * Get enabled masks from modifier list
 */
export const getEnabledMasks = (modifiers: Modifier[]): MaskModifier[] =>
  modifiers.filter((m): m is MaskModifier => isMaskModifier(m) && m.enabled)

// ============================================================
// Legacy Aliases (for backward compatibility)
// ============================================================

/** @deprecated Use EffectModifier instead */
export type EffectProcessor = EffectModifier
/** @deprecated Use MaskModifier instead */
export type MaskProcessor = MaskModifier
/** @deprecated Use Modifier instead */
export type Processor = Modifier
/** @deprecated Use createEffectModifier instead */
export const createEffectProcessor = createEffectModifier
/** @deprecated Use createMaskModifier instead */
export const createMaskProcessor = createMaskModifier
/** @deprecated Use isEffectModifier instead */
export const isEffectProcessor = isEffectModifier
/** @deprecated Use isMaskModifier instead */
export const isMaskProcessor = isMaskModifier
