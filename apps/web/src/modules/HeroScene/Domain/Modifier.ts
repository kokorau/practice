/**
 * Modifier Type Definitions
 *
 * Modifiers are visual transformations (effects) that can be applied to layers.
 *
 * Note: Masks are now handled as MaskNode (SceneNode) in LayerNode.ts
 * following Figma-style architecture where masks are sibling nodes.
 *
 * @see LayerNode.ts for MaskNode definition
 */

import type { LayerEffectConfig } from './EffectSchema'
import { createDefaultEffectConfig } from './EffectSchema'

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
// Modifier Type (Effect only - masks are now MaskNode)
// ============================================================

/**
 * Modifier type.
 * Now only supports effects. Masks are handled as MaskNode in the scene tree.
 */
export type Modifier = EffectModifier

// ============================================================
// Factory Functions
// ============================================================

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

// ============================================================
// Utility Functions
// ============================================================

/**
 * Check if modifier is an effect
 */
export const isEffectModifier = (modifier: Modifier): modifier is EffectModifier =>
  modifier.type === 'effect'

/**
 * Get enabled effects from modifier list
 */
export const getEnabledEffects = (modifiers: Modifier[]): EffectModifier[] =>
  modifiers.filter((m): m is EffectModifier => isEffectModifier(m) && m.enabled)

// ============================================================
// Deprecated: Mask Modifier (use MaskNode instead)
// ============================================================

/**
 * @deprecated Mask shape type - use MaskShape from LayerNode.ts instead
 */
export type ClipMaskShape = 'circle' | 'rect' | 'blob' | 'perlin' | 'image'

/**
 * @deprecated Mask shape parameters - masks are now MaskNode
 */
export interface ClipMaskShapeParams {
  type: ClipMaskShape
  [key: string]: unknown
}

/**
 * @deprecated Clip mask configuration - masks are now MaskNode
 */
export interface ClipMaskConfig {
  shape: ClipMaskShape
  shapeParams: ClipMaskShapeParams
  invert: boolean
  feather: number
  surface?: unknown
}

/**
 * @deprecated Use MaskNode from LayerNode.ts instead
 */
export interface MaskModifier {
  type: 'mask'
  enabled: boolean
  config: ClipMaskConfig
}

/**
 * @deprecated Use createMaskNode from LayerNode.ts instead
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
 * @deprecated Use createMaskNode from LayerNode.ts instead
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
 * @deprecated Use createMaskNode from LayerNode.ts instead
 */
export const createMaskModifier = (
  config?: Partial<ClipMaskConfig>
): MaskModifier => ({
  type: 'mask',
  enabled: true,
  config: createDefaultClipMaskConfig(config?.shape ?? 'circle', config),
})

/**
 * @deprecated Masks are now MaskNode, not modifiers
 */
export const isMaskModifier = (modifier: { type: string }): modifier is MaskModifier =>
  modifier.type === 'mask'

/**
 * @deprecated Use MaskNode filtering instead
 */
export const getEnabledMasks = (modifiers: Array<{ type: string; enabled: boolean }>): MaskModifier[] =>
  modifiers.filter((m): m is MaskModifier => isMaskModifier(m) && m.enabled)

// ============================================================
// Legacy Aliases (for backward compatibility)
// ============================================================

/** @deprecated Use EffectModifier instead */
export type EffectProcessor = EffectModifier
/** @deprecated Use MaskNode from LayerNode.ts instead */
export type MaskProcessor = MaskModifier
/** @deprecated Use Modifier instead */
export type Processor = EffectModifier | MaskModifier
/** @deprecated Use createEffectModifier instead */
export const createEffectProcessor = createEffectModifier
/** @deprecated Use createMaskNode from LayerNode.ts instead */
export const createMaskProcessor = createMaskModifier
/** @deprecated Use isEffectModifier instead */
export const isEffectProcessor = isEffectModifier
/** @deprecated Use isMaskNode from LayerNode.ts instead */
export const isMaskProcessor = isMaskModifier
