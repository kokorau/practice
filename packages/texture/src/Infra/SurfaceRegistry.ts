/**
 * Surface Registry
 *
 * Centralized registry for all surface pattern definitions.
 * Adding a new surface requires only:
 * 1. Define shader in packages/texture/src/shaders/
 * 2. Add entry to SURFACE_REGISTRY here
 */

import { defineSchema, number, boolean, getDefaults, type ObjectSchema } from '@practice/schema'
import type { RGBA, Viewport, TextureRenderSpec } from '../Domain'
import { DEFAULT_GRADIENT_GRAIN_CURVE_POINTS } from '../Domain'
import {
  createSolidSpec,
  createStripeSpec,
  createGridSpec,
  createPolkaDotSpec,
  createCheckerSpec,
  createLinearGradientSpec,
  createGradientGrainLinearSpec,
  createGradientGrainCircularSpec,
  createGradientGrainRadialSpec,
  createGradientGrainPerlinSpec,
  createGradientGrainCurlSpec,
  createGradientGrainSimplexSpec,
  createTriangleSpec,
  createHexagonSpec,
  createAsanohaSpec,
  createSeigaihaSpec,
  createWaveSpec,
  createScalesSpec,
  createOgeeSpec,
  createSunburstSpec,
  createPaperTextureSpec,
} from '../shaders'

// ============================================================
// Types
// ============================================================

/**
 * Surface category for UI grouping
 */
export type SurfaceCategory =
  | 'solid'
  | 'geometric'
  | 'gradient'
  | 'gradient-grain'
  | 'japanese'
  | 'texture'

/**
 * Generic surface parameters
 * Used when the specific type is not known at compile time
 */
export interface GenericSurfaceParams {
  type: string
  [key: string]: unknown
}

/**
 * Surface definition interface
 */
export interface SurfaceDefinition {
  /** Surface ID (matches registry key) */
  id: string
  /** Display name for UI */
  displayName: string
  /** Category for UI grouping */
  category: SurfaceCategory
  /** Schema definition for UI generation */
  schema: ObjectSchema
  /** Create shader spec from params and colors */
  createSpec: (
    params: GenericSurfaceParams,
    colors: { c1: RGBA; c2: RGBA },
    viewport: Viewport
  ) => TextureRenderSpec
}

// ============================================================
// Schema Definitions
// ============================================================

export const SolidSchema = defineSchema({})

export const StripeSchema = defineSchema({
  width1: number({ label: 'Width 1', min: 1, max: 200, step: 1, default: 20, unit: 'px' }),
  width2: number({ label: 'Width 2', min: 1, max: 200, step: 1, default: 20, unit: 'px' }),
  angle: number({ label: 'Angle', min: 0, max: 360, step: 1, default: 45, unit: 'deg' }),
})

export const GridSchema = defineSchema({
  lineWidth: number({ label: 'Line Width', min: 1, max: 50, step: 1, default: 2, unit: 'px' }),
  cellSize: number({ label: 'Cell Size', min: 10, max: 200, step: 1, default: 40, unit: 'px' }),
})

export const PolkaDotSchema = defineSchema({
  dotRadius: number({ label: 'Dot Radius', min: 1, max: 100, step: 1, default: 10, unit: 'px' }),
  spacing: number({ label: 'Spacing', min: 10, max: 200, step: 1, default: 40, unit: 'px' }),
  rowOffset: number({ label: 'Row Offset', min: 0, max: 1, step: 0.1, default: 0.5 }),
})

export const CheckerSchema = defineSchema({
  cellSize: number({ label: 'Cell Size', min: 10, max: 200, step: 1, default: 40, unit: 'px' }),
  angle: number({ label: 'Angle', min: 0, max: 360, step: 1, default: 0, unit: 'deg' }),
})

export const LinearGradientSchema = defineSchema({
  angle: number({ label: 'Angle', min: 0, max: 360, step: 1, default: 90, unit: 'deg' }),
  centerX: number({ label: 'Center X', min: 0, max: 1, step: 0.01, default: 0.5 }),
  centerY: number({ label: 'Center Y', min: 0, max: 1, step: 0.01, default: 0.5 }),
})

