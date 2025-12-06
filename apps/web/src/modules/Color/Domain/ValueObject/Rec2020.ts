import type { Srgb } from './Srgb'

/**
 * Rec.2020 (BT.2020) color space
 * Wide gamut color space for UHDTV (4K/8K)
 * Uses linear light values (no gamma)
 */
export type Rec2020 = {
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

// Rec.2020 (linear) to XYZ D65
const REC2020_TO_XYZ = [
  [0.6369580483, 0.1446169036, 0.1688809752],
  [0.2627002120, 0.6779980715, 0.0593017165],
  [0.0000000000, 0.0280726930, 1.0609850577],
] as const

// XYZ D65 to Rec.2020 (linear)
const XYZ_TO_REC2020 = [
  [1.7166511880, -0.3556707838, -0.2533662814],
  [-0.6666843518, 1.6164812366, 0.0157685458],
  [0.0176398574, -0.0427706133, 0.9421031212],
] as const

// Matrix multiplication helper
const matmul = (m: readonly (readonly number[])[], v: [number, number, number]): [number, number, number] => {
  return [
    m[0]![0]! * v[0] + m[0]![1]! * v[1] + m[0]![2]! * v[2],
    m[1]![0]! * v[0] + m[1]![1]! * v[1] + m[1]![2]! * v[2],
    m[2]![0]! * v[0] + m[2]![1]! * v[1] + m[2]![2]! * v[2],
  ]
}

export const $Rec2020 = {
  /**
   * Create Rec2020 from component values
   */
  create: (r: number, g: number, b: number): Rec2020 => ({ r, g, b }),

  /**
   * Convert sRGB (0-1 gamma encoded) to Rec.2020 (linear)
   */
  fromSrgb: (srgb: Srgb): Rec2020 => {
    // sRGB to linear
    const linearR = srgbToLinear(srgb.r)
    const linearG = srgbToLinear(srgb.g)
    const linearB = srgbToLinear(srgb.b)

    // Linear sRGB to XYZ D65
    const xyz = matmul(SRGB_TO_XYZ, [linearR, linearG, linearB])

    // XYZ D65 to Rec.2020
    const rec2020 = matmul(XYZ_TO_REC2020, xyz)

    return { r: rec2020[0], g: rec2020[1], b: rec2020[2] }
  },

  /**
   * Convert Rec.2020 (linear) to sRGB (0-1 gamma encoded)
   * Values outside sRGB gamut will be clipped
   */
  toSrgb: (rec2020: Rec2020): Srgb => {
    // Rec.2020 to XYZ D65
    const xyz = matmul(REC2020_TO_XYZ, [rec2020.r, rec2020.g, rec2020.b])

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
   * Convert Rec.2020 to XYZ D65
   */
  toXyz: (rec2020: Rec2020): { x: number; y: number; z: number } => {
    const xyz = matmul(REC2020_TO_XYZ, [rec2020.r, rec2020.g, rec2020.b])
    return { x: xyz[0], y: xyz[1], z: xyz[2] }
  },

  /**
   * Convert XYZ D65 to Rec.2020
   */
  fromXyz: (xyz: { x: number; y: number; z: number }): Rec2020 => {
    const rec2020 = matmul(XYZ_TO_REC2020, [xyz.x, xyz.y, xyz.z])
    return { r: rec2020[0], g: rec2020[1], b: rec2020[2] }
  },

  /**
   * Check if the color is within Rec.2020 gamut
   */
  isInGamut: (rec2020: Rec2020): boolean => {
    return rec2020.r >= 0 && rec2020.r <= 1 &&
           rec2020.g >= 0 && rec2020.g <= 1 &&
           rec2020.b >= 0 && rec2020.b <= 1
  },

  /**
   * Check if sRGB color is within Rec.2020 gamut (always true since sRGB ⊂ Rec.2020)
   */
  containsSrgb: (_srgb: Srgb): boolean => {
    return true // sRGB is always within Rec.2020
  },
}
