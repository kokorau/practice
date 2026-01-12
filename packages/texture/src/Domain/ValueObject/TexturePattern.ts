import type { TextureRenderSpec } from './TextureRenderSpec'
import type { SurfacePresetParams } from './SurfacePreset'

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
  /** Surface preset parameters for surfaceConfig mapping (optional for patterns without surface config) */
  params?: SurfacePresetParams
}

/**
 * Mask type enumeration
 */
export type MaskShapeType = 'circle' | 'rect' | 'blob' | 'perlin' | 'linearGradient' | 'radialGradient' | 'boxGradient'

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

/**
 * Perlin noise mask configuration
 * Thresholded perlin noise for binary mask
 */
export interface PerlinMaskShapeConfig {
  type: 'perlin'
  seed: number
  threshold: number
  scale: number
  octaves: number
  /** If true (default), noise > threshold is opaque. If false, noise <= threshold is opaque. */
  cutout?: boolean
}

/**
 * Linear gradient mask configuration
 * Smooth gradient fade along a direction
 */
export interface LinearGradientMaskShapeConfig {
  type: 'linearGradient'
  /** Gradient direction in degrees (0-360) */
  angle: number
  /** Start offset (0.0-1.0, normalized coordinate) */
  startOffset: number
  /** End offset (0.0-1.0, normalized coordinate) */
  endOffset: number
  /** If true (default), gradient goes from transparent to opaque. If false, reversed. */
  cutout?: boolean
}

/**
 * Radial gradient mask configuration
 * Circular/elliptical gradient from center outward (vignette effect)
 */
export interface RadialGradientMaskShapeConfig {
  type: 'radialGradient'
  /** Center X coordinate (0.0-1.0, normalized) */
  centerX: number
  /** Center Y coordinate (0.0-1.0, normalized) */
  centerY: number
  /** Inner radius (fully opaque area) */
  innerRadius: number
  /** Outer radius (fully transparent area) */
  outerRadius: number
  /** Aspect ratio for ellipse (1.0 = circle) */
  aspectRatio: number
  /** If true (default), gradient goes from opaque center to transparent edge. If false, reversed. */
  cutout?: boolean
}

/**
 * Box gradient mask configuration
 * Rectangular vignette effect with fade from edges toward center
 */
export interface BoxGradientMaskShapeConfig {
  type: 'boxGradient'
  /** Left edge fade width (0.0-1.0, normalized coordinate) */
  left: number
  /** Right edge fade width (0.0-1.0, normalized coordinate) */
  right: number
  /** Top edge fade width (0.0-1.0, normalized coordinate) */
  top: number
  /** Bottom edge fade width (0.0-1.0, normalized coordinate) */
  bottom: number
  /** Corner radius (0.0-1.0, controls corner rounding) */
  cornerRadius: number
  /** Fade curve type */
  curve: 'linear' | 'smooth' | 'easeIn' | 'easeOut'
  /** If true (default), gradient goes from opaque center to transparent edges. If false, reversed. */
  cutout?: boolean
}

export type MaskShapeConfig = CircleMaskShapeConfig | RectMaskShapeConfig | BlobMaskShapeConfig | PerlinMaskShapeConfig | LinearGradientMaskShapeConfig | RadialGradientMaskShapeConfig | BoxGradientMaskShapeConfig

/**
 * Mask pattern definition with shape configuration
 */
export interface MaskPattern extends TexturePattern {
  /** Mask shape configuration for compositing with textures */
  maskConfig: MaskShapeConfig
}