export const GradientGrainLinearSchema = defineSchema({
  angle: number({ label: 'Angle', min: 0, max: 360, step: 1, default: 90, unit: 'deg' }),
  centerX: number({ label: 'Center X', min: 0, max: 1, step: 0.01, default: 0.5 }),
  centerY: number({ label: 'Center Y', min: 0, max: 1, step: 0.01, default: 0.5 }),
  seed: number({ label: 'Seed', min: 0, max: 1000, step: 1, default: 42 }),
  sparsity: number({ label: 'Sparsity', min: 0, max: 1, step: 0.01, default: 0.5 }),
})

export const GradientGrainCircularSchema = defineSchema({
  centerX: number({ label: 'Center X', min: 0, max: 1, step: 0.01, default: 0.5 }),
  centerY: number({ label: 'Center Y', min: 0, max: 1, step: 0.01, default: 0.5 }),
  circularInvert: boolean({ label: 'Invert', default: false }),
  seed: number({ label: 'Seed', min: 0, max: 1000, step: 1, default: 42 }),
  sparsity: number({ label: 'Sparsity', min: 0, max: 1, step: 0.01, default: 0.5 }),
})

export const GradientGrainRadialSchema = defineSchema({
  centerX: number({ label: 'Center X', min: 0, max: 1, step: 0.01, default: 0.5 }),
  centerY: number({ label: 'Center Y', min: 0, max: 1, step: 0.01, default: 0.5 }),
  radialStartAngle: number({ label: 'Start Angle', min: 0, max: 360, step: 1, default: 0, unit: 'deg' }),
  radialSweepAngle: number({ label: 'Sweep Angle', min: 0, max: 360, step: 1, default: 360, unit: 'deg' }),
  seed: number({ label: 'Seed', min: 0, max: 1000, step: 1, default: 42 }),
  sparsity: number({ label: 'Sparsity', min: 0, max: 1, step: 0.01, default: 0.5 }),
})

export const GradientGrainPerlinSchema = defineSchema({
  perlinScale: number({ label: 'Scale', min: 0.1, max: 20, step: 0.1, default: 4 }),
  perlinOctaves: number({ label: 'Octaves', min: 1, max: 8, step: 1, default: 4 }),
  perlinContrast: number({ label: 'Contrast', min: 0.1, max: 5, step: 0.1, default: 1 }),
  perlinOffset: number({ label: 'Offset', min: -1, max: 1, step: 0.01, default: 0 }),
  seed: number({ label: 'Seed', min: 0, max: 1000, step: 1, default: 42 }),
  sparsity: number({ label: 'Sparsity', min: 0, max: 1, step: 0.01, default: 0.5 }),
})

export const GradientGrainCurlSchema = defineSchema({
  perlinScale: number({ label: 'Scale', min: 0.1, max: 20, step: 0.1, default: 4 }),
  perlinOctaves: number({ label: 'Octaves', min: 1, max: 8, step: 1, default: 4 }),
  perlinContrast: number({ label: 'Contrast', min: 0.1, max: 5, step: 0.1, default: 1 }),
  perlinOffset: number({ label: 'Offset', min: -1, max: 1, step: 0.01, default: 0 }),
  curlIntensity: number({ label: 'Curl Intensity', min: 0, max: 2, step: 0.01, default: 0.5 }),
  seed: number({ label: 'Seed', min: 0, max: 1000, step: 1, default: 42 }),
  sparsity: number({ label: 'Sparsity', min: 0, max: 1, step: 0.01, default: 0.5 }),
})

export const GradientGrainSimplexSchema = defineSchema({
  simplexScale: number({ label: 'Scale', min: 0.1, max: 20, step: 0.1, default: 4 }),
  simplexOctaves: number({ label: 'Octaves', min: 1, max: 8, step: 1, default: 4 }),
  simplexContrast: number({ label: 'Contrast', min: 0.1, max: 5, step: 0.1, default: 1 }),
  simplexOffset: number({ label: 'Offset', min: -1, max: 1, step: 0.01, default: 0 }),
  seed: number({ label: 'Seed', min: 0, max: 1000, step: 1, default: 42 }),
  sparsity: number({ label: 'Sparsity', min: 0, max: 1, step: 0.01, default: 0.5 }),
})

export const TriangleSchema = defineSchema({
  size: number({ label: 'Size', min: 10, max: 200, step: 1, default: 60, unit: 'px' }),
  angle: number({ label: 'Angle', min: 0, max: 360, step: 1, default: 0, unit: 'deg' }),
})

