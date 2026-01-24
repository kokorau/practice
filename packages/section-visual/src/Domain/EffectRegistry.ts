/**
 * Effect Registry
 *
 * Centralized registry for all effect definitions.
 * Adding a new effect requires only:
 * 1. Define shader in packages/texture/src/shaders/
 * 2. Add entry to EFFECT_REGISTRY here
 */

import type { ObjectSchema } from '@practice/schema'
import type { Viewport } from '@practice/texture'
import {
  // Vignette shape variants
  ellipseVignetteShader,
  createEllipseVignetteUniforms,
  ELLIPSE_VIGNETTE_BUFFER_SIZE,
  circleVignetteShader,
  createCircleVignetteUniforms,
  CIRCLE_VIGNETTE_BUFFER_SIZE,
  rectVignetteShader,
  createRectVignetteUniforms,
  RECT_VIGNETTE_BUFFER_SIZE,
  linearVignetteShader,
  createLinearVignetteUniforms,
  LINEAR_VIGNETTE_BUFFER_SIZE,
  // Other effects
  chromaticAberrationShader,
  createChromaticAberrationUniforms,
  CHROMATIC_ABERRATION_BUFFER_SIZE,
  dotHalftoneShader,
  createDotHalftoneUniforms,
  DOT_HALFTONE_BUFFER_SIZE,
  lineHalftoneShader,
  createLineHalftoneUniforms,
  LINE_HALFTONE_BUFFER_SIZE,
  blurShader,
  createBlurUniforms,
  BLUR_BUFFER_SIZE,
  // Mosaic effects
  pixelateShader,
  createPixelateUniforms,
  PIXELATE_BUFFER_SIZE,
  hexagonMosaicShader,
  createHexagonMosaicUniforms,
  HEXAGON_MOSAIC_BUFFER_SIZE,
  voronoiMosaicShader,
  createVoronoiMosaicUniforms,
  VORONOI_MOSAIC_BUFFER_SIZE,
} from '@practice/texture/filters'

import {
  ChromaticAberrationEffectSchema,
  DotHalftoneEffectSchema,
  LineHalftoneEffectSchema,
  BlurEffectSchema,
  PixelateEffectSchema,
  HexagonMosaicEffectSchema,
  VoronoiMosaicEffectSchema,
  createDefaultChromaticAberrationConfig,
  createDefaultDotHalftoneConfig,
  createDefaultLineHalftoneConfig,
  createDefaultBlurConfig,
  createDefaultPixelateConfig,
  createDefaultHexagonMosaicConfig,
  createDefaultVoronoiMosaicConfig,
  type ChromaticAberrationEffectConfig,
  type DotHalftoneEffectConfig,
  type LineHalftoneEffectConfig,
  type BlurEffectConfig,
  type PixelateEffectConfig,
  type HexagonMosaicEffectConfig,
  type VoronoiMosaicEffectConfig,
} from './EffectSchema'

import {
  VignetteBaseSchema,
  VignetteShapeSchemas,
  createDefaultVignetteConfig,
  type VignetteConfig,
  type VignetteShape,
} from './VignetteSchema'

// ============================================================
// Types
// ============================================================

/**
 * Shader specification for post-effect rendering
 */
export interface EffectShaderSpec {
  shader: string
  uniforms: ArrayBuffer
  bufferSize: number
}

/**
 * Scale helper for preview rendering
 */
function scaleValue(value: number, scale: number): number {
  return Math.max(1, Math.round(value * scale))
}

/**
 * Base effect definition (for standard effects)
 */
export interface EffectDefinition<TConfig> {
  /** Effect ID (matches registry key) */
  id: string
  /** Display name for UI */
  displayName: string
  /** Schema definition for UI generation */
  schema: ObjectSchema
  /** Create default config */
  createDefaultConfig: () => TConfig
  /** Create shader spec from config */
  createShaderSpec: (config: TConfig, viewport: Viewport, scale: number) => EffectShaderSpec | null
  /** Whether this effect is special (like vignette with multiple shapes) */
  isSpecial?: boolean
}

/**
 * Vignette-specific definition with shape support
 */
export interface VignetteEffectDefinition extends EffectDefinition<VignetteConfig> {
  isSpecial: true
  /** Shape-specific schemas */
  shapeSchemas: typeof VignetteShapeSchemas
  /** Create config for specific shape */
  createConfigForShape: (shape: VignetteShape, existing?: Partial<VignetteConfig>) => VignetteConfig
}

// ============================================================
// Shader Spec Creators
// ============================================================

