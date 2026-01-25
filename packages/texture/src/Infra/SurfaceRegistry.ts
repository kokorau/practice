/**
 * SurfaceRegistry - Centralized Surface Pattern Definitions
 *
 * This registry provides a single source of truth for all surface pattern types.
 * Each surface type is defined with:
 * - id: Unique identifier (string)
 * - name: Display name for UI
 * - category: Grouping for UI organization
 * - schema: ObjectSchema from @practice/schema for parameter validation
 *
 * Benefits:
 * - Adding new surface types requires only adding to SURFACE_REGISTRY
 * - No need to update switch statements or union types elsewhere
 * - Runtime schema validation instead of compile-time unions
 */

import type { ObjectSchema } from '@practice/schema'
import {
  SolidSurfaceSchema,
  StripeSurfaceSchema,
  GridSurfaceSchema,
  PolkaDotSurfaceSchema,
  CheckerSurfaceSchema,
  LinearGradientSurfaceSchema,
  CircularGradientSurfaceSchema,
  ConicGradientSurfaceSchema,
  RepeatLinearGradientSurfaceSchema,
  PerlinGradientSurfaceSchema,
  CurlGradientSurfaceSchema,
  GradientGrainLinearSurfaceSchema,
  GradientGrainCircularSurfaceSchema,
  GradientGrainRadialSurfaceSchema,
  GradientGrainPerlinSurfaceSchema,
  GradientGrainCurlSurfaceSchema,
  GradientGrainSimplexSurfaceSchema,
  TriangleSurfaceSchema,
  HexagonSurfaceSchema,
  AsanohaSurfaceSchema,
  SeigaihaSurfaceSchema,
  WaveSurfaceSchema,
  ScalesSurfaceSchema,
  OgeeSurfaceSchema,
  SunburstSurfaceSchema,
  PaperTextureSurfaceSchema,
} from '../Domain/ValueObject/Schemas'

// ============================================================
// Types
// ============================================================

export type SurfaceCategory =
  | 'basic'
  | 'gradient'
  | 'tessellation'
  | 'textile'
  | 'texture'

export interface SurfaceDefinition {
  id: string
  name: string
  category: SurfaceCategory
  schema: ObjectSchema
}

// GenericSurfaceParams is now imported from Domain/ValueObject/GenericParams
// Re-export for backwards compatibility
export type { GenericSurfaceParams } from '../Domain/ValueObject/SurfacePreset'

// ============================================================
// Registry
// ============================================================

/**
 * Central registry of all surface types
 */
export const SURFACE_REGISTRY: readonly SurfaceDefinition[] = [
  // Basic patterns
  { id: 'solid', name: 'Solid', category: 'basic', schema: SolidSurfaceSchema },
  { id: 'stripe', name: 'Stripe', category: 'basic', schema: StripeSurfaceSchema },
  { id: 'grid', name: 'Grid', category: 'basic', schema: GridSurfaceSchema },
  { id: 'polkaDot', name: 'Polka Dot', category: 'basic', schema: PolkaDotSurfaceSchema },
  { id: 'checker', name: 'Checker', category: 'basic', schema: CheckerSurfaceSchema },

  // Gradients
  { id: 'linearGradient', name: 'Linear Gradient', category: 'gradient', schema: LinearGradientSurfaceSchema },
  { id: 'circularGradient', name: 'Circular Gradient', category: 'gradient', schema: CircularGradientSurfaceSchema },
  { id: 'conicGradient', name: 'Conic Gradient', category: 'gradient', schema: ConicGradientSurfaceSchema },
  { id: 'repeatLinearGradient', name: 'Repeat Linear', category: 'gradient', schema: RepeatLinearGradientSurfaceSchema },
  { id: 'perlinGradient', name: 'Perlin Gradient', category: 'gradient', schema: PerlinGradientSurfaceSchema },
  { id: 'curlGradient', name: 'Curl Gradient', category: 'gradient', schema: CurlGradientSurfaceSchema },
  { id: 'gradientGrainLinear', name: 'Grain Linear', category: 'gradient', schema: GradientGrainLinearSurfaceSchema },
  { id: 'gradientGrainCircular', name: 'Grain Circular', category: 'gradient', schema: GradientGrainCircularSurfaceSchema },
  { id: 'gradientGrainRadial', name: 'Grain Radial', category: 'gradient', schema: GradientGrainRadialSurfaceSchema },
  { id: 'gradientGrainPerlin', name: 'Grain Perlin', category: 'gradient', schema: GradientGrainPerlinSurfaceSchema },
  { id: 'gradientGrainCurl', name: 'Grain Curl', category: 'gradient', schema: GradientGrainCurlSurfaceSchema },
  { id: 'gradientGrainSimplex', name: 'Grain Simplex', category: 'gradient', schema: GradientGrainSimplexSurfaceSchema },

  // Tessellation
  { id: 'triangle', name: 'Triangle', category: 'tessellation', schema: TriangleSurfaceSchema },
  { id: 'hexagon', name: 'Hexagon', category: 'tessellation', schema: HexagonSurfaceSchema },

  // Textile patterns (Japanese traditional)
  { id: 'asanoha', name: 'Asanoha', category: 'textile', schema: AsanohaSurfaceSchema },
  { id: 'seigaiha', name: 'Seigaiha', category: 'textile', schema: SeigaihaSurfaceSchema },
  { id: 'wave', name: 'Wave', category: 'textile', schema: WaveSurfaceSchema },
  { id: 'scales', name: 'Scales', category: 'textile', schema: ScalesSurfaceSchema },
  { id: 'ogee', name: 'Ogee', category: 'textile', schema: OgeeSurfaceSchema },
  { id: 'sunburst', name: 'Sunburst', category: 'textile', schema: SunburstSurfaceSchema },

  // Textures
  { id: 'paperTexture', name: 'Paper Texture', category: 'texture', schema: PaperTextureSurfaceSchema },
] as const

/**
 * All valid surface type IDs
 */
export const SURFACE_TYPES = SURFACE_REGISTRY.map(def => def.id)

/**
 * Surface type - union of all registered surface IDs
 * This is derived from the registry for type safety
 */
export type SurfaceType = typeof SURFACE_TYPES[number]

// ============================================================
// Lookup Functions
// ============================================================

/**
 * Get surface definition by ID
 */
export function getSurfaceDefinition(id: string): SurfaceDefinition | undefined {
  return SURFACE_REGISTRY.find(def => def.id === id)
}

/**
 * Check if a string is a valid surface type
 */
export function isValidSurfaceType(id: string): id is SurfaceType {
  return SURFACE_TYPES.includes(id)
}

/**
 * Get default parameters for a surface type
 */
export function getDefaultSurfaceParams(id: string): Record<string, unknown> | undefined {
  const def = getSurfaceDefinition(id)
  if (!def) return undefined

  // Extract defaults from schema
  const defaults: Record<string, unknown> = { id }
  for (const [key, field] of Object.entries(def.schema)) {
    if (field && typeof field === 'object' && 'default' in field) {
      defaults[key] = field.default
    }
  }
  return defaults
}

/**
 * Get all surfaces in a category
 */
export function getSurfacesByCategory(category: SurfaceCategory): SurfaceDefinition[] {
  return SURFACE_REGISTRY.filter(def => def.category === category)
}

/**
 * Get all unique categories
 */
export function getSurfaceCategories(): SurfaceCategory[] {
  return [...new Set(SURFACE_REGISTRY.map(def => def.category))]
}

// Re-export schemas for convenience
export { SurfaceSchemas } from '../Domain/ValueObject/Schemas'
