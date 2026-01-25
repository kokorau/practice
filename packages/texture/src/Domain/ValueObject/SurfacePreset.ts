/**
 * Surface Preset Types
 *
 * Dynamic schema-based surface system.
 * Surface types and their parameters are defined in SurfaceRegistry.
 * This file provides the base types and interfaces.
 *
 * @see packages/texture/src/Infra/SurfaceRegistry.ts for type definitions
 */

import type { SurfaceType } from '../../Infra/SurfaceRegistry'

// Re-export SurfaceType for convenience
export type { SurfaceType }

/**
 * Generic surface parameters
 * Used for all surface types - specific params are validated at runtime via schema
 */
export interface GenericSurfaceParams {
  type: string
  [key: string]: unknown
}

/**
 * Surface Preset
 * A reusable surface pattern definition with label and parameters
 */
export interface SurfacePreset {
  label: string
  params: GenericSurfaceParams
}
