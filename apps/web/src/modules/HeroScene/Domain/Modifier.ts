/**
 * Modifier Type Definitions
 *
 * Modifiers are visual transformations (effects, masks) that can be applied to layers.
 */

// ============================================================
// Effect Modifier (Placeholder)
// ============================================================

/**
 * Effect modifier placeholder.
 * Indicates that a layer has effects attached.
 * Actual effect data is managed by useEffectManager.
 *
 * @see useEffectManager for effect configuration
 */
export interface EffectModifier {
  type: 'effect'
  /** Indicates effects are attached to this layer */
  hasEffect: true
}

// ============================================================
// Mask Modifier
// ============================================================

/**
 * Mask shape type
 */
export type ClipMaskShape = 'circle' | 'rect' | 'blob' | 'perlin' | 'image'

/**
 * Mask shape parameters
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

/**
 * Mask modifier for layer-based masking
 */
export interface MaskModifier {
  type: 'mask'
  enabled: boolean
  config: ClipMaskConfig
}

// ============================================================
// Modifier Type
// ============================================================

/**
 * Modifier type union
 */
export type Modifier = EffectModifier | MaskModifier

// ============================================================
// Factory Functions
// ============================================================

/**
 * Create an effect placeholder.
 * This indicates that a layer has effects attached.
 * Actual effect configuration is managed by useEffectManager.
 */
export const createEffectPlaceholder = (): EffectModifier => ({
  type: 'effect',
  hasEffect: true,
})

/**
 * Create default shape params for a mask shape
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
 * Create default clip mask config
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
 * Create a mask modifier
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
export const isMaskModifier = (modifier: { type: string }): modifier is MaskModifier =>
  modifier.type === 'mask'

/**
 * Get effect placeholders from modifier list
 */
export const getEffectPlaceholders = (modifiers: Modifier[]): EffectModifier[] =>
  modifiers.filter((m): m is EffectModifier => isEffectModifier(m))

/**
 * Get enabled mask modifiers from modifier list
 */
export const getEnabledMasks = (modifiers: Array<{ type: string; enabled: boolean }>): MaskModifier[] =>
  modifiers.filter((m): m is MaskModifier => isMaskModifier(m) && m.enabled)

