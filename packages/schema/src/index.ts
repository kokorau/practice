/**
 * @practice/schema
 *
 * Schema definition with type inference, UI metadata, and runtime validation.
 *
 * @example
 * ```typescript
 * const VignetteSchema = defineSchema({
 *   enabled: boolean({ label: 'Enabled' }),
 *   intensity: number({ label: 'Intensity', min: 0, max: 1, step: 0.01 }),
 * })
 *
 * type Vignette = Infer<typeof VignetteSchema>
 * // { enabled: boolean; intensity: number }
 *
 * const fields = getFields(VignetteSchema)
 * // [{ key: 'enabled', type: 'boolean', ... }, { key: 'intensity', type: 'number', ... }]
 * ```
 */

// ============================================================
// Field Schema Types
// ============================================================

/** Base field schema */
interface FieldSchemaBase {
  /** Field label for UI */
  label: string
  /** Optional description */
  description?: string
}

/** Number field schema */
export interface NumberFieldSchema extends FieldSchemaBase {
  type: 'number'
  /** Minimum value */
  min: number
  /** Maximum value */
  max: number
  /** Step increment (optional, use for integer constraints etc.) */
  step?: number
  /** Optional unit label (e.g., 'px', 'deg', '%') */
  unit?: string
  /** Default value */
  default: number
}

/** Boolean field schema */
export interface BooleanFieldSchema extends FieldSchemaBase {
  type: 'boolean'
  /** Default value */
  default: boolean
}

/** Select field schema (dropdown) */
export interface SelectFieldSchema<T extends string = string> extends FieldSchemaBase {
  type: 'select'
  /** Available options */
  options: readonly { value: T; label: string }[]
  /** Default value */
  default: T
}

/** Literal field schema (fixed value, not editable) */
export interface LiteralFieldSchema<T extends string | number | boolean> extends FieldSchemaBase {
  type: 'literal'
  /** The literal value */
  value: T
}

/**
 * Custom HSV color structure for color fields
 */
export interface SchemaCustomColor {
  type: 'custom'
  /** Hue (0-360) */
  hue: number
  /** Saturation (0-100) */
  saturation: number
  /** Value/Brightness (0-100) */
  value: number
}

/**
 * Color value for schema fields
 * Can be a palette key string, 'auto', or a custom HSV color
 */
export type SchemaColorValue = string | SchemaCustomColor

/**
 * Type guard for SchemaCustomColor
 */
export function isSchemaCustomColor(value: SchemaColorValue): value is SchemaCustomColor {
  return typeof value === 'object' && value !== null && value.type === 'custom'
}

/** Color field schema (color picker with palette keys or custom HSV) */
export interface ColorFieldSchema extends FieldSchemaBase {
  type: 'color'
  /** Default color value */
  default: SchemaColorValue
}

/** Union of all field schemas */
export type FieldSchema =
  | NumberFieldSchema
  | BooleanFieldSchema
  | SelectFieldSchema<string>
  | LiteralFieldSchema<string | number | boolean>
  | ColorFieldSchema

/** Object schema (collection of fields) */
export type ObjectSchema = Record<string, FieldSchema>

// ============================================================
// Type Inference
// ============================================================

/** Infer TypeScript type from field schema */
type InferField<F extends FieldSchema> =
  F extends NumberFieldSchema ? number :
  F extends BooleanFieldSchema ? boolean :
  F extends SelectFieldSchema<infer T> ? T :
  F extends LiteralFieldSchema<infer V> ? V :
  F extends ColorFieldSchema ? SchemaColorValue :
  never

/** Infer TypeScript type from object schema */
export type Infer<S extends ObjectSchema> = {
  [K in keyof S]: InferField<S[K]>
}

// ============================================================
// Field Builders
// ============================================================

/** Create a number field schema */
export const number = (opts: Omit<NumberFieldSchema, 'type'>): NumberFieldSchema => ({
  type: 'number',
  ...opts,
})

/** Create a boolean field schema */
export const boolean = (opts: Omit<BooleanFieldSchema, 'type'>): BooleanFieldSchema => ({
  type: 'boolean',
  ...opts,
})

/** Create a select field schema */
export const select = <T extends string>(
  opts: Omit<SelectFieldSchema<T>, 'type'>
): SelectFieldSchema<T> => ({
  type: 'select',
  ...opts,
})

/** Create a literal field schema */
export const literal = <T extends string | number | boolean>(
  value: T,
  opts: Omit<LiteralFieldSchema<T>, 'type' | 'value'> = { label: String(value) }
): LiteralFieldSchema<T> => ({
  type: 'literal',
  value,
  ...opts,
})

