import type { Oklch } from '@practice/color'
import { contrastRatio, WCAG_CONTRAST_AA } from '@practice/color'
import { validateFoundationColor, type FoundationColorValidationError } from './FoundationColor'
import { validateBrandColor, type BrandColorValidationError } from './BrandColor'

/**
 * Required contrast ratio between brandText and foundation for WCAG AA compliance
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
  | { type: 'FOUNDATION_INVALID'; errors: FoundationColorValidationError[] }
  | { type: 'BRAND_INVALID'; errors: BrandColorValidationError[] }
  | { type: 'INSUFFICIENT_CONTRAST'; actual: number; required: number }

/**
 * Validate both Foundation and Brand colors individually and their combination
 *
 * The combination must satisfy:
 * - brandText (derived from brand) must have contrast ratio >= 4.5 against foundation
 */
export const validateColorPair = (
  foundation: Oklch,
  brand: Oklch
): ColorPairValidationResult => {
  const errors: ColorPairValidationError[] = []

  // Validate individual colors
  const foundationResult = validateFoundationColor(foundation)
  if (!foundationResult.valid) {
    errors.push({ type: 'FOUNDATION_INVALID', errors: foundationResult.errors })
  }

  const brandResult = validateBrandColor(brand)
  if (!brandResult.valid) {
    errors.push({ type: 'BRAND_INVALID', errors: brandResult.errors })
  }

  // Check contrast ratio between brandText and foundation
  const brandText = deriveBrandText(brand)
  const ratio = contrastRatio(brandText, foundation)

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
 * Calculate the allowable Foundation L range for a given Brand color
 * Returns [Lmin, Lmax] where any Foundation.L in this range will meet contrast requirements
 *
 * Due to how contrast works:
 * - If brand is dark -> valid foundations are on the LIGHT side (high L)
 * - If brand is light -> valid foundations are on the DARK side (low L)
 *
 * The returned range represents the continuous region of valid L values.
 */
export const getAllowableFoundationLRange = (
  brand: Oklch,
  requiredRatio: number = REQUIRED_CONTRAST_RATIO
): { min: number; max: number } | null => {
  const brandText = deriveBrandText(brand)
  const FOUNDATION_L_MIN = 0.08
  const FOUNDATION_L_MAX = 0.98

  // Check contrast at both extremes
  const foundationAtMin: Oklch = { L: FOUNDATION_L_MIN, C: 0, H: brand.H }
  const foundationAtMax: Oklch = { L: FOUNDATION_L_MAX, C: 0, H: brand.H }
  const ratioAtMin = contrastRatio(brandText, foundationAtMin)
  const ratioAtMax = contrastRatio(brandText, foundationAtMax)

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
    // Valid range is on the LIGHT side: [threshold, FOUNDATION_L_MAX]
    // Binary search for the threshold (lowest L that meets contrast)
    let low = FOUNDATION_L_MIN
    let high = FOUNDATION_L_MAX
    for (let i = 0; i < 30; i++) {
      const mid = (low + high) / 2
      const testFoundation: Oklch = { L: mid, C: 0, H: brand.H }
      const ratio = contrastRatio(brandText, testFoundation)
      if (ratio >= requiredRatio) {
        high = mid
      } else {
        low = mid
      }
    }
    return { min: high, max: FOUNDATION_L_MAX }
  }

  if (validAtDarkEnd && !validAtLightEnd) {
    // Valid range is on the DARK side: [FOUNDATION_L_MIN, threshold]
    // Binary search for the threshold (highest L that meets contrast)
    let low = FOUNDATION_L_MIN
    let high = FOUNDATION_L_MAX
    for (let i = 0; i < 30; i++) {
      const mid = (low + high) / 2
      const testFoundation: Oklch = { L: mid, C: 0, H: brand.H }
      const ratio = contrastRatio(brandText, testFoundation)
      if (ratio >= requiredRatio) {
        low = mid
      } else {
        high = mid
      }
    }
    return { min: FOUNDATION_L_MIN, max: low }
  }

  // Both ends are valid - this means brand is very close to mid and we have
  // two separate valid ranges (very dark AND very light foundations work)
  // For simplicity, return the larger range based on brand lightness
  if (brand.L > 0.5) {
    // Brand is light, prefer dark foundations
    let low = FOUNDATION_L_MIN
    let high = FOUNDATION_L_MAX
    for (let i = 0; i < 30; i++) {
      const mid = (low + high) / 2
      const testFoundation: Oklch = { L: mid, C: 0, H: brand.H }
      const ratio = contrastRatio(brandText, testFoundation)
      if (ratio >= requiredRatio) {
        low = mid
      } else {
        high = mid
      }
    }
    return { min: FOUNDATION_L_MIN, max: low }
  } else {
    // Brand is dark, prefer light foundations
    let low = FOUNDATION_L_MIN
    let high = FOUNDATION_L_MAX
    for (let i = 0; i < 30; i++) {
      const mid = (low + high) / 2
      const testFoundation: Oklch = { L: mid, C: 0, H: brand.H }
      const ratio = contrastRatio(brandText, testFoundation)
      if (ratio >= requiredRatio) {
        high = mid
      } else {
        low = mid
      }
    }
    return { min: high, max: FOUNDATION_L_MAX }
  }
}

/**
 * Check if a Foundation L value is within the allowable range for a Brand
 */
export const isFoundationLInAllowableRange = (
  foundationL: number,
  brand: Oklch,
  requiredRatio: number = REQUIRED_CONTRAST_RATIO
): boolean => {
  const range = getAllowableFoundationLRange(brand, requiredRatio)
  if (!range) return false
  return foundationL >= range.min && foundationL <= range.max
}

export const $ColorPairValidation = {
  requiredContrastRatio: REQUIRED_CONTRAST_RATIO,
  deriveBrandText,
  validate: validateColorPair,
  getAllowableFoundationLRange,
  isFoundationLInAllowableRange,
}
