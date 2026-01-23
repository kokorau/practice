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
  type VignetteShape,
  type VignetteConfig,
  type EllipseVignetteConfig,
  type CircleVignetteConfig,
  type RectVignetteConfig,
  type LinearVignetteConfig,
} from './VignetteSchema'
import { createDefaultVignetteConfig as createDefaultVignetteShapeConfigInternal, type VignetteConfig } from './VignetteSchema'

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
// Pixelate Effect Schema
// ============================================================

export const PixelateEffectSchema = defineSchema({
  enabled: boolean({ label: 'Enabled', default: false }),
  blockSize: number({ label: 'Block Size', min: 4, max: 64, default: 16 }),
})

export type PixelateEffectConfig = Infer<typeof PixelateEffectSchema>

// ============================================================
// Hexagon Mosaic Effect Schema
// ============================================================

export const HexagonMosaicEffectSchema = defineSchema({
  enabled: boolean({ label: 'Enabled', default: false }),
  cellSize: number({ label: 'Cell Size', min: 8, max: 80, default: 24 }),
})

export type HexagonMosaicEffectConfig = Infer<typeof HexagonMosaicEffectSchema>

// ============================================================
// Voronoi Mosaic Effect Schema
// ============================================================

export const VoronoiMosaicEffectSchema = defineSchema({
  enabled: boolean({ label: 'Enabled', default: false }),
  cellCount: number({ label: 'Cell Count', min: 4, max: 32, default: 12 }),
  seed: number({ label: 'Seed', min: 0, max: 1000, default: 0 }),
  showEdges: boolean({ label: 'Show Edges', default: false }),
  edgeWidth: number({ label: 'Edge Width', min: 1, max: 8, default: 2 }),
})

export type VoronoiMosaicEffectConfig = Infer<typeof VoronoiMosaicEffectSchema>

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
  pixelate: PixelateEffectSchema,
  hexagonMosaic: HexagonMosaicEffectSchema,
  voronoiMosaic: VoronoiMosaicEffectSchema,
} as const

export type LayerEffectSchemaMap = typeof LayerEffectSchemas

/** Layer effect config (inferred from schemas) */
export interface LayerEffectConfig {
  vignette: VignetteConfig
  chromaticAberration: ChromaticAberrationEffectConfig
  dotHalftone: DotHalftoneEffectConfig
  lineHalftone: LineHalftoneEffectConfig
  blur: BlurEffectConfig
  pixelate: PixelateEffectConfig
  hexagonMosaic: HexagonMosaicEffectConfig
  voronoiMosaic: VoronoiMosaicEffectConfig
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
export const createDefaultBlurConfig = (): BlurEffectConfig =>
  getDefaults(BlurEffectSchema)

/** Create default pixelate effect config */
export const createDefaultPixelateConfig = (): PixelateEffectConfig =>
  getDefaults(PixelateEffectSchema)

/** Create default hexagon mosaic effect config */
export const createDefaultHexagonMosaicConfig = (): HexagonMosaicEffectConfig =>
  getDefaults(HexagonMosaicEffectSchema)

/** Create default voronoi mosaic effect config */
export const createDefaultVoronoiMosaicConfig = (): VoronoiMosaicEffectConfig =>
  getDefaults(VoronoiMosaicEffectSchema)

/** Create default layer effect config */
export const createDefaultEffectConfig = (): LayerEffectConfig => ({
  vignette: createDefaultVignetteShapeConfigInternal(),
  chromaticAberration: createDefaultChromaticAberrationConfig(),
  dotHalftone: createDefaultDotHalftoneConfig(),
  lineHalftone: createDefaultLineHalftoneConfig(),
  blur: createDefaultBlurConfig(),
  pixelate: createDefaultPixelateConfig(),
  hexagonMosaic: createDefaultHexagonMosaicConfig(),
  voronoiMosaic: createDefaultVoronoiMosaicConfig(),
})

