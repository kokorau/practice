/**
 * SectionSchema - Schema definitions for section content
 *
 * Defines the structure of content that each section type expects.
 * Used for validation, AI content generation, and form building.
 */

import type { SectionType } from './Section'

// ============================================================================
// Field Types
// ============================================================================

/**
 * Primitive field types
 */
export type PrimitiveFieldType = 'text' | 'url' | 'richText'

/**
 * All field types
 */
export type FieldType = PrimitiveFieldType | 'list' | 'object'

// ============================================================================
// Field Constraints
// ============================================================================

/**
 * Constraints for field values
 */
export interface FieldConstraints {
  /** Minimum length for text fields */
  readonly minLength?: number
  /** Maximum length for text fields */
  readonly maxLength?: number
  /** Minimum number of items for list fields */
  readonly minItems?: number
  /** Maximum number of items for list fields */
  readonly maxItems?: number
  /** Regex pattern for validation */
  readonly pattern?: string
}

// ============================================================================
// Field Schema Types
// ============================================================================

/**
 * Base properties for all field schemas
 */
interface BaseFieldSchema {
  /** Field key (maps to content property name) */
  readonly key: string
  /** Field type */
  readonly type: FieldType
  /** Whether this field is required (default: true) */
  readonly required?: boolean
  /** Validation constraints */
  readonly constraints?: FieldConstraints
  /** Hint for AI content generation */
  readonly aiHint?: string
  /** Human-readable label */
  readonly label?: string
}

/**
 * Schema for text-based fields
 */
export interface TextFieldSchema extends BaseFieldSchema {
  readonly type: PrimitiveFieldType
}

/**
 * Schema for list fields
 */
export interface ListFieldSchema extends BaseFieldSchema {
  readonly type: 'list'
  /** Schema for each item in the list */
  readonly itemSchema: FieldSchema
}

/**
 * Schema for object fields (nested structure)
 */
export interface ObjectFieldSchema extends BaseFieldSchema {
  readonly type: 'object'
  /** Schemas for nested fields */
  readonly fields: readonly FieldSchema[]
}

/**
 * Union of all field schema types
 */
export type FieldSchema = TextFieldSchema | ListFieldSchema | ObjectFieldSchema

// ============================================================================
// Section Schema
// ============================================================================

/**
 * Schema definition for a section type
 */
export interface SectionSchema {
  /** Schema ID (should match section type for built-in schemas) */
  readonly id: string
  /** Section type this schema applies to */
  readonly type: SectionType
  /** Human-readable name */
  readonly name: string
  /** Description of the section's purpose */
  readonly description?: string
  /** Field definitions */
  readonly fields: readonly FieldSchema[]
}

// ============================================================================
// Schema Registry
// ============================================================================

/**
 * Registry of all section schemas
 */
export type SectionSchemas = Readonly<Record<SectionType, SectionSchema>>

// ============================================================================
// Type Guards
// ============================================================================

export const $FieldSchema = {
  isText: (schema: FieldSchema): schema is TextFieldSchema =>
    schema.type === 'text' || schema.type === 'url' || schema.type === 'richText',

  isList: (schema: FieldSchema): schema is ListFieldSchema =>
    schema.type === 'list',

  isObject: (schema: FieldSchema): schema is ObjectFieldSchema =>
    schema.type === 'object',
} as const
