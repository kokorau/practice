/**
 * Filter Schema Definitions
 *
 * Schema-based filter configuration with UI metadata and validation.
 */

import {
  defineSchema,
  number,
  boolean,
  getDefaults,
  type Infer,
} from '@practice/schema'

// ============================================================
// Vignette Filter Schema
// ============================================================

export const VignetteFilterSchema = defineSchema({
  enabled: boolean({ label: 'Enabled', default: false }),
  intensity: number({ label: 'Intensity', min: 0, max: 1, default: 0.5 }),
  radius: number({ label: 'Radius', min: 0.2, max: 1.5, default: 0.8 }),
  softness: number({ label: 'Softness', min: 0.1, max: 1, default: 0.4 }),
})

export type VignetteFilterConfig = Infer<typeof VignetteFilterSchema>

// ============================================================
// Chromatic Aberration Filter Schema
// ============================================================

export const ChromaticAberrationFilterSchema = defineSchema({
  enabled: boolean({ label: 'Enabled', default: false }),
  intensity: number({ label: 'Intensity', min: 0, max: 20, default: 3 }),
})

export type ChromaticAberrationFilterConfig = Infer<typeof ChromaticAberrationFilterSchema>

// ============================================================
// Dot Halftone Filter Schema
// ============================================================

export const DotHalftoneFilterSchema = defineSchema({
  enabled: boolean({ label: 'Enabled', default: false }),
  dotSize: number({ label: 'Dot Size', min: 2, max: 30, default: 8 }),
  spacing: number({ label: 'Spacing', min: 4, max: 60, default: 16 }),
  angle: number({ label: 'Angle', min: 0, max: 90, default: 45 }),
})

export type DotHalftoneFilterConfig = Infer<typeof DotHalftoneFilterSchema>

// ============================================================
// Layer Filter Schema (composite)
// ============================================================

/**
 * Combined filter schemas for a layer.
 * Each filter has its own schema for independent UI generation.
 */
export const LayerFilterSchemas = {
  vignette: VignetteFilterSchema,
  chromaticAberration: ChromaticAberrationFilterSchema,
  dotHalftone: DotHalftoneFilterSchema,
} as const

export type LayerFilterSchemaMap = typeof LayerFilterSchemas

/** Layer filter config (inferred from schemas) */
export interface LayerFilterConfig {
  vignette: VignetteFilterConfig
  chromaticAberration: ChromaticAberrationFilterConfig
  dotHalftone: DotHalftoneFilterConfig
}

// ============================================================
// Factory Functions
// ============================================================

/** Create default vignette filter config */
export const createDefaultVignetteConfig = (): VignetteFilterConfig =>
  getDefaults(VignetteFilterSchema)

/** Create default chromatic aberration filter config */
export const createDefaultChromaticAberrationConfig = (): ChromaticAberrationFilterConfig =>
  getDefaults(ChromaticAberrationFilterSchema)

/** Create default dot halftone filter config */
export const createDefaultDotHalftoneConfig = (): DotHalftoneFilterConfig =>
  getDefaults(DotHalftoneFilterSchema)

/** Create default layer filter config */
export const createDefaultFilterConfig = (): LayerFilterConfig => ({
  vignette: createDefaultVignetteConfig(),
  chromaticAberration: createDefaultChromaticAberrationConfig(),
  dotHalftone: createDefaultDotHalftoneConfig(),
})
