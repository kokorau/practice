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
 * Legacy surface type (type-based pattern identification)
 *
 * This matches the existing SurfaceConfig.type values for backward compatibility.
 */
export type LegacySurfaceType = SurfaceConfig['type']

/**
 * Legacy reference format using type discriminator
 *
 * This is the existing format used in SurfaceConfig:
 * ```typescript
 * { type: 'stripe', width1: 20, width2: 20, angle: 45 }
 * ```
 */
export type LegacyShaderRef = SurfaceConfig

// ============================================================
// Union Types for Backward Compatibility
// ============================================================

/**
 * Surface reference that supports both legacy and new formats
 *
 * This allows gradual migration from type-based to UUID-based references.
 *
 * @example
 * ```typescript
 * // Legacy format (still supported)
 * const legacy: SurfaceRef = { type: 'stripe', width1: 20, width2: 20, angle: 45 }
 *
 * // New UUID format
 * const modern: SurfaceRef = { shaderId: 'uuid-here', params: { width1: 30 } }
 * ```
 */
export type SurfaceRef = LegacyShaderRef | ShaderRef

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
 * Check if a reference is a legacy format (type-based)
 */
export function isLegacyShaderRef(ref: unknown): ref is LegacyShaderRef {
  if (typeof ref !== 'object' || ref === null) return false
  const obj = ref as Record<string, unknown>
  return typeof obj.type === 'string' && !('shaderId' in obj)
}

/**
 * Check if a reference is a valid SurfaceRef (either format)
 */
export function isSurfaceRef(ref: unknown): ref is SurfaceRef {
  return isShaderRef(ref) || isLegacyShaderRef(ref)
}

// ============================================================
// Utility Functions
// ============================================================

/**
 * Get the shader identifier from either format
 *
 * For legacy refs, returns the type string.
 * For UUID refs, returns the shaderId.
 */
export function getShaderIdentifier(ref: SurfaceRef): string {
  if (isShaderRef(ref)) {
    return ref.shaderId
  }
  return ref.type
}

/**
 * Get parameters from either format
 *
 * For legacy refs, extracts all non-type properties.
 * For UUID refs, returns the params object.
 */
export function getShaderParams(ref: SurfaceRef): Record<string, unknown> {
  if (isShaderRef(ref)) {
    return ref.params ?? {}
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { type, ...params } = ref
  return params
}

/**
 * Create a ShaderRef from a legacy reference and shader ID
 *
 * This is useful when migrating from legacy format to UUID format.
 */
export function toShaderRef(legacyRef: LegacyShaderRef, shaderId: string): ShaderRef {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { type, ...params } = legacyRef
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
  const { type, ...params } = ref
  return {
    identifier: type,
    params,
    isUUID: false,
  }
}
