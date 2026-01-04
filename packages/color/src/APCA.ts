import type { Srgb } from './Srgb'
import type { DisplayP3 } from './DisplayP3'
import type { Oklch } from './Oklch'
import { $Oklch } from './Oklch'

/**
 * APCA-W3 (Advanced Perceptual Contrast Algorithm)
 *
 * Calculates perceptual contrast between text and background colors.
 * Unlike WCAG 2.x, APCA is asymmetric (text vs background matters).
 *
 * This implementation supports both sRGB and Display P3 color spaces
 * by converting to XYZ and using the Y (luminance) component.
 *
 * Reference: https://github.com/Myndex/SAPC-APCA
 */

// ============================================================================
// Constants (APCA-W3 0.0.98G-4g)
// ============================================================================

// Exponents for SAPC calculation
const Ntx = 0.57 // Text exponent (dark text on light bg)
const Nbg = 0.56 // Background exponent (dark text on light bg)
const Rtx = 0.62 // Text exponent (light text on dark bg)
const Rbg = 0.65 // Background exponent (light text on dark bg)

// Scale factor
const Scale = 1.14

// Output offsets
const OffsetPos = 0.027 // Positive offset
const OffsetNeg = 0.027 // Negative offset

// Soft clamp threshold
const ClampThreshold = 0.022
const ClampExp = 1.414

// ============================================================================
// XYZ Conversion Matrices (D65 white point)
// ============================================================================

// sRGB (linear) to XYZ D65
const SRGB_TO_XYZ_Y = [0.2126390059, 0.7151686788, 0.0721923154] as const

// Display P3 (linear) to XYZ D65
const DISPLAY_P3_TO_XYZ_Y = [0.2289745641, 0.6917385218, 0.0792869141] as const

// ============================================================================
// Gamma Functions
// ============================================================================

/**
 * sRGB gamma expansion (IEC 61966-2-1)
 */