export const HexagonSchema = defineSchema({
  size: number({ label: 'Size', min: 10, max: 200, step: 1, default: 40, unit: 'px' }),
  angle: number({ label: 'Angle', min: 0, max: 360, step: 1, default: 0, unit: 'deg' }),
})

export const AsanohaSchema = defineSchema({
  size: number({ label: 'Size', min: 20, max: 200, step: 1, default: 60, unit: 'px' }),
  lineWidth: number({ label: 'Line Width', min: 1, max: 10, step: 0.5, default: 2, unit: 'px' }),
})

export const SeigaihaSchema = defineSchema({
  radius: number({ label: 'Radius', min: 10, max: 100, step: 1, default: 30, unit: 'px' }),
  rings: number({ label: 'Rings', min: 1, max: 10, step: 1, default: 3 }),
  lineWidth: number({ label: 'Line Width', min: 1, max: 10, step: 0.5, default: 2, unit: 'px' }),
})

export const WaveSchema = defineSchema({
  amplitude: number({ label: 'Amplitude', min: 1, max: 100, step: 1, default: 20, unit: 'px' }),
  wavelength: number({ label: 'Wavelength', min: 20, max: 400, step: 1, default: 80, unit: 'px' }),
  thickness: number({ label: 'Thickness', min: 1, max: 50, step: 1, default: 10, unit: 'px' }),
  angle: number({ label: 'Angle', min: 0, max: 360, step: 1, default: 0, unit: 'deg' }),
})

export const ScalesSchema = defineSchema({
  size: number({ label: 'Size', min: 10, max: 100, step: 1, default: 30, unit: 'px' }),
  overlap: number({ label: 'Overlap', min: 0, max: 1, step: 0.1, default: 0.5 }),
  angle: number({ label: 'Angle', min: 0, max: 360, step: 1, default: 0, unit: 'deg' }),
})

export const OgeeSchema = defineSchema({
  width: number({ label: 'Width', min: 20, max: 200, step: 1, default: 60, unit: 'px' }),
  height: number({ label: 'Height', min: 20, max: 200, step: 1, default: 80, unit: 'px' }),
  lineWidth: number({ label: 'Line Width', min: 1, max: 10, step: 0.5, default: 2, unit: 'px' }),
})

export const SunburstSchema = defineSchema({
  rays: number({ label: 'Rays', min: 4, max: 64, step: 1, default: 16 }),
  centerX: number({ label: 'Center X', min: 0, max: 1, step: 0.01, default: 0.5 }),
  centerY: number({ label: 'Center Y', min: 0, max: 1, step: 0.01, default: 0.5 }),
  twist: number({ label: 'Twist', min: 0, max: 2, step: 0.01, default: 0 }),
})

export const PaperTextureSchema = defineSchema({
  fiberScale: number({ label: 'Fiber Scale', min: 0.1, max: 10, step: 0.1, default: 3 }),
  fiberStrength: number({ label: 'Fiber Strength', min: 0, max: 1, step: 0.01, default: 0.3 }),
  fiberWarp: number({ label: 'Fiber Warp', min: 0, max: 1, step: 0.01, default: 0.2 }),
  grainDensity: number({ label: 'Grain Density', min: 0, max: 1, step: 0.01, default: 0.5 }),
  grainSize: number({ label: 'Grain Size', min: 0.1, max: 5, step: 0.1, default: 1 }),
  bumpStrength: number({ label: 'Bump Strength', min: 0, max: 1, step: 0.01, default: 0.15 }),
  lightAngle: number({ label: 'Light Angle', min: 0, max: 360, step: 1, default: 45, unit: 'deg' }),
  seed: number({ label: 'Seed', min: 0, max: 1000, step: 1, default: 42 }),
})

// ============================================================
// Schema Map
// ============================================================

