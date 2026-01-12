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
} from '@practice/texture/filters'

import {
  ChromaticAberrationEffectSchema,
  DotHalftoneEffectSchema,
  LineHalftoneEffectSchema,
  BlurEffectSchema,
  createDefaultChromaticAberrationConfig,
  createDefaultDotHalftoneConfig,
  createDefaultLineHalftoneConfig,
  createDefaultBlurConfig,
  type ChromaticAberrationEffectConfig,
  type DotHalftoneEffectConfig,
  type LineHalftoneEffectConfig,
  type BlurEffectConfig,
} from './EffectSchema'

import {
  VignetteBaseSchema,
  VignetteShapeSchemas,
  createDefaultVignetteConfig,
  migrateVignetteConfig,
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
  config: VignetteConfig | { enabled: boolean; intensity: number; radius: number; softness: number },
  viewport: Viewport,
  _scale: number
): EffectShaderSpec {
  const vignetteConfig = migrateVignetteConfig(config as VignetteConfig)
  const color = vignetteConfig.color ?? [0, 0, 0, 1]

  switch (vignetteConfig.shape) {
    case 'circle':
      return {
        shader: circleVignetteShader,
        uniforms: createCircleVignetteUniforms(
          {
            color,
            intensity: vignetteConfig.intensity,
            radius: vignetteConfig.radius,
            softness: vignetteConfig.softness,
            centerX: vignetteConfig.centerX,
            centerY: vignetteConfig.centerY,
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
            intensity: vignetteConfig.intensity,
            softness: vignetteConfig.softness,
            centerX: vignetteConfig.centerX,
            centerY: vignetteConfig.centerY,
            width: vignetteConfig.width,
            height: vignetteConfig.height,
            cornerRadius: vignetteConfig.cornerRadius,
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
            intensity: vignetteConfig.intensity,
            angle: vignetteConfig.angle,
            startOffset: vignetteConfig.startOffset,
            endOffset: vignetteConfig.endOffset,
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
            intensity: vignetteConfig.intensity,
            radius: vignetteConfig.radius,
            softness: vignetteConfig.softness,
            centerX: vignetteConfig.centerX,
            centerY: vignetteConfig.centerY,
            aspectRatio: vignetteConfig.aspectRatio ?? viewport.width / viewport.height,
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
