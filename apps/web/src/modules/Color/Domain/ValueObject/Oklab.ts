/**
 * OKLAB color space - perceptually uniform
 * L: Lightness (0-1)
 * a: green-red axis
 * b: blue-yellow axis
 */
export type Oklab = {
  L: number  // 0-1 (lightness)
  a: number  // ~-0.4 to ~0.4
  b: number  // ~-0.4 to ~0.4
}

/**
 * sRGB color (0-255 range)
 */
export type Srgb = {
  r: number  // 0-255
  g: number  // 0-255
  b: number  // 0-255
}

// sRGB to linear RGB (gamma expansion)
const srgbToLinear = (c: number): number => {
  const s = c / 255
  return s <= 0.04045
    ? s / 12.92
    : Math.pow((s + 0.055) / 1.055, 2.4)
}

// Linear RGB to sRGB (gamma compression)
const linearToSrgb = (c: number): number => {
  const s = c <= 0.0031308
    ? c * 12.92
    : 1.055 * Math.pow(c, 1 / 2.4) - 0.055
  return Math.round(Math.max(0, Math.min(255, s * 255)))
}

export const $Oklab = {
  /**
   * Create Oklab from sRGB values (0-255)
   */
  fromSrgb: (srgb: Srgb): Oklab => {
    // sRGB to Linear RGB
    const lr = srgbToLinear(srgb.r)
    const lg = srgbToLinear(srgb.g)
    const lb = srgbToLinear(srgb.b)

    // Linear RGB to LMS (cone responses)
    const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb
    const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb
    const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb

    // LMS to OKLAB (cube root)
    const l_ = Math.cbrt(l)
    const m_ = Math.cbrt(m)
    const s_ = Math.cbrt(s)

    return {
      L: 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
      a: 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
      b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
    }
  },

  /**
   * Convert Oklab to sRGB values (0-255)
   */
  toSrgb: (oklab: Oklab): Srgb => {
    const { L, a, b } = oklab

    // OKLAB to LMS
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b
    const s_ = L - 0.0894841775 * a - 1.2914855480 * b

    // Cube to get LMS
    const l = l_ * l_ * l_
    const m = m_ * m_ * m_
    const s = s_ * s_ * s_

    // LMS to Linear RGB
    const lr = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
    const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
    const lb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s

    return {
      r: linearToSrgb(lr),
      g: linearToSrgb(lg),
      b: linearToSrgb(lb),
    }
  },

  /**
   * Get perceptual lightness (0-1)
   */
  lightness: (srgb: Srgb): number => {
    return $Oklab.fromSrgb(srgb).L
  },

  /**
   * Get lightness as 0-255 value (for histogram compatibility)
   */
  lightness255: (srgb: Srgb): number => {
    return Math.round($Oklab.fromSrgb(srgb).L * 255)
  },
}
