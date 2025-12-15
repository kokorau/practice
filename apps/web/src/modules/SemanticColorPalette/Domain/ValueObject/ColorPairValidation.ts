import type { Oklch } from '@practice/color'
import { contrastRatio, WCAG_CONTRAST_AA } from '@practice/color'
import { validateBaseColor, type BaseColorValidationError } from './BaseColor'
import { validateBrandColor, type BrandColorValidationError } from './BrandColor'

/**
 * Required contrast ratio between brandText and base for WCAG AA compliance
 */
export const REQUIRED_CONTRAST_RATIO = WCAG_CONTRAST_AA // 4.5

/**
 * Generate a text-optimized variant of the brand color
 * Reduces chroma slightly for better readability as text
 */
export const deriveBrandText = (brand: Oklch): Oklch => {
  // Reduce chroma by 10% for text usage (more readable)
  const textChroma = brand.C * 0.9
  return { L: brand.L, C: textChroma, H: brand.H }
}

export type ColorPairValidationResult =
  | { valid: true; contrastRatio: number }
  | { valid: false; errors: ColorPairValidationError[]; contrastRatio: number }

export type ColorPairValidationError =
  | { type: 'BASE_INVALID'; errors: BaseColorValidationError[] }
  | { type: 'BRAND_INVALID'; errors: BrandColorValidationError[] }
  | { type: 'INSUFFICIENT_CONTRAST'; actual: number; required: number }

/**
 * Validate both Base and Brand colors individually and their combination
 *
 * The combination must satisfy:
 * - brandText (derived from brand) must have contrast ratio >= 4.5 against base
 */
export const validateColorPair = (
  base: Oklch,
  brand: Oklch
): ColorPairValidationResult => {
  const errors: ColorPairValidationError[] = []

  // Validate individual colors
  const baseResult = validateBaseColor(base)
  if (!baseResult.valid) {
    errors.push({ type: 'BASE_INVALID', errors: baseResult.errors })
  }

  const brandResult = validateBrandColor(brand)
  if (!brandResult.valid) {
    errors.push({ type: 'BRAND_INVALID', errors: brandResult.errors })
  }

  // Check contrast ratio between brandText and base
  const brandText = deriveBrandText(brand)
  const ratio = contrastRatio(brandText, base)

  if (ratio < REQUIRED_CONTRAST_RATIO) {
    errors.push({
      type: 'INSUFFICIENT_CONTRAST',
      actual: ratio,
      required: REQUIRED_CONTRAST_RATIO,
    })
  }

  if (errors.length > 0) {
    return { valid: false, errors, contrastRatio: ratio }
  }

  return { valid: true, contrastRatio: ratio }
}

/**
 * Calculate the allowable Base L range for a given Brand color
 * Returns [Lmin, Lmax] where any Base.L in this range will meet contrast requirements
 *
 * Due to how contrast works:
 * - If brand is dark -> valid bases are on the LIGHT side (high L)
 * - If brand is light -> valid bases are on the DARK side (low L)
 *
 * The returned range represents the continuous region of valid L values.
 */
export const getAllowableBaseLRange = (
  brand: Oklch,
  requiredRatio: number = REQUIRED_CONTRAST_RATIO
): { min: number; max: number } | null => {
  const brandText = deriveBrandText(brand)
  const BASE_L_MIN = 0.08
  const BASE_L_MAX = 0.98

  // Check contrast at both extremes
  const baseAtMin: Oklch = { L: BASE_L_MIN, C: 0, H: brand.H }
  const baseAtMax: Oklch = { L: BASE_L_MAX, C: 0, H: brand.H }
  const ratioAtMin = contrastRatio(brandText, baseAtMin)
  const ratioAtMax = contrastRatio(brandText, baseAtMax)

  // Determine which side(s) have valid contrast
  const validAtDarkEnd = ratioAtMin >= requiredRatio
  const validAtLightEnd = ratioAtMax >= requiredRatio

  if (!validAtDarkEnd && !validAtLightEnd) {
    // No valid range (brand is too close to mid-gray)
    return null
  }

  // For UI, we want to return ONE contiguous range
  // If brand is dark (low L), valid range is on light side
  // If brand is light (high L), valid range is on dark side
  if (validAtLightEnd && !validAtDarkEnd) {
    // Valid range is on the LIGHT side: [threshold, BASE_L_MAX]
    // Binary search for the threshold (lowest L that meets contrast)
    let low = BASE_L_MIN
    let high = BASE_L_MAX
    for (let i = 0; i < 30; i++) {
      const mid = (low + high) / 2
      const testBase: Oklch = { L: mid, C: 0, H: brand.H }
      const ratio = contrastRatio(brandText, testBase)
      if (ratio >= requiredRatio) {
        high = mid
      } else {
        low = mid
      }
    }
    return { min: high, max: BASE_L_MAX }
  }

  if (validAtDarkEnd && !validAtLightEnd) {
    // Valid range is on the DARK side: [BASE_L_MIN, threshold]
    // Binary search for the threshold (highest L that meets contrast)
    let low = BASE_L_MIN
    let high = BASE_L_MAX
    for (let i = 0; i < 30; i++) {
      const mid = (low + high) / 2
      const testBase: Oklch = { L: mid, C: 0, H: brand.H }
      const ratio = contrastRatio(brandText, testBase)
      if (ratio >= requiredRatio) {
        low = mid
      } else {
        high = mid
      }
    }
    return { min: BASE_L_MIN, max: low }
  }

  // Both ends are valid - this means brand is very close to mid and we have
  // two separate valid ranges (very dark AND very light bases work)
  // For simplicity, return the larger range based on brand lightness
  if (brand.L > 0.5) {
    // Brand is light, prefer dark bases
    let low = BASE_L_MIN
    let high = BASE_L_MAX
    for (let i = 0; i < 30; i++) {
      const mid = (low + high) / 2
      const testBase: Oklch = { L: mid, C: 0, H: brand.H }
      const ratio = contrastRatio(brandText, testBase)
      if (ratio >= requiredRatio) {
        low = mid
      } else {
        high = mid
      }
    }
    return { min: BASE_L_MIN, max: low }
  } else {
    // Brand is dark, prefer light bases
    let low = BASE_L_MIN
    let high = BASE_L_MAX
    for (let i = 0; i < 30; i++) {
      const mid = (low + high) / 2
      const testBase: Oklch = { L: mid, C: 0, H: brand.H }
      const ratio = contrastRatio(brandText, testBase)
      if (ratio >= requiredRatio) {
        high = mid
      } else {
        low = mid
      }
    }
    return { min: high, max: BASE_L_MAX }
  }
}

/**
 * Check if a Base L value is within the allowable range for a Brand
 */
export const isBaseLInAllowableRange = (
  baseL: number,
  brand: Oklch,
  requiredRatio: number = REQUIRED_CONTRAST_RATIO
): boolean => {
  const range = getAllowableBaseLRange(brand, requiredRatio)
  if (!range) return false
  return baseL >= range.min && baseL <= range.max
}

export const $ColorPairValidation = {
  requiredContrastRatio: REQUIRED_CONTRAST_RATIO,
  deriveBrandText,
  validate: validateColorPair,
  getAllowableBaseLRange,
  isBaseLInAllowableRange,
}