function createVignetteShaderSpec(
  config: VignetteConfig,
  viewport: Viewport,
  _scale: number
): EffectShaderSpec {
  const color = config.color ?? [0, 0, 0, 1]

  switch (config.shape) {
    case 'circle':
      return {
        shader: circleVignetteShader,
        uniforms: createCircleVignetteUniforms(
          {
            color,
            intensity: config.intensity,
            radius: config.radius,
            softness: config.softness,
            centerX: config.centerX,
            centerY: config.centerY,
          },
          viewport
        ),
        bufferSize: CIRCLE_VIGNETTE_BUFFER_SIZE,
      }

    case 'rectangle':
      return {
        shader: rectVignetteShader,
        uniforms: createRectVignetteUniforms(
          {
            color,
            intensity: config.intensity,
            softness: config.softness,
            centerX: config.centerX,
            centerY: config.centerY,
            width: config.width,
            height: config.height,
            cornerRadius: config.cornerRadius,
          },
          viewport
        ),
        bufferSize: RECT_VIGNETTE_BUFFER_SIZE,
      }

    case 'linear':
      return {
        shader: linearVignetteShader,
        uniforms: createLinearVignetteUniforms(
          {
            color,
            intensity: config.intensity,
            angle: config.angle,
            startOffset: config.startOffset,
            endOffset: config.endOffset,
          },
          viewport
        ),
        bufferSize: LINEAR_VIGNETTE_BUFFER_SIZE,
      }

    case 'ellipse':
    default:
      return {
        shader: ellipseVignetteShader,
        uniforms: createEllipseVignetteUniforms(
          {
            color,
            intensity: config.intensity,
            radius: config.radius,
            softness: config.softness,
            centerX: config.centerX,
            centerY: config.centerY,
            aspectRatio: config.aspectRatio ?? viewport.width / viewport.height,
          },
          viewport
        ),
        bufferSize: ELLIPSE_VIGNETTE_BUFFER_SIZE,
      }
  }
}

function createChromaticAberrationShaderSpec(
  config: ChromaticAberrationEffectConfig,
  viewport: Viewport,
  _scale: number
): EffectShaderSpec {
  return {
    shader: chromaticAberrationShader,
    uniforms: createChromaticAberrationUniforms(
      { intensity: config.intensity, angle: 0 },
      viewport
    ),
    bufferSize: CHROMATIC_ABERRATION_BUFFER_SIZE,
  }
}

function createDotHalftoneShaderSpec(
  config: DotHalftoneEffectConfig,
  viewport: Viewport,
  scale: number
): EffectShaderSpec {
  return {
    shader: dotHalftoneShader,
    uniforms: createDotHalftoneUniforms(
      {
        dotSize: scaleValue(config.dotSize, scale),
        spacing: scaleValue(config.spacing, scale),
        angle: config.angle,
        aberration: scaleValue(config.aberration, scale),
      },
      viewport
    ),
    bufferSize: DOT_HALFTONE_BUFFER_SIZE,
  }
}

function createLineHalftoneShaderSpec(
  config: LineHalftoneEffectConfig,
  viewport: Viewport,
  scale: number
): EffectShaderSpec {
  return {
    shader: lineHalftoneShader,
    uniforms: createLineHalftoneUniforms(
      {
        lineWidth: scaleValue(config.lineWidth, scale),
        spacing: scaleValue(config.spacing, scale),
        angle: config.angle,
        aberration: scaleValue(config.aberration, scale),
      },
      viewport
    ),
    bufferSize: LINE_HALFTONE_BUFFER_SIZE,
  }
}

function createBlurShaderSpec(
  config: BlurEffectConfig,
  viewport: Viewport,
  scale: number
): EffectShaderSpec {
  return {
    shader: blurShader,
    uniforms: createBlurUniforms({ radius: scaleValue(config.radius, scale) }, viewport),
    bufferSize: BLUR_BUFFER_SIZE,
  }
}

function createPixelateShaderSpec(
  config: PixelateEffectConfig,
  viewport: Viewport,
  scale: number
): EffectShaderSpec {
  return {
    shader: pixelateShader,
    uniforms: createPixelateUniforms(
      {
        blockSize: scaleValue(config.blockSize, scale),
        noiseScale: config.noiseScale,
      },
      viewport
    ),
    bufferSize: PIXELATE_BUFFER_SIZE,
  }
}

function createHexagonMosaicShaderSpec(
  config: HexagonMosaicEffectConfig,
  viewport: Viewport,
  scale: number
): EffectShaderSpec {
  return {
    shader: hexagonMosaicShader,
    uniforms: createHexagonMosaicUniforms(
      {
        cellSize: scaleValue(config.cellSize, scale),
        noiseScale: config.noiseScale,
      },
      viewport
    ),
    bufferSize: HEXAGON_MOSAIC_BUFFER_SIZE,
  }
}

