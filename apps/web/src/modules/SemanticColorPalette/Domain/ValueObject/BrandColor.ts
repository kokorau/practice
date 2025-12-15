import type { Oklch } from '@practice/color'
import { $Oklch } from '@practice/color'

/**
 * BrandColor constraints
 * Brand is the "ink" - the identity color for accents, links, CTAs
 */
export const BRAND_COLOR_CONSTRAINTS = {
  L: { min: 0.20, max: 0.85 },
  C: { min: 0.04, max: 0.35 },
} as const

export type BrandColorValidationResult =
  | { valid: true; value: Oklch }
  | { valid: false; errors: BrandColorValidationError[] }

export type BrandColorValidationError =
  | { type: 'L_TOO_LOW'; actual: number; min: number }
  | { type: 'L_TOO_HIGH'; actual: number; max: number }
  | { type: 'C_TOO_LOW'; actual: number; min: number }
  | { type: 'C_TOO_HIGH'; actual: number; max: number }
  | { type: 'OUT_OF_P3_GAMUT' }

/**
 * Validate if a color meets BrandColor constraints
 */
export const validateBrandColor = (color: Oklch): BrandColorValidationResult => {
  const errors: BrandColorValidationError[] = []
  const { L, C } = color
  const { L: lConstraint, C: cConstraint } = BRAND_COLOR_CONSTRAINTS

  if (L < lConstraint.min) {
    errors.push({ type: 'L_TOO_LOW', actual: L, min: lConstraint.min })
  }
  if (L > lConstraint.max) {
    errors.push({ type: 'L_TOO_HIGH', actual: L, max: lConstraint.max })
  }
  if (C < cConstraint.min) {
    errors.push({ type: 'C_TOO_LOW', actual: C, min: cConstraint.min })
  }
  if (C > cConstraint.max) {
    errors.push({ type: 'C_TOO_HIGH', actual: C, max: cConstraint.max })
  }
  if (!$Oklch.isInP3Gamut(color)) {
    errors.push({ type: 'OUT_OF_P3_GAMUT' })
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }
  return { valid: true, value: color }
}

/**
 * Clamp a color to BrandColor constraints
 * Returns a valid BrandColor by clamping L and C within constraints
 */
export const clampToBrandColor = (color: Oklch): Oklch => {
  const { L: lConstraint, C: cConstraint } = BRAND_COLOR_CONSTRAINTS

  const clampedL = Math.max(lConstraint.min, Math.min(lConstraint.max, color.L))
  const clampedC = Math.max(cConstraint.min, Math.min(cConstraint.max, color.C))

  const clamped = { L: clampedL, C: clampedC, H: color.H }

  // Ensure within P3 gamut
  return $Oklch.clampToP3Gamut(clamped)
}

/**
 * Check if a color is a valid BrandColor
 */
export const isValidBrandColor = (color: Oklch): boolean => {
  return validateBrandColor(color).valid
}

export const $BrandColor = {
  constraints: BRAND_COLOR_CONSTRAINTS,
  validate: validateBrandColor,
  clamp: clampToBrandColor,
  isValid: isValidBrandColor,
}
