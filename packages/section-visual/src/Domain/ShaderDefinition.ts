/**
 * ShaderDefinition
 *
 * Type definitions for UUID-based shader references.
 * Shaders are stored in a registry and referenced by UUID in presets/configs.
 *
 * This enables:
 * - Community-created shaders with proper attribution
 * - Version management for shader updates
 * - Clean separation between shader code and usage configuration
 */

// ============================================================
// Param Schema Types (for shader parameter definitions)
// ============================================================

/**
 * Base parameter definition with common properties
 */
interface ParamDefinitionBase {
  /** Human-readable label for UI */
  label: string
  /** Optional description/tooltip */
  description?: string
}

/**
 * Number parameter definition
 */
export interface NumberParamDefinition extends ParamDefinitionBase {
  type: 'number'
  default: number
  min?: number
  max?: number
  step?: number
  unit?: string
}

/**
 * Boolean parameter definition
 */
export interface BooleanParamDefinition extends ParamDefinitionBase {
  type: 'boolean'
  default: boolean
}

/**
 * Select parameter definition (enum/dropdown)
 */
export interface SelectParamDefinition extends ParamDefinitionBase {
  type: 'select'
  default: string
  options: Array<{ value: string; label: string }>
}

/**
 * String parameter definition (text input)
 */
export interface StringParamDefinition extends ParamDefinitionBase {
  type: 'string'
  default: string
}

/**
 * Color parameter definition (RGBA)
 */
export interface ColorParamDefinition extends ParamDefinitionBase {
  type: 'color'
  default: [number, number, number, number]
}

/**
 * Union type for all parameter definitions
 */
export type ParamDefinition =
  | NumberParamDefinition
  | BooleanParamDefinition
  | SelectParamDefinition
  | StringParamDefinition
  | ColorParamDefinition

// ============================================================
// Shader Definition Types
// ============================================================

/**
 * Shader category classification
 */
export type ShaderCategory = 'surface' | 'mask' | 'effect'

/**
 * Author information for shader attribution
 */
export interface ShaderAuthor {
  /** Unique identifier for the author */
  id: string
  /** Display name */
  name: string
  /** Whether this is an official/built-in shader */
  isOfficial: boolean
}

/**
 * Parameter schema for a shader
 */
export interface ShaderParamSchema {
  type: 'object'
  properties: Record<string, ParamDefinition>
}

/**
 * Complete shader definition stored in the registry
 *
 * This represents a reusable shader that can be referenced by UUID
 * in presets and configurations.
 *
 * @example
 * ```typescript
 * const stripeShader: ShaderDefinition = {
 *   id: 'b1c2d3e4-f5g6-h7i8-j9k0-l1m2n3o4p5q6',
 *   name: 'Stripe Pattern',
 *   description: 'Two-color stripe pattern with configurable widths and angle',
 *   author: {
 *     id: 'official',
 *     name: 'Practice Team',
 *     isOfficial: true,
 *   },
 *   version: '1.0.0',
 *   category: 'surface',
 *   code: '... WGSL shader code ...',
 *   paramSchema: {
 *     type: 'object',
 *     properties: {
 *       width1: { type: 'number', label: 'Width 1', default: 20, min: 1, max: 200, unit: 'px' },
 *       width2: { type: 'number', label: 'Width 2', default: 20, min: 1, max: 200, unit: 'px' },
 *       angle: { type: 'number', label: 'Angle', default: 45, min: 0, max: 360, unit: 'deg' },
 *     },
 *   },
 *   tags: ['geometric', 'stripes', 'classic'],
 *   isPrivate: false,
 * }
 * ```
 */
export interface ShaderDefinition {
  /** UUID for the shader */
  id: string

  /** Human-readable name */
  name: string

  /** Optional description */
  description?: string

  /** Author attribution */
  author: ShaderAuthor

  /** Semantic version string (e.g., '1.0.0') */
  version: string

  /** Shader category */
  category: ShaderCategory

  /**
   * WGSL shader code
   *
   * For built-in shaders, this may be empty as the actual code
   * is in the @practice/texture package. The registry uses
   * the shader ID to look up the appropriate render function.
   */
  code: string

  /** Parameter schema for the shader */
  paramSchema: ShaderParamSchema

  /** Optional thumbnail image URL/data URL */
  thumbnail?: string

  /** Optional tags for search/filtering */
  tags?: string[]

  /** Whether this shader is private (user-only) */
  isPrivate: boolean
}

// ============================================================
// Factory Functions
// ============================================================

/**
 * Official author for built-in shaders
 */
export const OFFICIAL_AUTHOR: ShaderAuthor = {
  id: 'official',
  name: 'Practice Team',
  isOfficial: true,
}

/**
 * Create a shader definition with defaults
 */
export function createShaderDefinition(
  partial: Partial<ShaderDefinition> & Pick<ShaderDefinition, 'id' | 'name' | 'category' | 'paramSchema'>
): ShaderDefinition {
  return {
    description: undefined,
    author: OFFICIAL_AUTHOR,
    version: '1.0.0',
    code: '',
    thumbnail: undefined,
    tags: [],
    isPrivate: false,
    ...partial,
  }
}

// ============================================================
// Type Guards
// ============================================================

/**
 * Check if a value is a valid ShaderDefinition
 */
export function isShaderDefinition(value: unknown): value is ShaderDefinition {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.version === 'string' &&
    typeof obj.category === 'string' &&
    ['surface', 'mask', 'effect'].includes(obj.category as string) &&
    typeof obj.code === 'string' &&
    typeof obj.paramSchema === 'object' &&
    typeof obj.isPrivate === 'boolean'
  )
}

/**
 * Check if a value is a valid ShaderCategory
 */
export function isShaderCategory(value: unknown): value is ShaderCategory {
  return value === 'surface' || value === 'mask' || value === 'effect'
}
