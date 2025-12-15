import type { Oklch } from '@practice/color'
import { $Oklch } from '@practice/color'

/**
 * BaseColor constraints
 * Base is the "paper" - the foundation for all UI backgrounds
 */
export const BASE_COLOR_CONSTRAINTS = {
  L: { min: 0.08, max: 0.98 },
  C: { min: 0.00, max: 0.03 },
} as const

export type BaseColorValidationResult =
  | { valid: true; value: Oklch }
  | { valid: false; errors: BaseColorValidationError[] }

export type BaseColorValidationError =
  | { type: 'L_TOO_LOW'; actual: number; min: number }
  | { type: 'L_TOO_HIGH'; actual: number; max: number }
  | { type: 'C_TOO_HIGH'; actual: number; max: number }
  | { type: 'OUT_OF_P3_GAMUT' }

/**
 * Validate if a color meets BaseColor constraints
 */
export const validateBaseColor = (color: Oklch): BaseColorValidationResult => {
  const errors: BaseColorValidationError[] = []
  const { L, C } = color
  const { L: lConstraint, C: cConstraint } = BASE_COLOR_CONSTRAINTS

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
 * Clamp a color to BaseColor constraints
 * Returns a valid BaseColor by clamping L and C within constraints
 */
export const clampToBaseColor = (color: Oklch): Oklch => {
  const { L: lConstraint, C: cConstraint } = BASE_COLOR_CONSTRAINTS

  const clampedL = Math.max(lConstraint.min, Math.min(lConstraint.max, color.L))
  const clampedC = Math.min(cConstraint.max, color.C)

  const clamped = { L: clampedL, C: clampedC, H: color.H }

  // Ensure within P3 gamut
  return $Oklch.clampToP3Gamut(clamped)
}

/**
 * Check if a color is a valid BaseColor
 */
export const isValidBaseColor = (color: Oklch): boolean => {
  return validateBaseColor(color).valid
}

export const $BaseColor = {
  constraints: BASE_COLOR_CONSTRAINTS,
  validate: validateBaseColor,
  clamp: clampToBaseColor,
  isValid: isValidBaseColor,
}
