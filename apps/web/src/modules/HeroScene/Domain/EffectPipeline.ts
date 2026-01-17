/**
 * Effect Pipeline Types
 *
 * Composable effect pipeline where each effect is an independent (2D) → 2D transformation unit.
 * Effects are stored as an ordered array - presence in array means enabled, order determines application sequence.
 *
 * @see Issue #299 for rationale
 */

import type { VignetteShape } from './VignetteSchema'
import type { LayerEffectConfig } from './EffectSchema'

// ============================================================
// Effect Types (without enabled flag)
// ============================================================

/**
 * Base interface for vignette effect parameters
 */
interface VignetteEffectBase {
  type: 'vignette'
  shape: VignetteShape
  intensity: number
  softness: number
  color: [number, number, number, number]
}

export interface EllipseVignetteEffect extends VignetteEffectBase {
  shape: 'ellipse'
  radius: number
  centerX: number
  centerY: number
  aspectRatio: number
}

export interface CircleVignetteEffect extends VignetteEffectBase {
  shape: 'circle'
  radius: number
  centerX: number
  centerY: number
}

export interface RectVignetteEffect extends VignetteEffectBase {
  shape: 'rectangle'
  centerX: number
  centerY: number
  width: number
  height: number
  cornerRadius: number
}

export interface LinearVignetteEffect extends VignetteEffectBase {
  shape: 'linear'
  angle: number
  startOffset: number
  endOffset: number
}

export type VignetteEffect =
  | EllipseVignetteEffect
  | CircleVignetteEffect
  | RectVignetteEffect
  | LinearVignetteEffect

export interface ChromaticAberrationEffect {
  type: 'chromaticAberration'
  intensity: number
}

export interface DotHalftoneEffect {
  type: 'dotHalftone'
  dotSize: number
  spacing: number
  angle: number
}

export interface LineHalftoneEffect {
  type: 'lineHalftone'
  lineWidth: number
  spacing: number
  angle: number
}

export interface BlurEffect {
  type: 'blur'
  radius: number
}

export interface PixelationEffect {
  type: 'pixelation'
  blockSize: number
}

// ============================================================
// Discriminated Union
// ============================================================

/**
 * Discriminated union of all effect types.
 * Each effect is a standalone unit with its own parameters (no enabled flag).
 */
export type Effect =
  | VignetteEffect
  | ChromaticAberrationEffect
  | DotHalftoneEffect
  | LineHalftoneEffect
  | BlurEffect
  | PixelationEffect

/**
 * Effect type identifier
 */
export type EffectTypeId = Effect['type']

/**
 * Ordered array of effects - presence means enabled, order determines application sequence.
 */
export type EffectPipeline = Effect[]

// ============================================================
// Type Guards
// ============================================================

export const isVignetteEffect = (e: Effect): e is VignetteEffect =>
  e.type === 'vignette'

export const isChromaticAberrationEffect = (e: Effect): e is ChromaticAberrationEffect =>
  e.type === 'chromaticAberration'

export const isDotHalftoneEffect = (e: Effect): e is DotHalftoneEffect =>
  e.type === 'dotHalftone'

export const isLineHalftoneEffect = (e: Effect): e is LineHalftoneEffect =>
  e.type === 'lineHalftone'

export const isBlurEffect = (e: Effect): e is BlurEffect =>
  e.type === 'blur'

// ============================================================
// Factory Functions
// ============================================================

export const createVignetteEffect = (
  params?: Partial<Omit<EllipseVignetteEffect, 'type'>>
): EllipseVignetteEffect => ({
  type: 'vignette',
  shape: 'ellipse',
  intensity: 0.5,
  softness: 0.4,
  color: [0, 0, 0, 1],
  radius: 0.8,
  centerX: 0.5,
  centerY: 0.5,
  aspectRatio: 1,
  ...params,
})

export const createChromaticAberrationEffect = (
  params: Partial<Omit<ChromaticAberrationEffect, 'type'>> = {}
): ChromaticAberrationEffect => ({
  type: 'chromaticAberration',
  intensity: params.intensity ?? 3,
})

export const createDotHalftoneEffect = (
  params: Partial<Omit<DotHalftoneEffect, 'type'>> = {}
): DotHalftoneEffect => ({
  type: 'dotHalftone',
  dotSize: params.dotSize ?? 8,
  spacing: params.spacing ?? 16,
  angle: params.angle ?? 45,
})

