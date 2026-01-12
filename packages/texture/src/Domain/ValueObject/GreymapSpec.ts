/**
 * Greymap Specification Types
 *
 * Types for greymap-based mask rendering pipeline.
 * Greymap shaders output grayscale values (0.0-1.0) that can be
 * converted to final RGBA output via colorize shader.
 */

import type { Viewport } from './TexturePattern'

// ============================================================
// Greymap Value Types
// ============================================================

/**
 * Greymap mask parameters base interface.
 * Uses float values (0.0-1.0) instead of RGBA colors.
 */
export interface GreymapMaskParams {
  /** Inner value (shape interior), 0.0-1.0 */
  innerValue: number
  /** Outer value (shape exterior), 0.0-1.0 */
  outerValue: number
}

// ============================================================
// Circle Greymap Mask
// ============================================================

/** Circle greymap mask parameters */
export interface CircleGreymapMaskParams extends GreymapMaskParams {
  /** Center X coordinate (0.0-1.0, normalized) */
  centerX: number
  /** Center Y coordinate (0.0-1.0, normalized) */
  centerY: number
  /** Radius (0.0-1.0, relative to shorter edge) */
  radius: number
  /** If true (default), renders outside the shape. If false, fills the shape. */
  cutout?: boolean
}

// ============================================================
// Rect Greymap Mask
// ============================================================

/** Rect greymap mask base parameters */
interface RectGreymapMaskBaseParams extends GreymapMaskParams {
  /** Left edge (0.0-1.0) */
  left: number
  /** Right edge (0.0-1.0) */
  right: number
  /** Top edge (0.0-1.0) */
  top: number
  /** Bottom edge (0.0-1.0) */
  bottom: number
  /** If true (default), renders outside the shape. If false, fills the shape. */
  cutout?: boolean
}

/** Rect greymap mask with uniform radius */
interface RectGreymapMaskUniformRadius extends RectGreymapMaskBaseParams {
  /** Corner radius (all corners) */
  radius?: number
  /** Z-axis rotation in degrees (0-360) */
  rotation?: number
  /** Horizontal perspective (-0.5 to 0.5) */
  perspectiveX?: number
  /** Vertical perspective (-0.5 to 0.5) */
  perspectiveY?: number
}

/** Rect greymap mask with individual corner radii */
interface RectGreymapMaskIndividualRadius extends RectGreymapMaskBaseParams {
  /** Top-left corner radius */
  radiusTopLeft: number
  /** Top-right corner radius */
  radiusTopRight: number
  /** Bottom-left corner radius */
  radiusBottomLeft: number
  /** Bottom-right corner radius */
  radiusBottomRight: number
  /** Z-axis rotation in degrees (0-360) */
  rotation?: number
  /** Horizontal perspective (-0.5 to 0.5) */
  perspectiveX?: number
  /** Vertical perspective (-0.5 to 0.5) */
  perspectiveY?: number
}

/** Rect greymap mask parameters */
export type RectGreymapMaskParams = RectGreymapMaskUniformRadius | RectGreymapMaskIndividualRadius

// ============================================================
// Blob Greymap Mask
// ============================================================

/** Blob greymap mask parameters */
export interface BlobGreymapMaskParams extends GreymapMaskParams {
  /** Center X coordinate (0.0-1.0) */
  centerX: number
  /** Center Y coordinate (0.0-1.0) */
  centerY: number
  /** Base radius (0.0-1.0) */
  baseRadius: number
  /** Noise amplitude (0.0-1.0) */
  amplitude: number
  /** Noise octaves (1-8) */
  octaves: number
  /** Random seed */
  seed: number
  /** If true (default), renders outside the shape. If false, fills the shape. */
  cutout?: boolean
}

// ============================================================
// Perlin Greymap Mask
// ============================================================

/** Perlin noise greymap mask parameters */
export interface PerlinGreymapMaskParams extends GreymapMaskParams {
  /** Random seed */
  seed: number
  /** Threshold for binarization (0.0-1.0) */
  threshold: number
  /** Noise scale */
  scale: number
  /** fBm octaves (1-8) */
  octaves: number
  /** If true (default), noise > threshold is opaque. If false, reversed. */
  cutout?: boolean
}

// ============================================================
// Gradient Greymap Masks
// ============================================================

