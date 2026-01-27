/**
 * ShaderRef
 *
 * Reference type for pointing to shaders in presets and configurations.
 * Uses UUID to reference ShaderDefinition entries in the registry.
 *
 * This enables decoupling of shader code/definition from usage configuration,
 * allowing the same shader to be used with different parameters in different presets.
 */

import type { SurfaceConfig } from './HeroViewConfig'

// ============================================================
// Shader Reference Types
// ============================================================

/**
 * Reference to a shader by UUID with optional parameter overrides
 *
 * @example
 * ```typescript
 * // Basic reference using default params
 * const ref: ShaderRef = {
 *   shaderId: 'b1c2d3e4-f5g6-h7i8-j9k0-l1m2n3o4p5q6',
 * }
 *
 * // Reference with custom params
 * const customRef: ShaderRef = {
 *   shaderId: 'b1c2d3e4-f5g6-h7i8-j9k0-l1m2n3o4p5q6',
 *   params: {
 *     width1: 30,
 *     width2: 15,
 *     angle: 60,
 *   },
 * }
 * ```
 */
export interface ShaderRef {
  /** UUID of the shader in the registry */
  shaderId: string
  /** Optional parameter overrides (merged with shader defaults) */
  params?: Record<string, unknown>
}

// ============================================================
// Legacy Format Types (for backward compatibility)
// ============================================================

/**
 * Surface type identifier (id-based pattern identification)
 *
 * This matches the existing SurfaceConfig.id values.
 */
export type SurfaceTypeId = SurfaceConfig['id']

/**
 * Flat reference format using id discriminator
 *
 * This is the existing format used in SurfaceConfig:
 * ```typescript
 * { id: 'stripe', width1: 20, width2: 20, angle: 45 }
 * ```
 */
export type FlatShaderRef = SurfaceConfig

// ============================================================
// Union Types for Backward Compatibility
// ============================================================

/**
 * Surface reference that supports both flat and UUID-based formats
 *
 * This allows gradual migration from id-based to UUID-based references.
 *
 * @example
 * ```typescript
 * // Flat format (still supported)
 * const flat: SurfaceRef = { id: 'stripe', width1: 20, width2: 20, angle: 45 }
 *
 * // UUID format
 * const modern: SurfaceRef = { shaderId: 'uuid-here', params: { width1: 30 } }
 * ```
 */
export type SurfaceRef = FlatShaderRef | ShaderRef

// ============================================================
// Type Guards
// ============================================================

/**
 * Check if a reference is a ShaderRef (UUID-based)
 */
export function isShaderRef(ref: unknown): ref is ShaderRef {
  if (typeof ref !== 'object' || ref === null) return false
  const obj = ref as Record<string, unknown>
  return typeof obj.shaderId === 'string'
}

/**
 * Check if a reference is a flat format (id-based)
 */
export function isFlatShaderRef(ref: unknown): ref is FlatShaderRef {
  if (typeof ref !== 'object' || ref === null) return false
  const obj = ref as Record<string, unknown>
  return typeof obj.id === 'string' && !('shaderId' in obj)
}

/**
 * Check if a reference is a valid SurfaceRef (either format)
 */
export function isSurfaceRef(ref: unknown): ref is SurfaceRef {
  return isShaderRef(ref) || isFlatShaderRef(ref)
}

// ============================================================
// Utility Functions
// ============================================================

/**
 * Get the shader identifier from either format
 *
 * For flat refs, returns the id string.
 * For UUID refs, returns the shaderId.
 */
export function getShaderIdentifier(ref: SurfaceRef): string {
  if (isShaderRef(ref)) {
    return ref.shaderId
  }
  return ref.id
}

/**
 * Get parameters from either format
 *
 * For flat refs, extracts all non-id properties.
 * For UUID refs, returns the params object.
 */
export function getShaderParams(ref: SurfaceRef): Record<string, unknown> {
  if (isShaderRef(ref)) {
    return ref.params ?? {}
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, ...params } = ref
  return params
}

/**
 * Create a ShaderRef from a flat reference and shader ID
 *
 * This is useful when migrating from flat format to UUID format.
 */
export function toShaderRef(flatRef: FlatShaderRef, shaderId: string): ShaderRef {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, ...params } = flatRef
  return {
    shaderId,
    params: Object.keys(params).length > 0 ? params : undefined,
  }
}

/**
 * Normalize a SurfaceRef to always include explicit params
 *
 * This ensures consistent handling regardless of format.
 */
export function normalizeSurfaceRef(ref: SurfaceRef): {
  identifier: string
  params: Record<string, unknown>
  isUUID: boolean
} {
  if (isShaderRef(ref)) {
    return {
      identifier: ref.shaderId,
      params: ref.params ?? {},
      isUUID: true,
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, ...params } = ref
  return {
    identifier: id,
    params,
    isUUID: false,
  }
}
