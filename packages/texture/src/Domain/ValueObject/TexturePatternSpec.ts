import type { RGBA, Viewport } from './TexturePattern'

// ============================================================
// Simple Texture Pattern Params (no mask, viewport-independent)
// ============================================================

export interface SolidPatternParams {
  type: 'solid'
  color: RGBA
}

export interface StripePatternParams {
  type: 'stripe'
  color1: RGBA
  color2: RGBA
  width1: number
  width2: number
  angle: number
}

export interface GridPatternParams {
  type: 'grid'
  lineColor: RGBA
  bgColor: RGBA
  lineWidth: number
  cellSize: number
}

export interface PolkaDotPatternParams {
  type: 'polkaDot'
  dotColor: RGBA
  bgColor: RGBA
  dotRadius: number
  spacing: number
  rowOffset: number
}

// ============================================================
// Mask Pattern Params (viewport-dependent)
// ============================================================

export interface CircleMaskPatternParams {
  type: 'circleMask'
  innerColor: RGBA
  outerColor: RGBA
  centerX: number
  centerY: number
  radius: number
}

export interface RectMaskPatternParams {
  type: 'rectMask'
  innerColor: RGBA
  outerColor: RGBA
  left: number
  right: number
  top: number
  bottom: number
  radiusTopLeft: number
  radiusTopRight: number
  radiusBottomLeft: number
  radiusBottomRight: number
}

// ============================================================
// Masked Texture Pattern Params (mask + texture combined)
// ============================================================

export interface CircleStripePatternParams {
  type: 'circleStripe'
  color1: RGBA
  color2: RGBA
  mask: { centerX: number; centerY: number; radius: number }
  texture: { width1: number; width2: number; angle: number }
}

export interface CircleGridPatternParams {
  type: 'circleGrid'
  color1: RGBA
  color2: RGBA
  mask: { centerX: number; centerY: number; radius: number }
  texture: { lineWidth: number; cellSize: number }
}

export interface CirclePolkaDotPatternParams {
  type: 'circlePolkaDot'
  color1: RGBA
  color2: RGBA
  mask: { centerX: number; centerY: number; radius: number }
  texture: { dotRadius: number; spacing: number; rowOffset: number }
}

export interface RectStripePatternParams {
  type: 'rectStripe'
  color1: RGBA
  color2: RGBA
  mask: {
    left: number
    right: number
    top: number
    bottom: number
    radiusTopLeft: number
    radiusTopRight: number
    radiusBottomLeft: number
    radiusBottomRight: number
  }
  texture: { width1: number; width2: number; angle: number }
}

export interface RectGridPatternParams {
  type: 'rectGrid'
  color1: RGBA
  color2: RGBA
  mask: {
    left: number
    right: number
    top: number
    bottom: number
    radiusTopLeft: number
    radiusTopRight: number
    radiusBottomLeft: number
    radiusBottomRight: number
  }
  texture: { lineWidth: number; cellSize: number }
}

export interface RectPolkaDotPatternParams {
  type: 'rectPolkaDot'
  color1: RGBA
  color2: RGBA
  mask: {
    left: number
    right: number
    top: number
    bottom: number
    radiusTopLeft: number
    radiusTopRight: number
    radiusBottomLeft: number
    radiusBottomRight: number
  }
  texture: { dotRadius: number; spacing: number; rowOffset: number }
}

export interface BlobStripePatternParams {
  type: 'blobStripe'
  color1: RGBA
  color2: RGBA
  mask: {
    centerX: number
    centerY: number
    baseRadius: number
    amplitude: number
    octaves: number
    seed: number
  }
  texture: { width1: number; width2: number; angle: number }
}

export interface BlobGridPatternParams {
  type: 'blobGrid'
  color1: RGBA
  color2: RGBA
  mask: {
    centerX: number
    centerY: number
    baseRadius: number
    amplitude: number
    octaves: number
    seed: number
  }
  texture: { lineWidth: number; cellSize: number }
}

export interface BlobPolkaDotPatternParams {
  type: 'blobPolkaDot'
  color1: RGBA
  color2: RGBA
  mask: {
    centerX: number
    centerY: number
    baseRadius: number
    amplitude: number
    octaves: number
    seed: number
  }
  texture: { dotRadius: number; spacing: number; rowOffset: number }
}

// ============================================================
// Filter Params
// ============================================================

export interface VignettePatternParams {
  type: 'vignette'
  color: RGBA
  intensity: number
  radius: number
  softness: number
}

export interface ChromaticAberrationPatternParams {
  type: 'chromaticAberration'
  intensity: number
  angle: number
}

// ============================================================
// Gradient / Noise Pattern Params
// ============================================================

export interface ColorStop {
  color: RGBA
  position: number  // 0-1
}

export interface LinearGradientPatternParams {
  type: 'linearGradient'
  angle: number  // 0-360 degrees
  stops: ColorStop[]  // max 8 stops
}

export interface GradientGrainPatternParams {
  type: 'gradientGrain'
  angle: number  // 0-360 degrees
  colorA: RGBA  // start color
  colorB: RGBA  // end color
  seed: number  // noise seed
  intensity: number  // grain intensity (0-1)
  blendStrength: number  // grain blend amount (0-1)
}

// ============================================================
// Union Types
// ============================================================

export type SimpleTexturePatternParams =
  | SolidPatternParams
  | StripePatternParams
  | GridPatternParams
  | PolkaDotPatternParams

export type MaskPatternParams =
  | CircleMaskPatternParams
  | RectMaskPatternParams

export type MaskedTexturePatternParams =
  | CircleStripePatternParams
  | CircleGridPatternParams
  | CirclePolkaDotPatternParams
  | RectStripePatternParams
  | RectGridPatternParams
  | RectPolkaDotPatternParams
  | BlobStripePatternParams
  | BlobGridPatternParams
  | BlobPolkaDotPatternParams

export type FilterPatternParams =
  | VignettePatternParams
  | ChromaticAberrationPatternParams

export type GradientPatternParams =
  | LinearGradientPatternParams
  | GradientGrainPatternParams

export type TexturePatternParams =
  | SimpleTexturePatternParams
  | MaskPatternParams
  | MaskedTexturePatternParams
  | FilterPatternParams
  | GradientPatternParams

// ============================================================
// TexturePatternSpec - Self-contained render specification
// ============================================================

/**
 * Self-contained texture pattern specification.
 * Contains shader code and parameters for rendering.
 * Viewport is passed at render time to generate uniforms.
 */
export interface TexturePatternSpec {
  /** WGSL shader code (static string) */
  shader: string
  /** Uniform buffer size in bytes */
  bufferSize: number
  /** Blend state for compositing (optional) */
  blend?: GPUBlendState
  /** Pattern parameters (serializable) */
  params: TexturePatternParams
}

/**
 * Create uniforms from pattern params and viewport.
 * Returns ArrayBuffer ready for GPU upload.
 */
export type CreateUniformsFn = (
  params: TexturePatternParams,
  viewport: Viewport
) => ArrayBuffer
