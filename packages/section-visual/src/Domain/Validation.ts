/**
 * Validation Module
 *
 * Centralized validation for dynamic schema-based parameters.
 * Uses Registry definitions and @practice/schema for runtime validation.
 */

import { validate, getDefaults, type ObjectSchema, type ValidationError } from '@practice/schema'
import { getSurfaceDefinition, type GenericSurfaceParams } from '@practice/texture'
import { getMaskDefinition, type GenericMaskConfig } from '../Infra/MaskRegistry'
import { EFFECT_REGISTRY, type EffectType } from './EffectRegistry'

// ============================================================
// Types
// ============================================================

export interface ValidationResult<T = Record<string, unknown>> {
  /** Whether the params are valid */
  valid: boolean
  /** Validation errors (if any) */
  errors: ValidationError[]
  /** Coerced/normalized params (with defaults applied) */
  coerced?: T
}

// ============================================================
// Surface Validation
// ============================================================

/**
 * Validate surface parameters using registry schema
 *
 * @param params - Surface parameters to validate
 * @returns Validation result with errors and coerced values
 */
export function validateSurfaceParams(params: GenericSurfaceParams): ValidationResult<GenericSurfaceParams> {
  const { type } = params
  const def = getSurfaceDefinition(type)

  if (!def) {
    return {
      valid: false,
      errors: [{ field: 'type', message: `Unknown surface type: ${type}`, value: type }],
    }
  }

  const errors = validate(def.schema, params)

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  // Merge with defaults to get coerced values
  const defaults = getDefaults(def.schema)
  const coerced: GenericSurfaceParams = {
    ...defaults,
    ...params,
    type, // Ensure type is preserved
  }

  return { valid: true, errors: [], coerced }
}

// ============================================================
// Mask Validation
// ============================================================

/**
 * Validate mask config using registry schema
 *
 * @param config - Mask config to validate
 * @returns Validation result with errors and coerced values
 */
export function validateMaskConfig(config: GenericMaskConfig): ValidationResult<GenericMaskConfig> {
  const { shape } = config
  const def = getMaskDefinition(shape)

  if (!def) {
    return {
      valid: false,
      errors: [{ field: 'shape', message: `Unknown mask shape: ${shape}`, value: shape }],
    }
  }

  const errors = validate(def.schema, config)

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  // Merge with base defaults and shape-specific defaults
  const baseDefaults = {
    enabled: true,
    feather: 0,
    invert: false,
  }
  const shapeDefaults = getDefaults(def.schema)
  const coerced: GenericMaskConfig = {
    ...baseDefaults,
    ...shapeDefaults,
    ...config,
    shape,
  }

  return { valid: true, errors: [], coerced }
}

// ============================================================
// Effect Validation
// ============================================================

/**
 * Generic effect parameters
 */
export interface GenericEffectParams {
  type: string
  [key: string]: unknown
}

/**
 * Validate effect parameters using registry schema
 *
 * @param params - Effect parameters to validate
 * @returns Validation result with errors and coerced values
 */
export function validateEffectParams(params: GenericEffectParams): ValidationResult<GenericEffectParams> {
  const { type } = params

  if (!(type in EFFECT_REGISTRY)) {
    return {
      valid: false,
      errors: [{ field: 'type', message: `Unknown effect type: ${type}`, value: type }],
    }
  }

  const def = EFFECT_REGISTRY[type as EffectType]
  const errors = validate(def.schema, params)

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  // Merge with defaults to get coerced values
  const defaults = getDefaults(def.schema)
  const coerced: GenericEffectParams = {
    ...defaults,
    ...params,
    type, // Ensure type is preserved
  }

  return { valid: true, errors: [], coerced }
}

// ============================================================
// Generic Validation Helper
// ============================================================

/**
 * Validate parameters against a schema
 *
 * @param schema - Object schema to validate against
 * @param params - Parameters to validate
 * @returns Validation result with errors and coerced values
 */
export function validateParams<T extends Record<string, unknown>>(
  schema: ObjectSchema,
  params: T
): ValidationResult<T> {
  const errors = validate(schema, params)

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  const defaults = getDefaults(schema) as T
  const coerced: T = { ...defaults, ...params }

  return { valid: true, errors: [], coerced }
}

// ============================================================
// Coercion Helpers
// ============================================================

/**
 * Coerce surface params to have all required fields with defaults
 */
export function coerceSurfaceParams(params: GenericSurfaceParams): GenericSurfaceParams {
  const result = validateSurfaceParams(params)
  return result.coerced ?? params
}

/**
 * Coerce mask config to have all required fields with defaults
 */
export function coerceMaskConfig(config: GenericMaskConfig): GenericMaskConfig {
  const result = validateMaskConfig(config)
  return result.coerced ?? config
}

/**
 * Coerce effect params to have all required fields with defaults
 */
export function coerceEffectParams(params: GenericEffectParams): GenericEffectParams {
  const result = validateEffectParams(params)
  return result.coerced ?? params
}
