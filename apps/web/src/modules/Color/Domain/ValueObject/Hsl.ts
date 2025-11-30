import type { Srgb } from './Srgb'

/**
 * HSL color
 * h: 0-360 (hue in degrees)
 * s: 0-1 (saturation)
 * l: 0-1 (lightness)
 */
export type Hsl = {
  h: number
  s: number
  l: number
}

export const $Hsl = {
  create: (h: number, s: number, l: number): Hsl => ({ h, s, l }),

  /**
   * Convert from sRGB (0-1 normalized) to HSL
   */
  fromSrgb: (srgb: Srgb): Hsl => {
    const { r, g, b } = srgb  // Already 0-1

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const l = (max + min) / 2
    const d = max - min

    let h = 0
    let s = 0

    if (d !== 0) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

      if (max === r) {
        h = ((g - b) / d) % 6
      } else if (max === g) {
        h = (b - r) / d + 2
      } else {
        h = (r - g) / d + 4
      }
      h *= 60
      if (h < 0) h += 360
    }

    return { h, s, l }
  },

  /**
   * Convert from HSL to sRGB (0-1 normalized)
   */
  toSrgb: (hsl: Hsl): Srgb => {
    const { h, s, l } = hsl

    if (s === 0) {
      // Grayscale
      return { r: l, g: l, b: l }
    }

    const c = (1 - Math.abs(2 * l - 1)) * s
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
    const m = l - c / 2

    let r = 0,
      g = 0,
      b = 0

    if (h < 60) {
      r = c
      g = x
    } else if (h < 120) {
      r = x
      g = c
    } else if (h < 180) {
      g = c
      b = x
    } else if (h < 240) {
      g = x
      b = c
    } else if (h < 300) {
      r = x
      b = c
    } else {
      r = c
      b = x
    }

    // Return 0-1 normalized values
    return {
      r: r + m,
      g: g + m,
      b: b + m,
    }
  },

  /**
   * Convert to cylindrical coordinates for 3D visualization
   * Returns [x, y, z] where:
   * - x, y are on the circular plane (hue as angle, saturation as radius)
   * - z is lightness (0 at bottom, 1 at top)
   */
  toCylindrical: (hsl: Hsl): [number, number, number] => {
    const { h, s, l } = hsl
    const angle = (h * Math.PI) / 180
    const x = s * Math.cos(angle) * 0.5 + 0.5
    const y = s * Math.sin(angle) * 0.5 + 0.5
    const z = l
    return [x, y, z]
  },
}