export const SurfaceSchemas = {
  solid: SolidSchema,
  stripe: StripeSchema,
  grid: GridSchema,
  polkaDot: PolkaDotSchema,
  checker: CheckerSchema,
  linearGradient: LinearGradientSchema,
  gradientGrainLinear: GradientGrainLinearSchema,
  gradientGrainCircular: GradientGrainCircularSchema,
  gradientGrainRadial: GradientGrainRadialSchema,
  gradientGrainPerlin: GradientGrainPerlinSchema,
  gradientGrainCurl: GradientGrainCurlSchema,
  gradientGrainSimplex: GradientGrainSimplexSchema,
  triangle: TriangleSchema,
  hexagon: HexagonSchema,
  asanoha: AsanohaSchema,
  seigaiha: SeigaihaSchema,
  wave: WaveSchema,
  scales: ScalesSchema,
  ogee: OgeeSchema,
  sunburst: SunburstSchema,
  paperTexture: PaperTextureSchema,
} as const

// ============================================================
// Surface Registry
// ============================================================

/**
 * Surface Registry
 *
 * Central registry of all available surface patterns.
 * To add a new surface:
 * 1. Create shader in packages/texture/src/shaders/
 * 2. Add schema definition above
 * 3. Add entry here with category, schema, and spec creator
 */
