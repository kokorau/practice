import type { TextureRenderer } from '../../TextureRenderer'

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
 * Texture pattern definition
 */
export interface TexturePattern {
  /** Display label for the pattern */
  label: string
  /** Render function that draws the pattern */
  render: (
    renderer: TextureRenderer,
    color1: RGBA,
    color2: RGBA,
    options?: TextureRenderOptions
  ) => void
}
