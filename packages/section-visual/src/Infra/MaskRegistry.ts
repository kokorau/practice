/**
 * Mask Registry
 *
 * Centralized registry for all mask shape definitions.
 * Adding a new mask shape requires only:
 * 1. Define shader in packages/texture/src/shaders/masks/
 * 2. Add entry to MASK_REGISTRY here
 */

import { type ObjectSchema } from '@practice/schema'
import type { Viewport } from '@practice/texture'
import {
  createCircleMaskSpec,
  createRectMaskSpec,
  createPerlinMaskSpec,
  createLinearGradientMaskSpec,
  createRadialGradientMaskSpec,
  createBoxGradientMaskSpec,
  createWavyLineMaskSpec,
  type CircleMaskParams,
  type RectMaskParams,
  type PerlinMaskParams,
  type LinearGradientMaskParams,
  type RadialGradientMaskParams,
  type BoxGradientMaskParams,
  type WavyLineMaskParams,
} from '@practice/texture'

import {
  MaskBaseSchema,
  CircleMaskSchema,
  RectMaskSchema,
  BlobMaskSchema,
  PerlinMaskSchema,
  LinearGradientMaskSchema,
  RadialGradientMaskSchema,
  BoxGradientMaskSchema,
  WavyLineMaskSchema,
} from '../Domain/MaskSchema'

// ============================================================
// Types
// ============================================================

/**
 * Mask category for UI grouping
 */
export type MaskCategory =
  | 'basic'
  | 'gradient'
  | 'noise'
  | 'organic'

/**
 * Generic mask parameters
 * Used when the specific type is not known at compile time
 */
export interface GenericMaskConfig {
  shape: string
  enabled: boolean
  feather: number
  invert: boolean
  [key: string]: unknown
}

/** Common colors for mask rendering */
export interface MaskColors {
  innerColor: [number, number, number, number]
  outerColor: [number, number, number, number]
}

/** Default grayscale colors for mask generation */
export const DEFAULT_MASK_COLORS: MaskColors = {
  innerColor: [1, 1, 1, 1], // White (opaque)
  outerColor: [0, 0, 0, 1], // Black (transparent)
}

/**
 * Mask shader spec returned by createShaderSpec
 */
export interface MaskShaderSpec {
  shader: string
  uniforms: ArrayBuffer
  bufferSize: number
}

/**
 * Mask definition interface
 */
export interface MaskDefinition {
  /** Mask ID (matches registry key) */
  id: string
  /** Display name for UI */
  displayName: string
  /** Category for UI grouping */
  category: MaskCategory
  /** Schema definition for shape-specific params */
  schema: ObjectSchema
  /** Whether this mask supports standalone shader */
  hasShader: boolean
  /** Create default config for this shape */
  createDefaultConfig: (base?: { enabled?: boolean; feather?: number; invert?: boolean }) => GenericMaskConfig
  /** Create shader spec (null if not supported) */
  createShaderSpec: ((
    config: GenericMaskConfig,
    viewport: Viewport,
    colors?: MaskColors
  ) => MaskShaderSpec) | null
}

// ============================================================
// Shader Spec Creators
// ============================================================

function createCircleShaderSpec(
  config: GenericMaskConfig,
  viewport: Viewport,
  colors: MaskColors = DEFAULT_MASK_COLORS
): MaskShaderSpec {
  const params: CircleMaskParams = {
    centerX: config.centerX as number,
    centerY: config.centerY as number,
    radius: config.radius as number,
    innerColor: colors.innerColor,
    outerColor: colors.outerColor,
    cutout: config.cutout as boolean,
  }
  return createCircleMaskSpec(params, viewport)
}

function createRectShaderSpec(
  config: GenericMaskConfig,
  viewport: Viewport,
  colors: MaskColors = DEFAULT_MASK_COLORS
): MaskShaderSpec {
  const params: RectMaskParams = {
    left: config.left as number,
    right: config.right as number,
    top: config.top as number,
    bottom: config.bottom as number,
    radiusTopLeft: config.radiusTopLeft as number,
    radiusTopRight: config.radiusTopRight as number,
    radiusBottomLeft: config.radiusBottomLeft as number,
    radiusBottomRight: config.radiusBottomRight as number,
    rotation: config.rotation as number,
    perspectiveX: config.perspectiveX as number,
    perspectiveY: config.perspectiveY as number,
    innerColor: colors.innerColor,
    outerColor: colors.outerColor,
    cutout: config.cutout as boolean,
  }
  return createRectMaskSpec(params, viewport)
}

function createPerlinShaderSpec(
  config: GenericMaskConfig,
  viewport: Viewport,
  colors: MaskColors = DEFAULT_MASK_COLORS
): MaskShaderSpec {
  const params: PerlinMaskParams = {
    seed: config.seed as number,
    threshold: config.threshold as number,
    scale: config.scale as number,
    octaves: config.octaves as number,
    innerColor: colors.innerColor,
    outerColor: colors.outerColor,
    cutout: config.cutout as boolean,
  }
  return createPerlinMaskSpec(params, viewport)
}