const srgbToLinear = (c: number): number => {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

/**
 * Display P3 uses the same transfer function as sRGB
 */
const p3ToLinear = srgbToLinear

// ============================================================================
// Luminance (Y) Extraction
// ============================================================================

/**
 * Extract Y (luminance) from sRGB color via XYZ
 * This is the APCA-specific luminance calculation.
 */
export const srgbToY = (srgb: Srgb): number => {
  const rLin = srgbToLinear(srgb.r)
  const gLin = srgbToLinear(srgb.g)
  const bLin = srgbToLinear(srgb.b)

  return (
    SRGB_TO_XYZ_Y[0] * rLin +
    SRGB_TO_XYZ_Y[1] * gLin +
    SRGB_TO_XYZ_Y[2] * bLin
  )
}

/**
 * Extract Y (luminance) from Display P3 color via XYZ
 * Note: P3 input is expected to be gamma-encoded (like CSS color(display-p3 ...))
 */
const displayP3ToY = (p3: DisplayP3): number => {
  const rLin = p3ToLinear(p3.r)
  const gLin = p3ToLinear(p3.g)
  const bLin = p3ToLinear(p3.b)

  return (
    DISPLAY_P3_TO_XYZ_Y[0] * rLin +
    DISPLAY_P3_TO_XYZ_Y[1] * gLin +
    DISPLAY_P3_TO_XYZ_Y[2] * bLin
  )
}

// ============================================================================
// APCA Core Calculation
// ============================================================================

/**
 * Soft clamp function for APCA
 * Prevents division issues near black
 */
const softClamp = (Y: number): number => {
  if (Y < 0) return 0
  return Y > ClampThreshold
    ? Y
    : Y + Math.pow(ClampThreshold - Y, ClampExp)
}

/**
 * Calculate APCA Lc (Lightness Contrast) from Y values
 *
 * @param textY - Luminance of text color (0-1)
 * @param bgY - Luminance of background color (0-1)
 * @returns Lc value (-108 to +106 typical range)
 *
 * Positive Lc: dark text on light background
 * Negative Lc: light text on dark background
 */
const calcLcFromY = (textY: number, bgY: number): number => {
  // Apply soft clamp
  const Ytxt = softClamp(textY)
  const Ybg = softClamp(bgY)

  // Calculate SAPC (Spatial Adaptive Perceptual Contrast)
  let SAPC: number

  if (Ybg > Ytxt) {
    // Dark text on light background (positive polarity)
    SAPC = (Math.pow(Ybg, Nbg) - Math.pow(Ytxt, Ntx)) * Scale
  } else {
    // Light text on dark background (negative polarity)
    SAPC = (Math.pow(Ybg, Rbg) - Math.pow(Ytxt, Rtx)) * Scale
  }

  // Apply offset and scale to Lc
  let Lc: number

  if (SAPC > OffsetPos) {
    Lc = (SAPC - OffsetPos) * 100
  } else if (SAPC < -OffsetNeg) {
    Lc = (SAPC + OffsetNeg) * 100
  } else {
    Lc = 0
  }

  return Lc
}

// ============================================================================
// Public API
// ============================================================================

/**
 * APCA result with additional information
 */
export type APCAResult = {
  /** Lc (Lightness Contrast) value */
  Lc: number
  /** Absolute Lc value for threshold comparison */
  absLc: number
  /** Text luminance (Y) */
  textY: number
  /** Background luminance (Y) */
  bgY: number
  /** Polarity: 'dark-on-light' or 'light-on-dark' */
  polarity: 'dark-on-light' | 'light-on-dark'
}

/**
 * Calculate APCA contrast from sRGB colors
 *
 * @param textColor - Text color in sRGB (gamma-encoded, 0-1)
 * @param bgColor - Background color in sRGB (gamma-encoded, 0-1)
 * @returns APCA result with Lc value and metadata
 */
export const apcaFromSrgb = (textColor: Srgb, bgColor: Srgb): APCAResult => {
  const textY = srgbToY(textColor)
  const bgY = srgbToY(bgColor)
  const Lc = calcLcFromY(textY, bgY)

  return {
    Lc,
    absLc: Math.abs(Lc),
    textY,
    bgY,
    polarity: bgY > textY ? 'dark-on-light' : 'light-on-dark',
  }
}

/**
 * Calculate APCA contrast from Display P3 colors
 *
 * @param textColor - Text color in Display P3 (gamma-encoded, 0-1)
 * @param bgColor - Background color in Display P3 (gamma-encoded, 0-1)
 * @returns APCA result with Lc value and metadata
 */
export const apcaFromDisplayP3 = (
  textColor: DisplayP3,
  bgColor: DisplayP3
): APCAResult => {
  const textY = displayP3ToY(textColor)
  const bgY = displayP3ToY(bgColor)
  const Lc = calcLcFromY(textY, bgY)

  return {
    Lc,
    absLc: Math.abs(Lc),
    textY,
    bgY,
    polarity: bgY > textY ? 'dark-on-light' : 'light-on-dark',
  }
}

/**
 * Calculate APCA contrast from Oklch colors (via sRGB)
 *
 * @param textColor - Text color in Oklch
 * @param bgColor - Background color in Oklch
 * @returns APCA result with Lc value and metadata
 */
export const apcaFromOklch = (textColor: Oklch, bgColor: Oklch): APCAResult => {
  const textSrgb = $Oklch.toSrgb(textColor)
  const bgSrgb = $Oklch.toSrgb(bgColor)
  return apcaFromSrgb(textSrgb, bgSrgb)
}

/**
 * Calculate raw Lc value from Y (luminance) values directly
 * Useful when you already have luminance values from XYZ conversion
 *
 * @param textY - Text luminance (0-1)
 * @param bgY - Background luminance (0-1)
 * @returns Lc value
 */
export const apcaFromY = (textY: number, bgY: number): number => {
  return calcLcFromY(textY, bgY)
}

// ============================================================================
// APCA Thresholds
// ============================================================================

/**
 * APCA minimum Lc values for different use cases
 * Based on APCA-W3 guidelines
 */
export const APCA_THRESHOLD = {
  /** Body text (14-16px) - requires highest contrast */
  BODY_TEXT: 75,
  /** Large text (24px+ or 18px bold) */
  LARGE_TEXT: 60,
  /** Very large text (36px+) or headlines */
  HEADLINE: 45,
  /** Non-text elements, icons, focus indicators */
  NON_TEXT: 30,
  /** Minimum perceivable (spot reading, logos) */
  MINIMUM: 15,
} as const

/**
 * Check if Lc meets threshold for body text
 */
export const meetsBodyText = (result: APCAResult): boolean => {
  return result.absLc >= APCA_THRESHOLD.BODY_TEXT
}

/**
 * Check if Lc meets threshold for large text
 */
export const meetsLargeText = (result: APCAResult): boolean => {
  return result.absLc >= APCA_THRESHOLD.LARGE_TEXT
}

/**
 * Check if Lc meets threshold for headlines
 */
export const meetsHeadline = (result: APCAResult): boolean => {
  return result.absLc >= APCA_THRESHOLD.HEADLINE
}

/**
 * Check if Lc meets threshold for non-text elements
 */
export const meetsNonText = (result: APCAResult): boolean => {
  return result.absLc >= APCA_THRESHOLD.NON_TEXT
}

export const $APCA = {
  fromSrgb: apcaFromSrgb,
  fromDisplayP3: apcaFromDisplayP3,
  fromOklch: apcaFromOklch,
  fromY: apcaFromY,
  srgbToY,
  meetsBodyText,
  meetsLargeText,
  meetsHeadline,
  meetsNonText,
  THRESHOLD: APCA_THRESHOLD,
}
