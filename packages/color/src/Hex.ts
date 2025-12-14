import type { Srgb } from './Srgb'
import { $Srgb } from './Srgb'

/**
 * CSS hex color string (#RRGGBB format)
 */
export type Hex = `#${string}`

export const $Hex = {
  /**
   * Create Hex from Srgb (0-1 normalized)
   */
  fromSrgb: (srgb: Srgb): Hex => {
    const { r, g, b } = $Srgb.to255(srgb)
    const toHexPart = (n: number) => n.toString(16).padStart(2, '0')
    return `#${toHexPart(r)}${toHexPart(g)}${toHexPart(b)}` as Hex
  },

  /**
   * Parse Hex to Srgb (0-1 normalized)
   */
  toSrgb: (hex: Hex): Srgb => {
    const h = hex.replace('#', '')
    const r = parseInt(h.slice(0, 2), 16)
    const g = parseInt(h.slice(2, 4), 16)
    const b = parseInt(h.slice(4, 6), 16)
    return $Srgb.from255(r, g, b)
  },
}
