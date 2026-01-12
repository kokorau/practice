/**
 * Effect Schema Definitions
 *
 * Schema-based effect configuration with UI metadata and validation.
 */

import {
  defineSchema,
  number,
  boolean,
  getDefaults,
  type Infer,
} from '@practice/schema'

// Re-export new vignette schemas and types
export {
  VignetteBaseSchema,
  VignetteShapeSchemas,
  EllipseVignetteSchema,
  CircleVignetteSchema,
  RectVignetteSchema,
  LinearVignetteSchema,
  VignetteShapeOptions,
  createDefaultVignetteConfig as createDefaultVignetteShapeConfig,
  migrateVignetteConfig,
  type VignetteShape,
  type VignetteConfig,
  type EllipseVignetteConfig,
  type CircleVignetteConfig,
  type RectVignetteConfig,
  type LinearVignetteConfig,
} from './VignetteSchema'
import { createDefaultVignetteConfig as createDefaultVignetteShapeConfigInternal, type VignetteConfig } from './VignetteSchema'

// Re-export new blur schemas and types
export {
  BlurBaseSchema,
  BlurMaskShapeSchemas,
  LinearBlurSchema,
  RadialBlurSchema,
  RectangularBlurSchema,
  BlurMaskShapeOptions,
  createDefaultBlurConfig as createDefaultBlurShapeConfig,
  createBlurConfigForShape,
  migrateBlurConfig,
  type BlurMaskShape,
  type BlurConfig,
  type NoneBlurConfig,
  type LinearBlurConfig,
  type RadialBlurConfig,
  type RectangularBlurConfig,
  type LinearBlurParams,
  type RadialBlurParams,
  type RectangularBlurParams,
} from './BlurSchema'
import { createDefaultBlurConfig as createDefaultBlurShapeConfigInternal, type BlurConfig } from './BlurSchema'

// ============================================================
// Vignette Effect Schema (Legacy - for backward compatibility)
// ============================================================

export const VignetteEffectSchema = defineSchema({
  enabled: boolean({ label: 'Enabled', default: false }),
  intensity: number({ label: 'Intensity', min: 0, max: 1, default: 0.5 }),
  radius: number({ label: 'Radius', min: 0.2, max: 1.5, default: 0.8 }),
  softness: number({ label: 'Softness', min: 0.1, max: 1, default: 0.4 }),
})

/** @deprecated Use VignetteConfig instead */
export type VignetteEffectConfig = Infer<typeof VignetteEffectSchema>

// ============================================================
// Chromatic Aberration Effect Schema
// ============================================================

export const ChromaticAberrationEffectSchema = defineSchema({
  enabled: boolean({ label: 'Enabled', default: false }),
  intensity: number({ label: 'Intensity', min: 0, max: 20, default: 3 }),
})

export type ChromaticAberrationEffectConfig = Infer<typeof ChromaticAberrationEffectSchema>

// ============================================================
// Dot Halftone Effect Schema
// ============================================================

export const DotHalftoneEffectSchema = defineSchema({
  enabled: boolean({ label: 'Enabled', default: false }),
  dotSize: number({ label: 'Dot Size', min: 2, max: 30, default: 8 }),
  spacing: number({ label: 'Spacing', min: 4, max: 60, default: 16 }),
  angle: number({ label: 'Angle', min: 0, max: 90, default: 45 }),
})

export type DotHalftoneEffectConfig = Infer<typeof DotHalftoneEffectSchema>

// ============================================================
// Line Halftone Effect Schema
// ============================================================

export const LineHalftoneEffectSchema = defineSchema({
  enabled: boolean({ label: 'Enabled', default: false }),
  lineWidth: number({ label: 'Line Width', min: 1, max: 20, default: 4 }),
  spacing: number({ label: 'Spacing', min: 4, max: 40, default: 12 }),
  angle: number({ label: 'Angle', min: 0, max: 180, default: 45 }),
})

export type LineHalftoneEffectConfig = Infer<typeof LineHalftoneEffectSchema>

// ============================================================
// Blur Effect Schema
// ============================================================

