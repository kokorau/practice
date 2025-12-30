import type { TextureRenderSpec } from './TextureRenderSpec'

/**
 * RGBA color tuple [r, g, b, a] where each value is 0-1
 */
export type RGBA = [number, number, number, number]

/**
 * Render options for texture patterns
 */
export interface TextureRenderOptions {
  /** If false, composites over existing content. Default: true */
  clear?: boolean
}

/**
 * Viewport information for mask rendering
 */
export interface Viewport {
  width: number
  height: number
}

/**
 * Texture pattern definition
 */
export interface TexturePattern {
  /** Display label for the pattern */
  label: string
  /** Create render specification from colors */
  createSpec: (color1: RGBA, color2: RGBA, viewport?: Viewport) => TextureRenderSpec
}

/**
 * Mask type enumeration
 */
export type MaskShapeType = 'circle' | 'rect' | 'blob'

/**
 * Circle mask configuration
 */
export interface CircleMaskShapeConfig {
  type: 'circle'
  centerX: number
  centerY: number
  radius: number
  /** If true (default), texture is rendered outside the shape (cutout). If false, texture fills the shape (solid). */
  cutout?: boolean
}

/**
 * Rect mask configuration
 */
export interface RectMaskShapeConfig {
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

/**
 * Blob mask configuration (not supported for masked textures yet)
 */
export interface BlobMaskShapeConfig {
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

export type MaskShapeConfig = CircleMaskShapeConfig | RectMaskShapeConfig | BlobMaskShapeConfig

/**
 * Mask pattern definition with shape configuration
 */
export interface MaskPattern extends TexturePattern {
  /** Mask shape configuration for compositing with textures */
  maskConfig: MaskShapeConfig
}
