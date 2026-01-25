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
import type { GenericParams, Preset } from './GenericParams'

// Re-export SurfaceType for convenience
export type { SurfaceType }

/**
 * Surface-specific generic parameters
 * Alias for GenericParams with surface-specific documentation
 */
export type GenericSurfaceParams = GenericParams

/**
 * Surface Preset
 * A reusable surface pattern definition with label and parameters
 */
export type SurfacePreset = Preset<GenericSurfaceParams>
