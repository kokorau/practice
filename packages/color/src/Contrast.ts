import type { Oklch } from './Oklch'
import { $Oklch } from './Oklch'
import type { Srgb } from './Srgb'

/**
 * Calculate relative luminance from sRGB color (WCAG 2.1 definition)
 * https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html
 *
 * @param srgb - sRGB color with values in 0-1 range
 * @returns Relative luminance (0-1)
 */
const srgbToRelativeLuminance = (srgb: Srgb): number => {
  const linearize = (channel: number): number => {
    return channel <= 0.04045
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4)
  }

  const rLin = linearize(srgb.r)
  const gLin = linearize(srgb.g)
  const bLin = linearize(srgb.b)

  // WCAG luminance coefficients
  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin
}

/**
 * Calculate WCAG 2.1 contrast ratio between two colors
 *
 * Contrast ratio formula: (L1 + 0.05) / (L2 + 0.05)
 * where L1 is the lighter and L2 is the darker relative luminance
 *
 * @param color1 - First Oklch color
 * @param color2 - Second Oklch color
 * @returns Contrast ratio (1.0 to 21.0)
 */
export const contrastRatio = (color1: Oklch, color2: Oklch): number => {
  const srgb1 = $Oklch.toSrgb(color1)
  const srgb2 = $Oklch.toSrgb(color2)

  const lum1 = srgbToRelativeLuminance(srgb1)
  const lum2 = srgbToRelativeLuminance(srgb2)

  const lighter = Math.max(lum1, lum2)
  const darker = Math.min(lum1, lum2)

  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * WCAG 2.1 contrast level thresholds
 */
export const WCAG_CONTRAST_AA = 4.5
export const WCAG_CONTRAST_AA_LARGE = 3.0
export const WCAG_CONTRAST_AAA = 7.0
export const WCAG_CONTRAST_AAA_LARGE = 4.5

/**
 * Check if contrast ratio meets WCAG AA requirement for normal text (>= 4.5:1)
 */
export const meetsWcagAA = (color1: Oklch, color2: Oklch): boolean => {
  return contrastRatio(color1, color2) >= WCAG_CONTRAST_AA
}

/**
 * Check if contrast ratio meets WCAG AAA requirement for normal text (>= 7:1)
 */
export const meetsWcagAAA = (color1: Oklch, color2: Oklch): boolean => {
  return contrastRatio(color1, color2) >= WCAG_CONTRAST_AAA
}

export const $Contrast = {
  contrastRatio,
  meetsWcagAA,
  meetsWcagAAA,
  WCAG_CONTRAST_AA,
  WCAG_CONTRAST_AA_LARGE,
  WCAG_CONTRAST_AAA,
  WCAG_CONTRAST_AAA_LARGE,
}
