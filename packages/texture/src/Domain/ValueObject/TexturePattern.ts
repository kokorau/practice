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