function createLinearGradientShaderSpec(
  config: GenericMaskConfig,
  viewport: Viewport,
  colors: MaskColors = DEFAULT_MASK_COLORS
): MaskShaderSpec {
  const params: LinearGradientMaskParams = {
    angle: config.angle as number,
    startOffset: config.startOffset as number,
    endOffset: config.endOffset as number,
    innerColor: colors.innerColor,
    outerColor: colors.outerColor,
    cutout: config.cutout as boolean,
  }
  return createLinearGradientMaskSpec(params, viewport)
}

function createRadialGradientShaderSpec(
  config: GenericMaskConfig,
  viewport: Viewport,
  colors: MaskColors = DEFAULT_MASK_COLORS
): MaskShaderSpec {
  const params: RadialGradientMaskParams = {
    centerX: config.centerX as number,
    centerY: config.centerY as number,
    innerRadius: config.innerRadius as number,
    outerRadius: config.outerRadius as number,
    aspectRatio: config.aspectRatio as number,
    innerColor: colors.innerColor,
    outerColor: colors.outerColor,
    cutout: config.cutout as boolean,
  }
  return createRadialGradientMaskSpec(params, viewport)
}

function createBoxGradientShaderSpec(
  config: GenericMaskConfig,
  viewport: Viewport,
  colors: MaskColors = DEFAULT_MASK_COLORS
): MaskShaderSpec {
  const params: BoxGradientMaskParams = {
    left: config.left as number,
    right: config.right as number,
    top: config.top as number,
    bottom: config.bottom as number,
    cornerRadius: config.cornerRadius as number,
    curve: config.curve as 'linear' | 'smooth' | 'easeIn' | 'easeOut',
    innerColor: colors.innerColor,
    outerColor: colors.outerColor,
    cutout: config.cutout as boolean,
  }
  return createBoxGradientMaskSpec(params, viewport)
}

function createWavyLineShaderSpec(
  config: GenericMaskConfig,
  viewport: Viewport,
  colors: MaskColors = DEFAULT_MASK_COLORS
): MaskShaderSpec {
  const params: WavyLineMaskParams = {
    position: config.position as number,
    direction: config.direction as 'vertical' | 'horizontal',
    amplitude: config.amplitude as number,
    frequency: config.frequency as number,
    octaves: config.octaves as number,
    seed: config.seed as number,
    innerColor: colors.innerColor,
    outerColor: colors.outerColor,
    cutout: config.cutout as boolean,
  }
  return createWavyLineMaskSpec(params, viewport)
}

// ============================================================
// Mask Registry
// ============================================================

/**
 * Mask Registry
 *
 * Central registry of all available mask shapes.
 * To add a new mask shape:
 * 1. Create shader in packages/texture/src/shaders/masks/
 * 2. Add schema definition in MaskSchema.ts
 * 3. Add entry here with category, schema, and spec creator
 */
