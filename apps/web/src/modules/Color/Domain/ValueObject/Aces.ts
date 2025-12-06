import type { Srgb } from './Srgb'

/**
 * ACES AP0 color space (Academy Color Encoding System - Primary)
 * Scene-referred, linear light, wide gamut covering all visible colors
 * Used as the archival/interchange format
 */
export type AcesAp0 = {
  r: number // linear, can exceed 0-1
  g: number // linear, can exceed 0-1
  b: number // linear, can exceed 0-1
}

/**
 * ACES AP1 color space (ACEScg)
 * Scene-referred, linear light, working space for CGI
 * Smaller gamut than AP0 but still wider than Rec.2020
 */
export type AcesAp1 = {
  r: number // linear, can exceed 0-1
  g: number // linear, can exceed 0-1
  b: number // linear, can exceed 0-1
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

// XYZ D65 to ACES AP0 (with Bradford chromatic adaptation from D65 to ACES white ~D60)
const XYZ_TO_AP0 = [
  [1.0498110175, 0.0000000000, -0.0000974845],
  [-0.4959030231, 1.3733130458, 0.0982400361],
  [0.0000000000, 0.0000000000, 0.9912520182],
] as const

// ACES AP0 to XYZ D65 (with Bradford chromatic adaptation from ACES white ~D60 to D65)
const AP0_TO_XYZ = [
  [0.9525523959, 0.0000000000, 0.0000936786],
  [0.3439664498, 0.7281660966, -0.0721325464],
  [0.0000000000, 0.0000000000, 1.0088251844],
] as const

// ACES AP0 to AP1
const AP0_TO_AP1 = [
  [1.4514393161, -0.2365107469, -0.2149285693],
  [-0.0765537734, 1.1762296998, -0.0996759264],
  [0.0083161484, -0.0060324498, 0.9977163014],
] as const

// ACES AP1 to AP0
const AP1_TO_AP0 = [
  [0.6954522414, 0.1406786965, 0.1638690622],
  [0.0447945634, 0.8596711185, 0.0955343182],
  [-0.0055258826, 0.0040252103, 1.0015006723],
] as const

// XYZ D65 to ACES AP1 (combined)
const XYZ_TO_AP1 = [
  [1.6410233797, -0.3248032942, -0.2364246952],
  [-0.6636628587, 1.6153315917, 0.0167563477],
  [0.0117218943, -0.0082844420, 0.9883948585],
] as const

// ACES AP1 to XYZ D65 (combined)
const AP1_TO_XYZ = [
  [0.6624541811, 0.1340042065, 0.1561876870],
  [0.2722287168, 0.6740817658, 0.0536895174],
  [-0.0055746495, 0.0040607335, 1.0103391003],
] as const

// Matrix multiplication helper
const matmul = (m: readonly (readonly number[])[], v: [number, number, number]): [number, number, number] => {
  return [
    m[0]![0]! * v[0] + m[0]![1]! * v[1] + m[0]![2]! * v[2],
    m[1]![0]! * v[0] + m[1]![1]! * v[1] + m[1]![2]! * v[2],
    m[2]![0]! * v[0] + m[2]![1]! * v[1] + m[2]![2]! * v[2],
  ]
}

export const $AcesAp0 = {
  /**
   * Create ACES AP0 from component values
   */
  create: (r: number, g: number, b: number): AcesAp0 => ({ r, g, b }),

  /**
   * Convert sRGB (0-1 gamma encoded) to ACES AP0 (linear, scene-referred)
   */
  fromSrgb: (srgb: Srgb): AcesAp0 => {
    // sRGB to linear
    const linearR = srgbToLinear(srgb.r)
    const linearG = srgbToLinear(srgb.g)
    const linearB = srgbToLinear(srgb.b)

    // Linear sRGB to XYZ D65
    const xyz = matmul(SRGB_TO_XYZ, [linearR, linearG, linearB])

    // XYZ D65 to ACES AP0
    const ap0 = matmul(XYZ_TO_AP0, xyz)

    return { r: ap0[0], g: ap0[1], b: ap0[2] }
  },

  /**
   * Convert ACES AP0 to sRGB (0-1 gamma encoded)
   * Values outside sRGB gamut will be clipped
   */
  toSrgb: (aces: AcesAp0): Srgb => {
    // ACES AP0 to XYZ D65
    const xyz = matmul(AP0_TO_XYZ, [aces.r, aces.g, aces.b])

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
   * Convert ACES AP0 to AP1
   */
  toAp1: (ap0: AcesAp0): AcesAp1 => {
    const ap1 = matmul(AP0_TO_AP1, [ap0.r, ap0.g, ap0.b])
    return { r: ap1[0], g: ap1[1], b: ap1[2] }
  },

  /**
   * Check if the color is within ACES AP0 valid range
   * AP0 can represent colors outside the visible spectrum
   */
  isValid: (aces: AcesAp0): boolean => {
    // AP0 has no theoretical bounds, but negative values in all channels indicate invalid
    return !(aces.r < 0 && aces.g < 0 && aces.b < 0)
  },
}

export const $AcesAp1 = {
  /**
   * Create ACES AP1 from component values
   */
  create: (r: number, g: number, b: number): AcesAp1 => ({ r, g, b }),

  /**
   * Convert sRGB (0-1 gamma encoded) to ACES AP1 (linear, scene-referred)
   */
  fromSrgb: (srgb: Srgb): AcesAp1 => {
    // sRGB to linear
    const linearR = srgbToLinear(srgb.r)
    const linearG = srgbToLinear(srgb.g)
    const linearB = srgbToLinear(srgb.b)

    // Linear sRGB to XYZ D65
    const xyz = matmul(SRGB_TO_XYZ, [linearR, linearG, linearB])

    // XYZ D65 to ACES AP1
    const ap1 = matmul(XYZ_TO_AP1, xyz)

    return { r: ap1[0], g: ap1[1], b: ap1[2] }
  },

  /**
   * Convert ACES AP1 to sRGB (0-1 gamma encoded)
   * Values outside sRGB gamut will be clipped
   */
  toSrgb: (aces: AcesAp1): Srgb => {
    // ACES AP1 to XYZ D65
    const xyz = matmul(AP1_TO_XYZ, [aces.r, aces.g, aces.b])

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
   * Convert ACES AP1 to AP0
   */
  toAp0: (ap1: AcesAp1): AcesAp0 => {
    const ap0 = matmul(AP1_TO_AP0, [ap1.r, ap1.g, ap1.b])
    return { r: ap0[0], g: ap0[1], b: ap0[2] }
  },

  /**
   * Check if the color is within AP1 gamut
   * AP1 has a well-defined gamut boundary
   */
  isInGamut: (aces: AcesAp1): boolean => {
    return aces.r >= 0 && aces.g >= 0 && aces.b >= 0
  },
}
