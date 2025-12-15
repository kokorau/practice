import type { Oklch } from '@practice/color'
import { $Oklch } from '@practice/color'

/**
 * FoundationColor constraints
 * Foundation is the "paper" - the foundation for all UI backgrounds
 */
export const FOUNDATION_COLOR_CONSTRAINTS = {
  L: { min: 0.08, max: 0.98 },
  C: { min: 0.00, max: 0.03 },
} as const

export type FoundationColorValidationResult =
  | { valid: true; value: Oklch }
  | { valid: false; errors: FoundationColorValidationError[] }

export type FoundationColorValidationError =
  | { type: 'L_TOO_LOW'; actual: number; min: number }
  | { type: 'L_TOO_HIGH'; actual: number; max: number }
  | { type: 'C_TOO_HIGH'; actual: number; max: number }
  | { type: 'OUT_OF_P3_GAMUT' }

/**
 * Validate if a color meets FoundationColor constraints
 */
export const validateFoundationColor = (color: Oklch): FoundationColorValidationResult => {
  const errors: FoundationColorValidationError[] = []
  const { L, C } = color
  const { L: lConstraint, C: cConstraint } = FOUNDATION_COLOR_CONSTRAINTS

  if (L < lConstraint.min) {
    errors.push({ type: 'L_TOO_LOW', actual: L, min: lConstraint.min })
  }
  if (L > lConstraint.max) {
    errors.push({ type: 'L_TOO_HIGH', actual: L, max: lConstraint.max })
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
 * Clamp a color to FoundationColor constraints
 * Returns a valid FoundationColor by clamping L and C within constraints
 */
export const clampToFoundationColor = (color: Oklch): Oklch => {
  const { L: lConstraint, C: cConstraint } = FOUNDATION_COLOR_CONSTRAINTS

  const clampedL = Math.max(lConstraint.min, Math.min(lConstraint.max, color.L))
  const clampedC = Math.min(cConstraint.max, color.C)

  const clamped = { L: clampedL, C: clampedC, H: color.H }

  // Ensure within P3 gamut
  return $Oklch.clampToP3Gamut(clamped)
}

/**
 * Check if a color is a valid FoundationColor
 */
export const isValidFoundationColor = (color: Oklch): boolean => {
  return validateFoundationColor(color).valid
}

export const $FoundationColor = {
  constraints: FOUNDATION_COLOR_CONSTRAINTS,
  validate: validateFoundationColor,
  clamp: clampToFoundationColor,
  isValid: isValidFoundationColor,
}
