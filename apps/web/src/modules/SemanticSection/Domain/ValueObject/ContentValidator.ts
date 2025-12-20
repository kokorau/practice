/**
 * ContentValidator - Runtime validation of content against schema
 *
 * Validates text length, list counts, and required fields.
 */

import type { SectionContent } from './SectionContent'
import type { SectionSchema, FieldSchema, FieldConstraints } from './SectionSchema'
import { $FieldSchema } from './SectionSchema'

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Single validation error
 */
export interface ValidationError {
  /** Path to the field (e.g., ['features', '0', 'title']) */
  readonly path: readonly string[]
  /** Human-readable error message */
  readonly message: string
  /** Constraint that was violated */
  readonly constraint: keyof FieldConstraints | 'required'
  /** Expected value */
  readonly expected?: number
  /** Actual value */
  readonly actual?: number
}

/**
 * Result of content validation
 */
export interface ValidationResult {
  /** Whether content is valid */
  readonly valid: boolean
  /** List of validation errors */
  readonly errors: readonly ValidationError[]
}

// ============================================================================
// Validator Implementation
// ============================================================================

/**
 * Validate content against a schema
 */
export const validateContent = (
  content: SectionContent,
  schema: SectionSchema
): ValidationResult => {
  const errors: ValidationError[] = []

  for (const field of schema.fields) {
    validateField(content, field, [], errors)
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validate a single field recursively
 */
const validateField = (
  data: unknown,
  field: FieldSchema,
  path: string[],
  errors: ValidationError[]
): void => {
  const fieldPath = [...path, field.key]
  const value = getNestedValue(data, field.key)

  // Check required
  if (field.required !== false && (value === undefined || value === null || value === '')) {
    errors.push({
      path: fieldPath,
      message: `${field.label ?? field.key} is required`,
      constraint: 'required',
    })
    return
  }

  // Skip validation if value is empty and optional
  if (value === undefined || value === null || value === '') {
    return
  }

  if ($FieldSchema.isText(field)) {
    validateTextField(value, field, fieldPath, errors)
  } else if ($FieldSchema.isList(field)) {
    validateListField(value, field, fieldPath, errors)
  } else if ($FieldSchema.isObject(field)) {
    validateObjectField(value, field, fieldPath, errors)
  }
}

/**
 * Validate text field constraints
 */
const validateTextField = (
  value: unknown,
  field: FieldSchema,
  path: string[],
  errors: ValidationError[]
): void => {
  if (typeof value !== 'string') return

  const constraints = field.constraints
  if (!constraints) return

  const length = value.length

  if (constraints.minLength !== undefined && length < constraints.minLength) {
    errors.push({
      path,
      message: `${field.label ?? field.key} must be at least ${constraints.minLength} characters (got ${length})`,
      constraint: 'minLength',
      expected: constraints.minLength,
      actual: length,
    })
  }

  if (constraints.maxLength !== undefined && length > constraints.maxLength) {
    errors.push({
      path,
      message: `${field.label ?? field.key} must be at most ${constraints.maxLength} characters (got ${length})`,
      constraint: 'maxLength',
      expected: constraints.maxLength,
      actual: length,
    })
  }

  if (constraints.pattern !== undefined) {
    const regex = new RegExp(constraints.pattern)
    if (!regex.test(value)) {
      errors.push({
        path,
        message: `${field.label ?? field.key} does not match required pattern`,
        constraint: 'pattern',
      })
    }
  }
}

/**
 * Validate list field constraints
 */
const validateListField = (
  value: unknown,
  field: FieldSchema & { type: 'list' },
  path: string[],
  errors: ValidationError[]
): void => {
  if (!Array.isArray(value)) return

  const constraints = field.constraints
  const count = value.length

  if (constraints?.minItems !== undefined && count < constraints.minItems) {
    errors.push({
      path,
      message: `${field.label ?? field.key} must have at least ${constraints.minItems} items (got ${count})`,
      constraint: 'minItems',
      expected: constraints.minItems,
      actual: count,
    })
  }

  if (constraints?.maxItems !== undefined && count > constraints.maxItems) {
    errors.push({
      path,
      message: `${field.label ?? field.key} must have at most ${constraints.maxItems} items (got ${count})`,
      constraint: 'maxItems',
      expected: constraints.maxItems,
      actual: count,
    })
  }

  // Validate each item
  const itemSchema = 'itemSchema' in field ? field.itemSchema : undefined
  if (itemSchema) {
    for (let i = 0; i < value.length; i++) {
      const itemPath = [...path, String(i)]
      if ($FieldSchema.isObject(itemSchema)) {
        // For object items, validate each field in the object
        for (const nestedField of itemSchema.fields) {
          validateField(value[i], nestedField, itemPath, errors)
        }
      } else {
        // For primitive items, validate directly
        validatePrimitiveItem(value[i], itemSchema, itemPath, errors)
      }
    }
  }
}

/**
 * Validate primitive list items
 */
const validatePrimitiveItem = (
  value: unknown,
  schema: FieldSchema,
  path: string[],
  errors: ValidationError[]
): void => {
  if ($FieldSchema.isText(schema) && typeof value === 'string') {
    validateTextField(value, schema, path, errors)
  }
}

/**
 * Validate object field constraints
 */
const validateObjectField = (
  value: unknown,
  field: FieldSchema & { type: 'object' },
  path: string[],
  errors: ValidationError[]
): void => {
  if (typeof value !== 'object' || value === null) return

  const fields = 'fields' in field ? field.fields : undefined
  if (fields) {
    for (const nestedField of fields) {
      validateField(value, nestedField, path, errors)
    }
  }
}

/**
 * Get nested value from object by key
 */
const getNestedValue = (data: unknown, key: string): unknown => {
  if (typeof data !== 'object' || data === null) return undefined
  return (data as Record<string, unknown>)[key]
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format validation errors as a single string
 */
export const formatErrors = (result: ValidationResult): string => {
  if (result.valid) return ''
  return result.errors
    .map((e) => `[${e.path.join('.')}] ${e.message}`)
    .join('\n')
}

/**
 * Check if a specific field path has errors
 */
export const hasErrorAt = (result: ValidationResult, path: readonly string[]): boolean => {
  const pathStr = path.join('.')
  return result.errors.some((e) => e.path.join('.') === pathStr)
}

/**
 * Get errors for a specific field path
 */
export const getErrorsAt = (
  result: ValidationResult,
  path: readonly string[]
): readonly ValidationError[] => {
  const pathStr = path.join('.')
  return result.errors.filter((e) => e.path.join('.') === pathStr)
}