export const SURFACE_REGISTRY = {
  solid: {
    id: 'solid',
    displayName: 'Solid',
    category: 'solid',
    schema: SolidSchema,
    createSpec: (_params, colors) => createSolidSpec({ color: colors.c1 }),
  },

  stripe: {
    id: 'stripe',
    displayName: 'Stripe',
    category: 'geometric',
    schema: StripeSchema,
    createSpec: (params, colors) =>
      createStripeSpec({
        width1: params.width1 as number,
        width2: params.width2 as number,
        angle: params.angle as number,
        color1: colors.c1,
        color2: colors.c2,
      }),
  },

  grid: {
    id: 'grid',
    displayName: 'Grid',
    category: 'geometric',
    schema: GridSchema,
    createSpec: (params, colors) =>
      createGridSpec({
        lineWidth: params.lineWidth as number,
        cellSize: params.cellSize as number,
        lineColor: colors.c1,
        bgColor: colors.c2,
      }),
  },

  polkaDot: {
    id: 'polkaDot',
    displayName: 'Polka Dot',
    category: 'geometric',
    schema: PolkaDotSchema,
    createSpec: (params, colors) =>
      createPolkaDotSpec({
        dotRadius: params.dotRadius as number,
        spacing: params.spacing as number,
        rowOffset: params.rowOffset as number,
        dotColor: colors.c1,
        bgColor: colors.c2,
      }),
  },

  checker: {
    id: 'checker',
    displayName: 'Checker',
    category: 'geometric',
    schema: CheckerSchema,
    createSpec: (params, colors) =>
      createCheckerSpec({
        cellSize: params.cellSize as number,
        angle: params.angle as number,
        color1: colors.c1,
        color2: colors.c2,
      }),
  },

  linearGradient: {
    id: 'linearGradient',
    displayName: 'Linear Gradient',
    category: 'gradient',
    schema: LinearGradientSchema,
    createSpec: (params, colors, viewport) =>
      createLinearGradientSpec(
        {
          angle: params.angle as number,
          centerX: params.centerX as number,
          centerY: params.centerY as number,
          stops: [
            { color: colors.c1, position: 0 },
            { color: colors.c2, position: 1 },
          ],
        },
        viewport
      ),
  },

  gradientGrainLinear: {
    id: 'gradientGrainLinear',
    displayName: 'Gradient Grain (Linear)',
    category: 'gradient-grain',
    schema: GradientGrainLinearSchema,
    createSpec: (params, colors, viewport) =>
      createGradientGrainLinearSpec(
        {
          angle: params.angle as number,
          centerX: params.centerX as number,
          centerY: params.centerY as number,
          colorA: colors.c1,
          colorB: colors.c2,
          seed: params.seed as number,
          sparsity: params.sparsity as number,
          curvePoints: [...DEFAULT_GRADIENT_GRAIN_CURVE_POINTS],
        },
        viewport
      ),
  },

  gradientGrainCircular: {
    id: 'gradientGrainCircular',
    displayName: 'Gradient Grain (Circular)',
    category: 'gradient-grain',
    schema: GradientGrainCircularSchema,
    createSpec: (params, colors, viewport) =>
      createGradientGrainCircularSpec(
        {
          centerX: params.centerX as number,
          centerY: params.centerY as number,
          circularInvert: params.circularInvert as boolean | undefined,
          colorA: colors.c1,
          colorB: colors.c2,
          seed: params.seed as number,
          sparsity: params.sparsity as number,
          curvePoints: [...DEFAULT_GRADIENT_GRAIN_CURVE_POINTS],
        },
        viewport
      ),
  },

  gradientGrainRadial: {
    id: 'gradientGrainRadial',
    displayName: 'Gradient Grain (Radial)',
    category: 'gradient-grain',
    schema: GradientGrainRadialSchema,
    createSpec: (params, colors, viewport) =>
      createGradientGrainRadialSpec(
        {
          centerX: params.centerX as number,
          centerY: params.centerY as number,
          radialStartAngle: params.radialStartAngle as number,
          radialSweepAngle: params.radialSweepAngle as number,
          colorA: colors.c1,
          colorB: colors.c2,
          seed: params.seed as number,
          sparsity: params.sparsity as number,
          curvePoints: [...DEFAULT_GRADIENT_GRAIN_CURVE_POINTS],
        },
        viewport
      ),
  },

  gradientGrainPerlin: {
    id: 'gradientGrainPerlin',
    displayName: 'Gradient Grain (Perlin)',
    category: 'gradient-grain',
    schema: GradientGrainPerlinSchema,
    createSpec: (params, colors, viewport) =>
      createGradientGrainPerlinSpec(
        {
          perlinScale: params.perlinScale as number,
          perlinOctaves: params.perlinOctaves as number,
          perlinContrast: params.perlinContrast as number,
          perlinOffset: params.perlinOffset as number,
          colorA: colors.c1,
          colorB: colors.c2,
          seed: params.seed as number,
          sparsity: params.sparsity as number,
          curvePoints: [...DEFAULT_GRADIENT_GRAIN_CURVE_POINTS],
        },
        viewport
      ),
  },

  gradientGrainCurl: {
    id: 'gradientGrainCurl',
    displayName: 'Gradient Grain (Curl)',
    category: 'gradient-grain',
    schema: GradientGrainCurlSchema,
    createSpec: (params, colors, viewport) =>
      createGradientGrainCurlSpec(
        {
          perlinScale: params.perlinScale as number,
          perlinOctaves: params.perlinOctaves as number,
          perlinContrast: params.perlinContrast as number,
          perlinOffset: params.perlinOffset as number,
          curlIntensity: params.curlIntensity as number,
          colorA: colors.c1,
          colorB: colors.c2,
          seed: params.seed as number,
          sparsity: params.sparsity as number,
          curvePoints: [...DEFAULT_GRADIENT_GRAIN_CURVE_POINTS],
        },
        viewport
      ),
  },

  gradientGrainSimplex: {
    id: 'gradientGrainSimplex',
    displayName: 'Gradient Grain (Simplex)',
    category: 'gradient-grain',
    schema: GradientGrainSimplexSchema,
    createSpec: (params, colors, viewport) =>
      createGradientGrainSimplexSpec(
        {
          simplexScale: params.simplexScale as number,
          simplexOctaves: params.simplexOctaves as number,
          simplexContrast: params.simplexContrast as number,
          simplexOffset: params.simplexOffset as number,
          colorA: colors.c1,
          colorB: colors.c2,
          seed: params.seed as number,
          sparsity: params.sparsity as number,
          curvePoints: [...DEFAULT_GRADIENT_GRAIN_CURVE_POINTS],
        },
        viewport
      ),
  },

  triangle: {
    id: 'triangle',
    displayName: 'Triangle',
    category: 'geometric',
    schema: TriangleSchema,
    createSpec: (params, colors) =>
      createTriangleSpec({
        size: params.size as number,
        angle: params.angle as number,
        color1: colors.c1,
        color2: colors.c2,
      }),
  },

  hexagon: {
    id: 'hexagon',
    displayName: 'Hexagon',
    category: 'geometric',
    schema: HexagonSchema,
    createSpec: (params, colors) =>
      createHexagonSpec({
        size: params.size as number,
        angle: params.angle as number,
        color1: colors.c1,
        color2: colors.c2,
      }),
  },

  asanoha: {
    id: 'asanoha',
    displayName: 'Asanoha (麻の葉)',
    category: 'japanese',
    schema: AsanohaSchema,
    createSpec: (params, colors) =>
      createAsanohaSpec({
        size: params.size as number,
        lineWidth: params.lineWidth as number,
        lineColor: colors.c1,
        bgColor: colors.c2,
      }),
  },

  seigaiha: {
    id: 'seigaiha',
    displayName: 'Seigaiha (青海波)',
    category: 'japanese',
    schema: SeigaihaSchema,
    createSpec: (params, colors) =>
      createSeigaihaSpec({
        radius: params.radius as number,
        rings: params.rings as number,
        lineWidth: params.lineWidth as number,
        lineColor: colors.c1,
        bgColor: colors.c2,
      }),
  },

  wave: {
    id: 'wave',
    displayName: 'Wave',
    category: 'geometric',
    schema: WaveSchema,
    createSpec: (params, colors) =>
      createWaveSpec({
        amplitude: params.amplitude as number,
        wavelength: params.wavelength as number,
        thickness: params.thickness as number,
        angle: params.angle as number,
        color1: colors.c1,
        color2: colors.c2,
      }),
  },

  scales: {
    id: 'scales',
    displayName: 'Scales',
    category: 'geometric',
    schema: ScalesSchema,
    createSpec: (params, colors) =>
      createScalesSpec({
        size: params.size as number,
        overlap: params.overlap as number,
        angle: params.angle as number,
        color1: colors.c1,
        color2: colors.c2,
      }),
  },

  ogee: {
    id: 'ogee',
    displayName: 'Ogee',
    category: 'geometric',
    schema: OgeeSchema,
    createSpec: (params, colors) =>
      createOgeeSpec({
        width: params.width as number,
        height: params.height as number,
        lineWidth: params.lineWidth as number,
        lineColor: colors.c1,
        bgColor: colors.c2,
      }),
  },

  sunburst: {
    id: 'sunburst',
    displayName: 'Sunburst',
    category: 'geometric',
    schema: SunburstSchema,
    createSpec: (params, colors, viewport) =>
      createSunburstSpec({
        rays: params.rays as number,
        centerX: params.centerX as number,
        centerY: params.centerY as number,
        twist: params.twist as number,
        color1: colors.c1,
        color2: colors.c2,
        viewportWidth: viewport.width,
        viewportHeight: viewport.height,
      }),
  },

  paperTexture: {
    id: 'paperTexture',
    displayName: 'Paper Texture',
    category: 'texture',
    schema: PaperTextureSchema,
    createSpec: (params, colors, viewport) =>
      createPaperTextureSpec(
        {
          color: colors.c1,
          fiberScale: params.fiberScale as number,
          fiberStrength: params.fiberStrength as number,
          fiberWarp: params.fiberWarp as number,
          grainDensity: params.grainDensity as number,
          grainSize: params.grainSize as number,
          bumpStrength: params.bumpStrength as number,
          lightAngle: params.lightAngle as number,
          seed: params.seed as number,
        },
        viewport
      ),
  },
} as const satisfies Record<string, SurfaceDefinition>

