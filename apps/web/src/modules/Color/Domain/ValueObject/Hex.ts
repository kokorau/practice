import type { Srgb } from './Srgb'

/**
 * CSS hex color string (#RRGGBB format)
 */
export type Hex = `#${string}`

export const $Hex = {
  /**
   * Create Hex from Srgb
   */
  fromSrgb: (srgb: Srgb): Hex => {
    return `#${srgb.r.toString(16).padStart(2, '0')}${srgb.g.toString(16).padStart(2, '0')}${srgb.b.toString(16).padStart(2, '0')}` as Hex
  },

  /**
   * Parse Hex to Srgb
   */
  toSrgb: (hex: Hex): Srgb => {
    const h = hex.replace('#', '')
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    }
  },
}
