/**
 * Processor Type Definitions
 *
 * Unified abstraction for effects and masks that can be applied to layers.
 * Processors transform layer content in a pipeline:
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
 * Mask shape parameters (simplified for processor usage)
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
// Effect Processor
// ============================================================

/**
 * Effect processor configuration.
 * Applies visual effects to a layer or group.
 */
export interface EffectProcessor {
  type: 'effect'
  /** Whether this processor is enabled */
  enabled: boolean
  /** Effect configuration */
  config: LayerEffectConfig
}

// ============================================================
// Mask Processor
// ============================================================

/**
 * Mask processor configuration.
 * Clips layer content using a shape.
 */
export interface MaskProcessor {
  type: 'mask'
  /** Whether this processor is enabled */
  enabled: boolean
  /** Mask configuration */
  config: ClipMaskConfig
}

// ============================================================
// Processor Union Type
// ============================================================

/**
 * Processor type union.
 * A processor can be either an effect or a mask.
 */
export type Processor = EffectProcessor | MaskProcessor

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
 * Create a default effect processor
 */
export const createEffectProcessor = (
  config?: Partial<LayerEffectConfig>
): EffectProcessor => ({
  type: 'effect',
  enabled: true,
  config: {
    ...createDefaultEffectConfig(),
    ...config,
  },
})

/**
 * Create a default mask processor
 */
export const createMaskProcessor = (
  config?: Partial<ClipMaskConfig>
): MaskProcessor => ({
  type: 'mask',
  enabled: true,
  config: createDefaultClipMaskConfig(config?.shape ?? 'circle', config),
})

// ============================================================
// Utility Functions
// ============================================================

/**
 * Check if processor is an effect
 */
export const isEffectProcessor = (processor: Processor): processor is EffectProcessor =>
  processor.type === 'effect'

/**
 * Check if processor is a mask
 */
export const isMaskProcessor = (processor: Processor): processor is MaskProcessor =>
  processor.type === 'mask'

/**
 * Get enabled effects from processor list
 */
export const getEnabledEffects = (processors: Processor[]): EffectProcessor[] =>
  processors.filter((p): p is EffectProcessor => isEffectProcessor(p) && p.enabled)

/**
 * Get enabled masks from processor list
 */
export const getEnabledMasks = (processors: Processor[]): MaskProcessor[] =>
  processors.filter((p): p is MaskProcessor => isMaskProcessor(p) && p.enabled)