function createVoronoiMosaicShaderSpec(
  config: VoronoiMosaicEffectConfig,
  viewport: Viewport,
  _scale: number
): EffectShaderSpec {
  return {
    shader: voronoiMosaicShader,
    uniforms: createVoronoiMosaicUniforms(
      {
        cellCount: config.cellCount,
        seed: config.seed,
        showEdges: config.showEdges ? 1 : 0,
        edgeWidth: config.edgeWidth,
        noiseScale: config.noiseScale,
      },
      viewport
    ),
    bufferSize: VORONOI_MOSAIC_BUFFER_SIZE,
  }
}

// ============================================================
// Effect Registry
// ============================================================

// Import createVignetteConfigForShape for vignette definition
import { createVignetteConfigForShape } from './VignetteSchema'

/**
 * Effect Registry
 *
 * Central registry of all available effects.
 * To add a new effect:
 * 1. Create shader in packages/texture/src/shaders/
 * 2. Add entry here with schema, default config, and shader spec creator
 */
export const EFFECT_REGISTRY = {
  vignette: {
    id: 'vignette',
    displayName: 'Vignette',
    schema: VignetteBaseSchema,
    shapeSchemas: VignetteShapeSchemas,
    createDefaultConfig: createDefaultVignetteConfig,
    createConfigForShape: createVignetteConfigForShape,
    createShaderSpec: createVignetteShaderSpec,
    isSpecial: true,
  } satisfies VignetteEffectDefinition,

  chromaticAberration: {
    id: 'chromaticAberration',
    displayName: 'Chromatic Aberration',
    schema: ChromaticAberrationEffectSchema,
    createDefaultConfig: createDefaultChromaticAberrationConfig,
    createShaderSpec: createChromaticAberrationShaderSpec,
  } satisfies EffectDefinition<ChromaticAberrationEffectConfig>,

  dotHalftone: {
    id: 'dotHalftone',
    displayName: 'Dot Halftone',
    schema: DotHalftoneEffectSchema,
    createDefaultConfig: createDefaultDotHalftoneConfig,
    createShaderSpec: createDotHalftoneShaderSpec,
  } satisfies EffectDefinition<DotHalftoneEffectConfig>,

  lineHalftone: {
    id: 'lineHalftone',
    displayName: 'Line Halftone',
    schema: LineHalftoneEffectSchema,
    createDefaultConfig: createDefaultLineHalftoneConfig,
    createShaderSpec: createLineHalftoneShaderSpec,
  } satisfies EffectDefinition<LineHalftoneEffectConfig>,

  blur: {
    id: 'blur',
    displayName: 'Blur',
    schema: BlurEffectSchema,
    createDefaultConfig: createDefaultBlurConfig,
    createShaderSpec: createBlurShaderSpec,
  } satisfies EffectDefinition<BlurEffectConfig>,

  pixelate: {
    id: 'pixelate',
    displayName: 'Pixelate',
    schema: PixelateEffectSchema,
    createDefaultConfig: createDefaultPixelateConfig,
    createShaderSpec: createPixelateShaderSpec,
  } satisfies EffectDefinition<PixelateEffectConfig>,

  hexagonMosaic: {
    id: 'hexagonMosaic',
    displayName: 'Hexagon Mosaic',
    schema: HexagonMosaicEffectSchema,
    createDefaultConfig: createDefaultHexagonMosaicConfig,
    createShaderSpec: createHexagonMosaicShaderSpec,
  } satisfies EffectDefinition<HexagonMosaicEffectConfig>,

  voronoiMosaic: {
    id: 'voronoiMosaic',
    displayName: 'Voronoi Mosaic',
    schema: VoronoiMosaicEffectSchema,
    createDefaultConfig: createDefaultVoronoiMosaicConfig,
    createShaderSpec: createVoronoiMosaicShaderSpec,
  } satisfies EffectDefinition<VoronoiMosaicEffectConfig>,
} as const

// ============================================================
// Type Helpers
// ============================================================

/** All effect type keys */
export type EffectType = keyof typeof EFFECT_REGISTRY

/** Filter type (includes 'void' for no effect) */
export type FilterType = 'void' | EffectType

/** Array of all effect types */
export const EFFECT_TYPES = Object.keys(EFFECT_REGISTRY) as EffectType[]

/** Get effect definition by type */
export function getEffectDefinition<T extends EffectType>(type: T): (typeof EFFECT_REGISTRY)[T] {
  return EFFECT_REGISTRY[type]
}

/** Check if effect type is valid */
export function isValidEffectType(type: string): type is EffectType {
  return type in EFFECT_REGISTRY
}
