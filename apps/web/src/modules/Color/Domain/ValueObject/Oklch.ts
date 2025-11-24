import type { Oklab } from './Oklab'
import { $Oklab } from './Oklab'
import type { Srgb } from './Srgb'

/**
 * OKLCH color space - perceptually uniform with polar coordinates
 * L: Lightness (0-1)
 * C: Chroma (saturation, 0 to ~0.4)
 * H: Hue angle (0-360 degrees)
 */
export type Oklch = {
  L: number  // 0-1 (lightness)
  C: number  // 0 to ~0.4 (chroma/saturation)
  H: number  // 0-360 (hue in degrees)
}

export const $Oklch = {
  /**
   * Create Oklch from L, C, H values
   */
  create: (L: number, C: number, H: number): Oklch => ({ L, C, H }),

  /**
   * Convert Oklab to Oklch (cartesian to polar)
   */
  fromOklab: (oklab: Oklab): Oklch => {
    const { L, a, b } = oklab
    const C = Math.sqrt(a * a + b * b)
    let H = Math.atan2(b, a) * (180 / Math.PI)
    if (H < 0) H += 360
    return { L, C, H }
  },

  /**
   * Convert Oklch to Oklab (polar to cartesian)
   */
  toOklab: (oklch: Oklch): Oklab => {
    const { L, C, H } = oklch
    const hRad = H * (Math.PI / 180)
    return {
      L,
      a: C * Math.cos(hRad),
      b: C * Math.sin(hRad),
    }
  },

  /**
   * Create Oklch from sRGB values (0-255)
   */
  fromSrgb: (srgb: Srgb): Oklch => {
    return $Oklch.fromOklab($Oklab.fromSrgb(srgb))
  },

  /**
   * Convert Oklch to sRGB values (0-255)
   */
  toSrgb: (oklch: Oklch): Srgb => {
    return $Oklab.toSrgb($Oklch.toOklab(oklch))
  },

  /**
   * Check if Oklch color is within sRGB gamut
   */
  isInGamut: (oklch: Oklch): boolean => {
    // Check if linear RGB values are within 0-1 range before gamma compression
    const oklab = $Oklch.toOklab(oklch)
    const l_ = oklab.L + 0.3963377774 * oklab.a + 0.2158037573 * oklab.b
    const m_ = oklab.L - 0.1055613458 * oklab.a - 0.0638541728 * oklab.b
    const s_ = oklab.L - 0.0894841775 * oklab.a - 1.2914855480 * oklab.b

    const l = l_ * l_ * l_
    const m = m_ * m_ * m_
    const s = s_ * s_ * s_

    const lr = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
    const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
    const lb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s

    const inRange = (v: number) => v >= -0.0001 && v <= 1.0001
    return inRange(lr) && inRange(lg) && inRange(lb)
  },

  /**
   * Clamp chroma to fit within sRGB gamut while preserving L and H
   */
  clampToGamut: (oklch: Oklch): Oklch => {
    if ($Oklch.isInGamut(oklch)) return oklch

    // Binary search for maximum chroma within gamut
    let low = 0
    let high = oklch.C
    const { L, H } = oklch

    for (let i = 0; i < 20; i++) {
      const mid = (low + high) / 2
      if ($Oklch.isInGamut({ L, C: mid, H })) {
        low = mid
      } else {
        high = mid
      }
    }

    return { L, C: low, H }
  },
}