/** Linear gradient greymap mask parameters */
export interface LinearGradientGreymapMaskParams extends GreymapMaskParams {
  /** Gradient angle in degrees (0-360) */
  angle: number
  /** Start offset (0.0-1.0) */
  startOffset: number
  /** End offset (0.0-1.0) */
  endOffset: number
  /** If true (default), gradient goes from inner to outer. If false, reversed. */
  cutout?: boolean
}

/** Radial gradient greymap mask parameters */
export interface RadialGradientGreymapMaskParams extends GreymapMaskParams {
  /** Center X coordinate (0.0-1.0) */
  centerX: number
  /** Center Y coordinate (0.0-1.0) */
  centerY: number
  /** Inner radius (fully opaque) */
  innerRadius: number
  /** Outer radius (fully transparent) */
  outerRadius: number
  /** Aspect ratio for ellipse (1.0 = circle) */
  aspectRatio: number
  /** If true (default), gradient goes from inner to outer. If false, reversed. */
  cutout?: boolean
}

/** Box gradient greymap mask parameters */
export interface BoxGradientGreymapMaskParams extends GreymapMaskParams {
  /** Left edge fade width (0.0-1.0) */
  left: number
  /** Right edge fade width (0.0-1.0) */
  right: number
  /** Top edge fade width (0.0-1.0) */
  top: number
  /** Bottom edge fade width (0.0-1.0) */
  bottom: number
  /** Corner radius */
  cornerRadius: number
  /** Fade curve type */
  curve: 'linear' | 'smooth' | 'easeIn' | 'easeOut'
  /** If true (default), gradient goes from inner to outer. If false, reversed. */
  cutout?: boolean
}

// ============================================================
// Pattern Greymap Types
// ============================================================

/** Stripe pattern greymap parameters */
export interface StripeGreymapParams {
  /** Width of first stripe (pixels) */
  width1: number
  /** Width of second stripe (pixels) */
  width2: number
  /** Angle in degrees */
  angle: number
  /** Value for first stripe (0.0-1.0) */
  value1: number
  /** Value for second stripe (0.0-1.0) */
  value2: number
}

/** Grid pattern greymap parameters */
export interface GridGreymapParams {
  /** Line width (pixels) */
  lineWidth: number
  /** Cell size (pixels) */
  cellSize: number
  /** Line value (0.0-1.0) */
  lineValue: number
  /** Background value (0.0-1.0) */
  bgValue: number
}

/** Polka dot pattern greymap parameters */
export interface PolkaDotGreymapParams {
  /** Dot radius (pixels) */
  dotRadius: number
  /** Spacing between dots (pixels) */
  spacing: number
  /** Row offset for alternating pattern (0.0-1.0) */
  rowOffset: number
  /** Dot value (0.0-1.0) */
  dotValue: number
  /** Background value (0.0-1.0) */
  bgValue: number
}

/** Checker pattern greymap parameters */
export interface CheckerGreymapParams {
  /** Cell size (pixels) */
  cellSize: number
  /** Angle in degrees */
  angle: number
  /** Value for first cell (0.0-1.0) */
  value1: number
  /** Value for second cell (0.0-1.0) */
  value2: number
}

// ============================================================
// Image Greymap Types
// ============================================================

/** Image greymap parameters */
export interface ImageGreymapParams {
  /** Invert the luminance values */
  invert?: boolean
  /** Optional threshold for binarization (0=disabled) */
  threshold?: number
}

// ============================================================
// Colorize Types
// ============================================================

/** RGBA color type */
export type RGBA = [number, number, number, number]

/** Colorize shader parameters */
export interface ColorizeParams {
  /** Color to apply where greymap is white (1.0) */
  keepColor: RGBA
  /** Color to apply where greymap is black (0.0) */
  cutoutColor: RGBA
  /** Alpha mode: 0=luminance becomes alpha, 1=preserve original alpha */
  alphaMode: 0 | 1
}

// ============================================================
// Spec Creation Function Types
// ============================================================

/** Function type for creating greymap mask spec */
export type CreateGreymapMaskSpecFn<T extends GreymapMaskParams> = (
  params: T,
  viewport: Viewport
) => GreymapMaskSpec

/** Greymap mask render specification */
export interface GreymapMaskSpec {
  /** WGSL shader code */
  shader: string
  /** Uniform buffer data */
  uniforms: ArrayBuffer
  /** Buffer size in bytes (must be 16-byte aligned) */
  bufferSize: number
}
