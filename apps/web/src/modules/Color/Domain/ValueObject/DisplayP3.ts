import type { Srgb } from './Srgb'

/**
 * Display P3 color space
 * Wide gamut color space used by Apple devices and HDR displays
 * Based on DCI-P3 with D65 white point
 * Uses linear light values (no gamma)
 */
export type DisplayP3 = {
  r: number // linear, 0-1 for in-gamut colors
  g: number // linear, 0-1 for in-gamut colors
  b: number // linear, 0-1 for in-gamut colors
}

// sRGB to linear RGB (gamma expansion)
const srgbToLinear = (c: number): number => {
  return c <= 0.04045
    ? c / 12.92
    : Math.pow((c + 0.055) / 1.055, 2.4)
}

// Linear RGB to sRGB (gamma compression)
const linearToSrgb = (c: number): number => {
  return c <= 0.0031308
    ? c * 12.92
    : 1.055 * Math.pow(c, 1 / 2.4) - 0.055
}

// ============================================
// Matrix definitions for color space conversions
// All matrices are for D65 white point
// ============================================

// sRGB (linear) to XYZ D65
const SRGB_TO_XYZ = [
  [0.4123907993, 0.3575843394, 0.1804807884],
  [0.2126390059, 0.7151686788, 0.0721923154],
  [0.0193308187, 0.1191947798, 0.9505321522],
] as const

// XYZ D65 to sRGB (linear)
const XYZ_TO_SRGB = [
  [3.2409699419, -1.5373831776, -0.4986107603],
  [-0.9692436363, 1.8759675015, 0.0415550574],
  [0.0556300797, -0.2039769589, 1.0569715142],
] as const

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

// Matrix multiplication helper
const matmul = (m: readonly (readonly number[])[], v: [number, number, number]): [number, number, number] => {
  return [
    m[0]![0]! * v[0] + m[0]![1]! * v[1] + m[0]![2]! * v[2],
    m[1]![0]! * v[0] + m[1]![1]! * v[1] + m[1]![2]! * v[2],
    m[2]![0]! * v[0] + m[2]![1]! * v[1] + m[2]![2]! * v[2],
  ]
}

export const $DisplayP3 = {
  /**
   * Create DisplayP3 from component values
   */
  create: (r: number, g: number, b: number): DisplayP3 => ({ r, g, b }),

  /**
   * Convert sRGB (0-1 gamma encoded) to Display P3 (linear)
   */
  fromSrgb: (srgb: Srgb): DisplayP3 => {
    // sRGB to linear
    const linearR = srgbToLinear(srgb.r)
    const linearG = srgbToLinear(srgb.g)
    const linearB = srgbToLinear(srgb.b)

    // Linear sRGB to XYZ D65
    const xyz = matmul(SRGB_TO_XYZ, [linearR, linearG, linearB])

    // XYZ D65 to Display P3
    const p3 = matmul(XYZ_TO_DISPLAY_P3, xyz)

    return { r: p3[0], g: p3[1], b: p3[2] }
  },

  /**
   * Convert Display P3 (linear) to sRGB (0-1 gamma encoded)
   * Values outside sRGB gamut will be clipped
   */
  toSrgb: (p3: DisplayP3): Srgb => {
    // Display P3 to XYZ D65
    const xyz = matmul(DISPLAY_P3_TO_XYZ, [p3.r, p3.g, p3.b])

    // XYZ D65 to linear sRGB
    const linear = matmul(XYZ_TO_SRGB, xyz)

    // Linear to sRGB with clipping
    return {
      r: Math.max(0, Math.min(1, linearToSrgb(Math.max(0, linear[0])))),
      g: Math.max(0, Math.min(1, linearToSrgb(Math.max(0, linear[1])))),
      b: Math.max(0, Math.min(1, linearToSrgb(Math.max(0, linear[2])))),
    }
  },

  /**
   * Convert Display P3 to XYZ D65
   */
  toXyz: (p3: DisplayP3): { x: number; y: number; z: number } => {
    const xyz = matmul(DISPLAY_P3_TO_XYZ, [p3.r, p3.g, p3.b])
    return { x: xyz[0], y: xyz[1], z: xyz[2] }
  },

  /**
   * Convert XYZ D65 to Display P3
   */
  fromXyz: (xyz: { x: number; y: number; z: number }): DisplayP3 => {
    const p3 = matmul(XYZ_TO_DISPLAY_P3, [xyz.x, xyz.y, xyz.z])
    return { r: p3[0], g: p3[1], b: p3[2] }
  },

  /**
   * Check if the color is within Display P3 gamut
   */
  isInGamut: (p3: DisplayP3): boolean => {
    return p3.r >= 0 && p3.r <= 1 &&
           p3.g >= 0 && p3.g <= 1 &&
           p3.b >= 0 && p3.b <= 1
  },

  /**
   * Check if sRGB color is within Display P3 gamut (always true since sRGB ⊂ P3)
   */
  containsSrgb: (_srgb: Srgb): boolean => {
    return true // sRGB is always within Display P3
  },
}