/** Create a color field schema */
export const color = (opts: Omit<ColorFieldSchema, 'type'>): ColorFieldSchema => ({
  type: 'color',
  ...opts,
})

/** Define an object schema (identity function for type inference) */
export const defineSchema = <S extends ObjectSchema>(schema: S): S => schema

// ============================================================
// Schema Utilities
// ============================================================

/** Field metadata for UI rendering */
export interface FieldMeta<F extends FieldSchema = FieldSchema> {
  key: string
  schema: F
}

/** Get field metadata array from schema */
export const getFields = <S extends ObjectSchema>(schema: S): FieldMeta[] => {
  return Object.entries(schema).map(([key, fieldSchema]) => ({
    key,
    schema: fieldSchema,
  }))
}

/** Get default values from schema */
export const getDefaults = <S extends ObjectSchema>(schema: S): Infer<S> => {
  const result: Record<string, unknown> = {}
  for (const [key, field] of Object.entries(schema)) {
    if (field.type === 'literal') {
      result[key] = field.value
    } else {
      result[key] = field.default
    }
  }
  return result as Infer<S>
}

// ============================================================
// Validation
// ============================================================

/** Validation error */
export interface ValidationError {
  field: string
  message: string
  value: unknown
}

/** Validate a value against schema, returns errors (empty if valid) */
export const validate = <S extends ObjectSchema>(
  schema: S,
  value: unknown
): ValidationError[] => {
  const errors: ValidationError[] = []

  if (typeof value !== 'object' || value === null) {
    errors.push({ field: '', message: 'Expected object', value })
    return errors
  }

  const obj = value as Record<string, unknown>

  for (const [key, field] of Object.entries(schema)) {
    const v = obj[key]

    switch (field.type) {
      case 'number':
        if (typeof v !== 'number' || Number.isNaN(v)) {
          errors.push({ field: key, message: `Expected number`, value: v })
        } else if (v < field.min || v > field.max) {
          errors.push({ field: key, message: `Must be between ${field.min} and ${field.max}`, value: v })
        }
        break

      case 'boolean':
        if (typeof v !== 'boolean') {
          errors.push({ field: key, message: `Expected boolean`, value: v })
        }
        break

      case 'select':
        if (typeof v !== 'string') {
          errors.push({ field: key, message: `Expected string`, value: v })
        } else if (!field.options.some(opt => opt.value === v)) {
          const validValues = field.options.map(opt => opt.value).join(', ')
          errors.push({ field: key, message: `Must be one of: ${validValues}`, value: v })
        }
        break

      case 'literal':
        if (v !== field.value) {
          errors.push({ field: key, message: `Expected ${JSON.stringify(field.value)}`, value: v })
        }
        break

      case 'color':
        // Color can be a string (palette key like 'B', 'auto') or a custom color object
        if (typeof v === 'string') {
          // Valid string color value
        } else if (typeof v === 'object' && v !== null) {
          const customColor = v as Record<string, unknown>
          if (customColor.type !== 'custom') {
            errors.push({ field: key, message: 'Custom color must have type "custom"', value: v })
          } else if (typeof customColor.hue !== 'number' || customColor.hue < 0 || customColor.hue > 360) {
            errors.push({ field: key, message: 'Hue must be a number between 0 and 360', value: v })
          } else if (typeof customColor.saturation !== 'number' || customColor.saturation < 0 || customColor.saturation > 100) {
            errors.push({ field: key, message: 'Saturation must be a number between 0 and 100', value: v })
          } else if (typeof customColor.value !== 'number' || customColor.value < 0 || customColor.value > 100) {
            errors.push({ field: key, message: 'Value must be a number between 0 and 100', value: v })
          }
        } else {
          errors.push({ field: key, message: 'Expected string or custom color object', value: v })
        }
        break
    }
  }

  return errors
}

/** Assert value is valid, throws if not */
export const assertValid = <S extends ObjectSchema>(
  schema: S,
  value: unknown
): asserts value is Infer<S> => {
  const errors = validate(schema, value)
  if (errors.length > 0) {
    const messages = errors.map(e => `${e.field}: ${e.message}`).join(', ')
    throw new Error(`Validation failed: ${messages}`)
  }
}

/** Check if value is valid */
export const isValid = <S extends ObjectSchema>(
  schema: S,
  value: unknown
): value is Infer<S> => {
  return validate(schema, value).length === 0
}
