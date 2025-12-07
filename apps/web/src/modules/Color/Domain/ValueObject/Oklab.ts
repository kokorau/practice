import type { DisplayP3 } from './DisplayP3'
import type { Srgb } from './Srgb'

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

// sRGB to linear RGB (gamma expansion)
// Input: 0-1 normalized sRGB value
// Output: 0-1 linear RGB value
const srgbToLinear = (c: number): number => {
  return c <= 0.04045
    ? c / 12.92
    : Math.pow((c + 0.055) / 1.055, 2.4)
}

// Linear RGB to sRGB (gamma compression)
// Input: 0-1 linear RGB value
// Output: 0-1 normalized sRGB value
const linearToSrgb = (c: number): number => {
  const linear = c <= 0.0031308
    ? c * 12.92
    : 1.055 * Math.pow(c, 1 / 2.4) - 0.055
  return Math.max(0, Math.min(1, linear))
}

// ============================================
// Matrix definitions for Display P3 conversion
// ============================================

// Display P3 (linear) to XYZ D65
const DISPLAY_P3_TO_XYZ = [
  [0.4865709486, 0.2656676932, 0.1982172852],
  [0.2289745641, 0.6917385218, 0.0792869141],
  [0.0000000000, 0.0451133819, 1.0439443689],
] as const

// XYZ D65 to Display P3 (linear)
const XYZ_TO_DISPLAY_P3 = [
  [2.4934969119, -0.9313836179, -0.4027107845],
  [-0.8294889696, 1.7626640603, 0.0236246858],
  [0.0358458302, -0.0761723893, 0.9568845240],
] as const

// XYZ D65 to LMS (for Oklab)
// This uses the same LMS space as Oklab
const XYZ_TO_LMS = [
  [0.8189330101, 0.3618667424, -0.1288597137],
  [0.0329845436, 0.9293118715, 0.0361456387],
  [0.0482003018, 0.2643662691, 0.6338517070],
] as const

// LMS to XYZ D65
const LMS_TO_XYZ = [
  [1.2270138511, -0.5577999807, 0.2812561490],
  [-0.0405801784, 1.1122568696, -0.0716766787],
  [-0.0763812845, -0.4214819784, 1.5861632204],
] as const

// Matrix multiplication helper
const matmul3 = (m: readonly (readonly number[])[], v: [number, number, number]): [number, number, number] => {
  return [
    m[0]![0]! * v[0] + m[0]![1]! * v[1] + m[0]![2]! * v[2],
    m[1]![0]! * v[0] + m[1]![1]! * v[1] + m[1]![2]! * v[2],
    m[2]![0]! * v[0] + m[2]![1]! * v[1] + m[2]![2]! * v[2],
  ]
}

export const $Oklab = {
  /**
   * Create Oklab from sRGB values (0-1 normalized)
   */
  fromSrgb: (srgb: Srgb): Oklab => {
    // sRGB to Linear RGB (both 0-1)
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
   * Convert Oklab to sRGB values (0-1 normalized)
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

    // Linear RGB to sRGB (both 0-1)
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

  /**
   * Calculate perceptual color distance (Delta E in Oklab)
   * Returns a value typically 0-1, where 0 is identical and ~0.05 is just noticeable difference
   */
  distance: (a: Oklab, b: Oklab): number => {
    const dL = a.L - b.L
    const da = a.a - b.a
    const db = a.b - b.b
    return Math.sqrt(dL * dL + da * da + db * db)
  },

  /**
   * Calculate perceptual color distance from sRGB values
   */
  distanceSrgb: (a: Srgb, b: Srgb): number => {
    return $Oklab.distance($Oklab.fromSrgb(a), $Oklab.fromSrgb(b))
  },

  /**
   * Create Oklab from Display P3 values (linear, 0-1)
   * This provides wider gamut support than sRGB.
   */
  fromDisplayP3: (p3: DisplayP3): Oklab => {
    // Display P3 (linear) -> XYZ D65
    const xyz = matmul3(DISPLAY_P3_TO_XYZ, [p3.r, p3.g, p3.b])

    // XYZ D65 -> LMS
    const lms = matmul3(XYZ_TO_LMS, xyz)

    // LMS -> LMS' (cube root)
    const l_ = Math.cbrt(lms[0])
    const m_ = Math.cbrt(lms[1])
    const s_ = Math.cbrt(lms[2])

    // LMS' -> Oklab
    return {
      L: 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
      a: 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
      b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
    }
  },

  /**
   * Convert Oklab to Display P3 values (linear, 0-1)
   * Returns values that may be outside 0-1 for out-of-gamut colors.
   */
  toDisplayP3: (oklab: Oklab): DisplayP3 => {
    const { L, a, b } = oklab

    // Oklab -> LMS'
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b
    const s_ = L - 0.0894841775 * a - 1.2914855480 * b

    // LMS' -> LMS (cube)
    const l = l_ * l_ * l_
    const m = m_ * m_ * m_
    const s = s_ * s_ * s_

    // LMS -> XYZ D65
    const xyz = matmul3(LMS_TO_XYZ, [l, m, s])

    // XYZ D65 -> Display P3 (linear)
    const p3 = matmul3(XYZ_TO_DISPLAY_P3, xyz)

    return { r: p3[0], g: p3[1], b: p3[2] }
  },

  /**
   * Convert Oklab to Display P3 with gamut clipping
   */
  toDisplayP3Clipped: (oklab: Oklab): DisplayP3 => {
    const p3 = $Oklab.toDisplayP3(oklab)
    return {
      r: Math.max(0, Math.min(1, p3.r)),
      g: Math.max(0, Math.min(1, p3.g)),
      b: Math.max(0, Math.min(1, p3.b)),
    }
  },
}