// ============================================================
// Type Helpers
// ============================================================

/** All surface type keys */
export type SurfaceType = keyof typeof SURFACE_REGISTRY

/** Array of all surface types */
export const SURFACE_TYPES = Object.keys(SURFACE_REGISTRY) as SurfaceType[]

/** Get surface definition by type */
export function getSurfaceDefinition(type: string): SurfaceDefinition | undefined {
  return (SURFACE_REGISTRY as Record<string, SurfaceDefinition>)[type]
}

/** Check if surface type is valid */
export function isValidSurfaceType(type: string): type is SurfaceType {
  return type in SURFACE_REGISTRY
}

/** Get default params for a surface type */
export function getDefaultSurfaceParams(type: string): GenericSurfaceParams {
  const def = getSurfaceDefinition(type)
  if (!def) {
    return { type }
  }
  return {
    type,
    ...getDefaults(def.schema),
  }
}

/** Get all surfaces by category */
export function getSurfacesByCategory(category: SurfaceCategory): SurfaceDefinition[] {
  return Object.values(SURFACE_REGISTRY).filter(def => def.category === category)
}

/** Get all surface categories */
export function getSurfaceCategories(): SurfaceCategory[] {
  const categories = new Set<SurfaceCategory>()
  for (const def of Object.values(SURFACE_REGISTRY)) {
    categories.add(def.category)
  }
  return Array.from(categories)
}
