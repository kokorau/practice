import type { Srgb } from './Srgb'

/**
 * HSV color
 * h: 0-360 (hue in degrees)
 * s: 0-1 (saturation)
 * v: 0-1 (value/brightness)
 */
export type Hsv = {
  h: number
  s: number
  v: number
}

export const $Hsv = {
  create: (h: number, s: number, v: number): Hsv => ({ h, s, v }),

  /**
   * Convert from sRGB (0-1 normalized) to HSV
   */
  fromSrgb: (srgb: Srgb): Hsv => {
    const { r, g, b } = srgb  // Already 0-1

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const d = max - min

    let h = 0
    if (d !== 0) {
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

    const s = max === 0 ? 0 : d / max
    const v = max

    return { h, s, v }
  },

  /**
   * Convert from HSV to sRGB (0-1 normalized)
   */
  toSrgb: (hsv: Hsv): Srgb => {
    const { h, s, v } = hsv
    const c = v * s
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
    const m = v - c

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
   * Get pure hue color (s=1, v=1)
   */
  pureHue: (h: number): Srgb => {
    return $Hsv.toSrgb({ h, s: 1, v: 1 })
  },
}
