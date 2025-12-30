/**
 * Masked Texture Types
 *
 * マスク付きテクスチャの型定義。
 */

// ============================================================
// Mask Types
// ============================================================

export type MaskType = 'circle' | 'rect' | 'blob'
export type TextureType = 'stripe' | 'grid' | 'polkaDot'

/** Parameters for circle mask */
export interface CircleMaskConfig {
  type: 'circle'
  centerX: number
  centerY: number
  radius: number
  /** If true (default), texture is rendered outside the shape (cutout). If false, texture fills the shape (solid). */
  cutout?: boolean
}

/** Parameters for rect mask */
export interface RectMaskConfig {
  type: 'rect'
  left: number
  right: number
  top: number
  bottom: number
  radiusTopLeft?: number
  radiusTopRight?: number
  radiusBottomLeft?: number
  radiusBottomRight?: number
  /** If true (default), texture is rendered outside the shape (cutout). If false, texture fills the shape (solid). */
  cutout?: boolean
}

/** Parameters for blob mask */
export interface BlobMaskConfig {
  type: 'blob'
  centerX: number
  centerY: number
  baseRadius: number
  amplitude: number
  octaves: number
  seed: number
  /** If true (default), texture is rendered outside the shape (cutout). If false, texture fills the shape (solid). */
  cutout?: boolean
}

export type MaskConfig = CircleMaskConfig | RectMaskConfig | BlobMaskConfig

// ============================================================
// Texture Types
// ============================================================

/** Parameters for stripe texture */
export interface StripeTextureConfig {
  type: 'stripe'
  width1: number
  width2: number
  angle: number
}

/** Parameters for grid texture */
export interface GridTextureConfig {
  type: 'grid'
  lineWidth: number
  cellSize: number
}

/** Parameters for polka dot texture */
export interface PolkaDotTextureConfig {
  type: 'polkaDot'
  dotRadius: number
  spacing: number
  rowOffset: number
}

export type TextureConfig = StripeTextureConfig | GridTextureConfig | PolkaDotTextureConfig

// ============================================================
// Combined Types
// ============================================================

/** Combined parameters for masked texture */
export interface MaskedTextureParams {
  color1: [number, number, number, number]
  color2: [number, number, number, number]
  mask: MaskConfig
  texture: TextureConfig
}