export const MASK_REGISTRY = {
  circle: {
    id: 'circle',
    displayName: 'Circle',
    category: 'basic',
    schema: CircleMaskSchema,
    hasShader: true,
    createDefaultConfig: (base) => ({
      shape: 'circle',
      enabled: base?.enabled ?? true,
      feather: base?.feather ?? 0,
      invert: base?.invert ?? false,
      centerX: 0.5,
      centerY: 0.5,
      radius: 0.3,
      cutout: false,
    }),
    createShaderSpec: createCircleShaderSpec,
  },

  rect: {
    id: 'rect',
    displayName: 'Rectangle',
    category: 'basic',
    schema: RectMaskSchema,
    hasShader: true,
    createDefaultConfig: (base) => ({
      shape: 'rect',
      enabled: base?.enabled ?? true,
      feather: base?.feather ?? 0,
      invert: base?.invert ?? false,
      left: 0.2,
      right: 0.8,
      top: 0.2,
      bottom: 0.8,
      radiusTopLeft: 0,
      radiusTopRight: 0,
      radiusBottomLeft: 0,
      radiusBottomRight: 0,
      rotation: 0,
      perspectiveX: 0,
      perspectiveY: 0,
      cutout: false,
    }),
    createShaderSpec: createRectShaderSpec,
  },

  blob: {
    id: 'blob',
    displayName: 'Blob',
    category: 'organic',
    schema: BlobMaskSchema,
    hasShader: false, // Blob is handled via maskedTexture shaders
    createDefaultConfig: (base) => ({
      shape: 'blob',
      enabled: base?.enabled ?? true,
      feather: base?.feather ?? 0,
      invert: base?.invert ?? false,
      centerX: 0.5,
      centerY: 0.5,
      baseRadius: 0.3,
      amplitude: 0.1,
      octaves: 3,
      seed: 42,
      cutout: false,
    }),
    createShaderSpec: null,
  },

  perlin: {
    id: 'perlin',
    displayName: 'Perlin Noise',
    category: 'noise',
    schema: PerlinMaskSchema,
    hasShader: true,
    createDefaultConfig: (base) => ({
      shape: 'perlin',
      enabled: base?.enabled ?? true,
      feather: base?.feather ?? 0,
      invert: base?.invert ?? false,
      seed: 42,
      threshold: 0.5,
      scale: 4,
      octaves: 4,
      cutout: false,
    }),
    createShaderSpec: createPerlinShaderSpec,
  },

  linearGradient: {
    id: 'linearGradient',
    displayName: 'Linear Gradient',
    category: 'gradient',
    schema: LinearGradientMaskSchema,
    hasShader: true,
    createDefaultConfig: (base) => ({
      shape: 'linearGradient',
      enabled: base?.enabled ?? true,
      feather: base?.feather ?? 0,
      invert: base?.invert ?? false,
      angle: 0,
      startOffset: 0.3,
      endOffset: 0.7,
      cutout: false,
    }),
    createShaderSpec: createLinearGradientShaderSpec,
  },

  radialGradient: {
    id: 'radialGradient',
    displayName: 'Radial Gradient',
    category: 'gradient',
    schema: RadialGradientMaskSchema,
    hasShader: true,
    createDefaultConfig: (base) => ({
      shape: 'radialGradient',
      enabled: base?.enabled ?? true,
      feather: base?.feather ?? 0,
      invert: base?.invert ?? false,
      centerX: 0.5,
      centerY: 0.5,
      innerRadius: 0.1,
      outerRadius: 0.5,
      aspectRatio: 1,
      cutout: false,
    }),
    createShaderSpec: createRadialGradientShaderSpec,
  },

  boxGradient: {
    id: 'boxGradient',
    displayName: 'Box Gradient',
    category: 'gradient',
    schema: BoxGradientMaskSchema,
    hasShader: true,
    createDefaultConfig: (base) => ({
      shape: 'boxGradient',
      enabled: base?.enabled ?? true,
      feather: base?.feather ?? 0,
      invert: base?.invert ?? false,
      left: 0.1,
      right: 0.1,
      top: 0.1,
      bottom: 0.1,
      cornerRadius: 0,
      curve: 'linear',
      cutout: false,
    }),
    createShaderSpec: createBoxGradientShaderSpec,
  },

  wavyLine: {
    id: 'wavyLine',
    displayName: 'Wavy Line',
    category: 'organic',
    schema: WavyLineMaskSchema,
    hasShader: true,
    createDefaultConfig: (base) => ({
      shape: 'wavyLine',
      enabled: base?.enabled ?? true,
      feather: base?.feather ?? 0,
      invert: base?.invert ?? false,
      position: 0.5,
      direction: 'vertical',
      amplitude: 0.08,
      frequency: 3,
      octaves: 2,
      seed: 42,
      cutout: false,
    }),
    createShaderSpec: createWavyLineShaderSpec,
  },
} as const satisfies Record<string, MaskDefinition>

// ============================================================
// Type Helpers
// ============================================================

/** All mask shape keys */
export type MaskShapeType = keyof typeof MASK_REGISTRY

/** Array of all mask shapes */
export const MASK_SHAPE_TYPES = Object.keys(MASK_REGISTRY) as MaskShapeType[]

/** Get mask definition by shape */
export function getMaskDefinition(shape: string): MaskDefinition | undefined {
  return (MASK_REGISTRY as Record<string, MaskDefinition>)[shape]
}

/** Check if mask shape is valid */
export function isValidMaskShape(shape: string): shape is MaskShapeType {
  return shape in MASK_REGISTRY
}

/** Get default config for a mask shape */
export function getDefaultMaskConfig(
  shape: string,
  base?: { enabled?: boolean; feather?: number; invert?: boolean }
): GenericMaskConfig | null {
  const def = getMaskDefinition(shape)
  if (!def) return null
  return def.createDefaultConfig(base)
}

/** Get all masks by category */
export function getMasksByCategory(category: MaskCategory): MaskDefinition[] {
  return Object.values(MASK_REGISTRY).filter(def => def.category === category)
}

/** Get all mask categories */
export function getMaskCategories(): MaskCategory[] {
  const categories = new Set<MaskCategory>()
  for (const def of Object.values(MASK_REGISTRY)) {
    categories.add(def.category)
  }
  return Array.from(categories)
}

/** Get masks that have standalone shaders */
export function getMasksWithShader(): MaskDefinition[] {
  return Object.values(MASK_REGISTRY).filter(def => def.hasShader)
}

/** Get mask shape options for UI (compatible with select field) */
export function getMaskShapeOptions(): { value: string; label: string }[] {
  return Object.values(MASK_REGISTRY).map(def => ({
    value: def.id,
    label: def.displayName,
  }))
}

/**
 * Create mask shader spec using registry
 *
 * @throws Error if shape doesn't support standalone shader
 */
export function createMaskShaderSpecFromRegistry(
  config: GenericMaskConfig,
  viewport: Viewport,
  colors: MaskColors = DEFAULT_MASK_COLORS
): MaskShaderSpec {
  const def = getMaskDefinition(config.shape)
  if (!def) {
    throw new Error(`Unknown mask shape: ${config.shape}`)
  }
  if (!def.createShaderSpec) {
    throw new Error(`Mask shape '${config.shape}' does not support standalone shader`)
  }
  return def.createShaderSpec(config, viewport, colors)
}

// ============================================================
// Base Schema Export
// ============================================================

export { MaskBaseSchema }