export const BlurEffectSchema = defineSchema({
  enabled: boolean({ label: 'Enabled', default: false }),
  radius: number({ label: 'Blur Radius', min: 1, max: 30, default: 8 }),
})

export type BlurEffectConfig = Infer<typeof BlurEffectSchema>

// ============================================================
// Layer Effect Schema (composite)
// ============================================================

/**
 * Combined effect schemas for a layer.
 * Each effect has its own schema for independent UI generation.
 */
export const LayerEffectSchemas = {
  vignette: VignetteEffectSchema,
  chromaticAberration: ChromaticAberrationEffectSchema,
  dotHalftone: DotHalftoneEffectSchema,
  lineHalftone: LineHalftoneEffectSchema,
  blur: BlurEffectSchema,
} as const

export type LayerEffectSchemaMap = typeof LayerEffectSchemas

/** Layer effect config (inferred from schemas) */
export interface LayerEffectConfig {
  vignette: VignetteConfig
  chromaticAberration: ChromaticAberrationEffectConfig
  dotHalftone: DotHalftoneEffectConfig
  lineHalftone: LineHalftoneEffectConfig
  blur: BlurConfig
}

// ============================================================
// Factory Functions
// ============================================================

/** Create default vignette effect config */
export const createDefaultVignetteConfig = (): VignetteEffectConfig =>
  getDefaults(VignetteEffectSchema)

/** Create default chromatic aberration effect config */
export const createDefaultChromaticAberrationConfig = (): ChromaticAberrationEffectConfig =>
  getDefaults(ChromaticAberrationEffectSchema)

/** Create default dot halftone effect config */
export const createDefaultDotHalftoneConfig = (): DotHalftoneEffectConfig =>
  getDefaults(DotHalftoneEffectSchema)

/** Create default line halftone effect config */
export const createDefaultLineHalftoneConfig = (): LineHalftoneEffectConfig =>
  getDefaults(LineHalftoneEffectSchema)

/** Create default blur effect config */
export const createDefaultBlurConfig = (): BlurConfig =>
  createDefaultBlurShapeConfigInternal()

/** Create default layer effect config */
export const createDefaultEffectConfig = (): LayerEffectConfig => ({
  vignette: createDefaultVignetteShapeConfigInternal(),
  chromaticAberration: createDefaultChromaticAberrationConfig(),
  dotHalftone: createDefaultDotHalftoneConfig(),
  lineHalftone: createDefaultLineHalftoneConfig(),
  blur: createDefaultBlurShapeConfigInternal(),
})

// ============================================================
// Legacy Aliases (for backward compatibility during migration)
// ============================================================

/** @deprecated Use VignetteEffectSchema instead */
export const VignetteFilterSchema = VignetteEffectSchema
/** @deprecated Use ChromaticAberrationEffectSchema instead */
export const ChromaticAberrationFilterSchema = ChromaticAberrationEffectSchema
/** @deprecated Use DotHalftoneEffectSchema instead */
export const DotHalftoneFilterSchema = DotHalftoneEffectSchema
/** @deprecated Use LineHalftoneEffectSchema instead */
export const LineHalftoneFilterSchema = LineHalftoneEffectSchema
/** @deprecated Use LayerEffectSchemas instead */
export const LayerFilterSchemas = LayerEffectSchemas

/** @deprecated Use VignetteEffectConfig instead */
export type VignetteFilterConfig = VignetteEffectConfig
/** @deprecated Use ChromaticAberrationEffectConfig instead */
export type ChromaticAberrationFilterConfig = ChromaticAberrationEffectConfig
/** @deprecated Use DotHalftoneEffectConfig instead */
export type DotHalftoneFilterConfig = DotHalftoneEffectConfig
/** @deprecated Use LineHalftoneEffectConfig instead */
export type LineHalftoneFilterConfig = LineHalftoneEffectConfig
/** @deprecated Use LayerEffectConfig instead */
export type LayerFilterConfig = LayerEffectConfig
/** @deprecated Use LayerEffectSchemaMap instead */
export type LayerFilterSchemaMap = LayerEffectSchemaMap

/** @deprecated Use createDefaultEffectConfig instead */
export const createDefaultFilterConfig = createDefaultEffectConfig