export const createLineHalftoneEffect = (
  params: Partial<Omit<LineHalftoneEffect, 'type'>> = {}
): LineHalftoneEffect => ({
  type: 'lineHalftone',
  lineWidth: params.lineWidth ?? 4,
  spacing: params.spacing ?? 12,
  angle: params.angle ?? 45,
})

export const createBlurEffect = (
  params: Partial<Omit<BlurEffect, 'type'>> = {}
): BlurEffect => ({
  type: 'blur',
  radius: params.radius ?? 8,
})

// ============================================================
// Conversion Utilities
// ============================================================

/**
 * Convert legacy LayerEffectConfig to EffectPipeline.
 * Only includes effects where enabled=true.
 */
export function legacyToEffects(config: LayerEffectConfig): EffectPipeline {
  const pipeline: EffectPipeline = []

  // Vignette
  if (config.vignette?.enabled) {
    const v = config.vignette
    // Remove enabled flag and add type
    const { enabled: _, ...params } = v
    pipeline.push({
      type: 'vignette',
      ...params,
    } as VignetteEffect)
  }

  // Chromatic Aberration
  if (config.chromaticAberration?.enabled) {
    pipeline.push({
      type: 'chromaticAberration',
      intensity: config.chromaticAberration.intensity,
    })
  }

  // Dot Halftone
  if (config.dotHalftone?.enabled) {
    pipeline.push({
      type: 'dotHalftone',
      dotSize: config.dotHalftone.dotSize,
      spacing: config.dotHalftone.spacing,
      angle: config.dotHalftone.angle,
    })
  }

  // Line Halftone
  if (config.lineHalftone?.enabled) {
    pipeline.push({
      type: 'lineHalftone',
      lineWidth: config.lineHalftone.lineWidth,
      spacing: config.lineHalftone.spacing,
      angle: config.lineHalftone.angle,
    })
  }

  // Blur
  if (config.blur?.enabled) {
    pipeline.push({
      type: 'blur',
      radius: config.blur.radius,
    })
  }

  return pipeline
}

/**
 * Convert EffectPipeline to legacy LayerEffectConfig.
 * Creates a config with all effects disabled, then enables those in the pipeline.
 */
export function effectsToLegacy(pipeline: EffectPipeline): LayerEffectConfig {
  // Start with all disabled
  const config: LayerEffectConfig = {
    vignette: {
      enabled: false,
      shape: 'ellipse',
      intensity: 0.5,
      softness: 0.4,
      color: [0, 0, 0, 1],
      radius: 0.8,
      centerX: 0.5,
      centerY: 0.5,
      aspectRatio: 1,
    },
    chromaticAberration: { enabled: false, intensity: 3 },
    dotHalftone: { enabled: false, dotSize: 8, spacing: 16, angle: 45 },
    lineHalftone: { enabled: false, lineWidth: 4, spacing: 12, angle: 45 },
    blur: { enabled: false, radius: 8 },
    pixelation: { enabled: false, blockSize: 8 },
  }

  // Enable and update params for effects in pipeline
  for (const effect of pipeline) {
    switch (effect.type) {
      case 'vignette': {
        const { type: _, ...params } = effect
        config.vignette = { enabled: true, ...params }
        break
      }
      case 'chromaticAberration':
        config.chromaticAberration = { enabled: true, intensity: effect.intensity }
        break
      case 'dotHalftone':
        config.dotHalftone = {
          enabled: true,
          dotSize: effect.dotSize,
          spacing: effect.spacing,
          angle: effect.angle,
        }
        break
      case 'lineHalftone':
        config.lineHalftone = {
          enabled: true,
          lineWidth: effect.lineWidth,
          spacing: effect.spacing,
          angle: effect.angle,
        }
        break
      case 'blur':
        config.blur = { enabled: true, radius: effect.radius }
        break
      case 'pixelation':
        config.pixelation = { enabled: true, blockSize: effect.blockSize }
        break
    }
  }

  return config
}

/**
 * Check if a value is an EffectPipeline (array) vs legacy LayerEffectConfig (object)
 */
export function isEffectPipeline(value: unknown): value is EffectPipeline {
  return Array.isArray(value)
}
