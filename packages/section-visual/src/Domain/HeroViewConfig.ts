/**
 * HeroViewConfig
 *
 * HeroView の完全な状態を表す統合インターフェース
 * - 外部参照なし（fontId, imageId は文字列識別子）
 * - JSON.stringify 可能（保存・復元可能）
 * - LayerNode[] ベースの構造
 */

import type { LayerEffectConfig } from './EffectSchema'
import { createDefaultEffectConfig } from './EffectSchema'
import { type EffectType, EFFECT_TYPES, EFFECT_REGISTRY, isValidEffectType } from './EffectRegistry'
import type { PropertyValue } from './SectionVisual'
import { $PropertyValue } from './SectionVisual'

// ============================================================
// Color Config Types (for serialization)
// ============================================================

/**
 * PrimitiveKey type (duplicated here for JSON serialization independence)
 * Original definition in SemanticColorPalette/Domain/ValueObject/PrimitivePalette.ts
 */
export type HeroPrimitiveKey =
  | 'BN0' | 'BN1' | 'BN2' | 'BN3' | 'BN4' | 'BN5' | 'BN6' | 'BN7' | 'BN8' | 'BN9'
  | 'F0' | 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F6' | 'F7' | 'F8' | 'F9'
  | 'AN0' | 'AN1' | 'AN2' | 'AN3' | 'AN4' | 'AN5' | 'AN6' | 'AN7' | 'AN8' | 'AN9'
  | 'B' | 'Bt' | 'Bs' | 'Bf'
  | 'A' | 'At' | 'As' | 'Af'

/**
 * ContextName type (duplicated here for JSON serialization independence)
 * Original definition in SemanticColorPalette/Domain/ValueObject/SemanticNames.ts
 */
export type HeroContextName = 'canvas' | 'sectionNeutral' | 'sectionTint' | 'sectionContrast'

/**
 * HSV color value
 */
export interface HsvColor {
  hue: number
  saturation: number
  value: number
}

/**
 * Per-surface color configuration
 * Each surface layer can have its own color settings
 */
export interface SurfaceColorsConfig {
  /** Primary color key from palette */
  primary: HeroPrimitiveKey | 'auto'
  /** Secondary color key from palette */
  secondary: HeroPrimitiveKey | 'auto'
}

/**
 * Color configuration for HeroView
 * Contains global color state (semantic context only)
 *
 * Note: Per-surface colors (primary/secondary) are now stored on each
 * SurfaceLayerNodeConfig.colors field, not here.
 *
 * Note: Brand/accent/foundation HSV colors are stored in the preset's
 * colorPreset field, not in config.colors. UI manages these via useSiteColors.
 */
export interface HeroColorsConfig {
  /** Semantic context for color resolution */
  semanticContext: HeroContextName
}

// ============================================================
// Viewport
// ============================================================

export interface ViewportConfig {
  width: number
  height: number
}

// ============================================================
// Surface Config (テクスチャパターン)
// ============================================================

/**
 * SurfaceConfig - JSON-serializable surface definition
 *
 * ## Surface vs SurfaceConfig
 *
 * This codebase uses a two-layer type system for surfaces:
 *
 * | Aspect | Surface (LayerNode.ts) | SurfaceConfig (this file) |
 * |--------|------------------------|---------------------------|
 * | Purpose | Runtime rendering | JSON serialization/persistence |
 * | Image data | `ImageBitmap \| string` | `imageId: string` |
 * | Pattern | `TexturePatternSpec` | Individual params (width1, angle, etc.) |
 * | Serializable | No (contains runtime objects) | Yes (JSON.stringify safe) |
 *
 * ## Usage Guidelines by Layer
 *
 * - **Domain**: Use `SurfaceConfig` for persistence schemas and config types
 * - **Application**: Use `SurfaceConfig` for usecase inputs/outputs (repository operations)
 * - **Infra**: Use `SurfaceConfig` for storage, convert to `Surface` for rendering
 *
 * ## Naming Convention for Conversion Functions
 *
 * - `toSurfaceConfig(surface: Surface): SurfaceConfig` - Extract serializable data
 * - `fromSurfaceConfig(config: SurfaceConfig, ...deps): Surface` - Create runtime objects
 *
 * @see LayerNode.ts for Surface (runtime) definition
 */

export interface StripeSurfaceConfig {
  type: 'stripe'
  width1: number
  width2: number
  angle: number
}

export interface GridSurfaceConfig {
  type: 'grid'
  lineWidth: number
  cellSize: number
}

export interface PolkaDotSurfaceConfig {
  type: 'polkaDot'
  dotRadius: number
  spacing: number
  rowOffset: number
}

export interface CheckerSurfaceConfig {
  type: 'checker'
  cellSize: number
  angle: number
}

export interface SolidSurfaceConfig {
  type: 'solid'
}


export interface GradientGrainLinearSurfaceConfig {
  type: 'gradientGrainLinear'
  angle: number
  centerX: number
  centerY: number
  seed: number
  sparsity: number
}

export interface GradientGrainCircularSurfaceConfig {
  type: 'gradientGrainCircular'
  centerX: number
  centerY: number
  circularInvert?: boolean
  seed: number
  sparsity: number
}

export interface GradientGrainRadialSurfaceConfig {
  type: 'gradientGrainRadial'
  centerX: number
  centerY: number
  radialStartAngle: number
  radialSweepAngle: number
  seed: number
  sparsity: number
}

export interface GradientGrainPerlinSurfaceConfig {
  type: 'gradientGrainPerlin'
  perlinScale: number
  perlinOctaves: number
  perlinContrast: number
  perlinOffset: number
  seed: number
  sparsity: number
}

export interface GradientGrainCurlSurfaceConfig {
  type: 'gradientGrainCurl'
  perlinScale: number
  perlinOctaves: number
  perlinContrast: number
  perlinOffset: number
  curlIntensity: number
  seed: number
  sparsity: number
}

export interface GradientGrainSimplexSurfaceConfig {
  type: 'gradientGrainSimplex'
  simplexScale: number
  simplexOctaves: number
  simplexContrast: number
  simplexOffset: number
  seed: number
  sparsity: number
}

export interface TriangleSurfaceConfig {
  type: 'triangle'
  size: number
  angle: number
}

export interface HexagonSurfaceConfig {
  type: 'hexagon'
  size: number
  angle: number
}

export interface AsanohaSurfaceConfig {
  type: 'asanoha'
  size: number
  lineWidth: number
}

export interface SeigaihaSurfaceConfig {
  type: 'seigaiha'
  radius: number
  rings: number
  lineWidth: number
}

export interface WaveSurfaceConfig {
  type: 'wave'
  amplitude: number
  wavelength: number
  thickness: number
  angle: number
}

export interface ScalesSurfaceConfig {
  type: 'scales'
  size: number
  overlap: number
  angle: number
}

export interface OgeeSurfaceConfig {
  type: 'ogee'
  width: number
  height: number
  lineWidth: number
}

export interface SunburstSurfaceConfig {
  type: 'sunburst'
  rays: number
  centerX: number
  centerY: number
  twist: number
}


export type SurfaceConfig =
  | SolidSurfaceConfig
  | StripeSurfaceConfig
  | GridSurfaceConfig
  | PolkaDotSurfaceConfig
  | CheckerSurfaceConfig
  | GradientGrainLinearSurfaceConfig
  | GradientGrainCircularSurfaceConfig
  | GradientGrainRadialSurfaceConfig
  | GradientGrainPerlinSurfaceConfig
  | GradientGrainCurlSurfaceConfig
  | GradientGrainSimplexSurfaceConfig
  | TriangleSurfaceConfig
  | HexagonSurfaceConfig
  | AsanohaSurfaceConfig
  | SeigaihaSurfaceConfig
  | WaveSurfaceConfig
  | ScalesSurfaceConfig
  | OgeeSurfaceConfig
  | SunburstSurfaceConfig

/** @deprecated Use SurfaceConfig instead */
export type BackgroundSurfaceConfig = SurfaceConfig
/** @deprecated Use SurfaceConfig instead */
export type MaskSurfaceConfig = SurfaceConfig

// ============================================================
// Normalized Config Types (Phase 12: id + params pattern)
// ============================================================

/**
 * Surface type identifier (all supported surface pattern types)
 */
export type SurfaceType = SurfaceConfig['type']

/**
 * Array of all surface types for iteration
 */
export const SURFACE_TYPES: SurfaceType[] = [
  'solid',
  'stripe',
  'grid',
  'polkaDot',
  'checker',
  'gradientGrainLinear',
  'gradientGrainCircular',
  'gradientGrainRadial',
  'gradientGrainPerlin',
  'gradientGrainCurl',
  'gradientGrainSimplex',
  'triangle',
  'hexagon',
  'asanoha',
  'seigaiha',
  'wave',
  'scales',
  'ogee',
  'sunburst',
]

/**
 * Normalized surface configuration (new format)
 *
 * Separates the surface type identifier from its parameters.
 * This enables a uniform structure across all config types.
 *
 * @example
 * ```typescript
 * const surface: NormalizedSurfaceConfig = {
 *   id: 'stripe',
 *   params: { width1: 20, width2: 20, angle: 45 }
 * }
 * ```
 */
export interface NormalizedSurfaceConfig {
  /** Surface type identifier */
  id: SurfaceType
  /** Surface-specific parameters (static or bound to timeline) */
  params: Record<string, PropertyValue>
}

/**
 * Type guard for NormalizedSurfaceConfig (new format)
 */
export function isNormalizedSurfaceConfig(
  config: SurfaceConfig | NormalizedSurfaceConfig
): config is NormalizedSurfaceConfig {
  return 'id' in config && 'params' in config && !('type' in config)
}

/**
 * Type guard for legacy SurfaceConfig (type-spread format)
 */
export function isLegacyTypeSurfaceConfig(
  config: SurfaceConfig | NormalizedSurfaceConfig
): config is SurfaceConfig {
  return 'type' in config && !('id' in config)
}

/**
 * Convert legacy SurfaceConfig to NormalizedSurfaceConfig
 * Legacy params (raw values) are wrapped in StaticValue
 */
export function normalizeSurfaceConfig(config: SurfaceConfig): NormalizedSurfaceConfig {
  const { type, ...rawParams } = config
  const params: Record<string, PropertyValue> = {}
  for (const [key, value] of Object.entries(rawParams)) {
    if (typeof value === 'number' || typeof value === 'string') {
      params[key] = $PropertyValue.static(value)
    }
  }
  return { id: type, params }
}

/**
 * Convert NormalizedSurfaceConfig to legacy SurfaceConfig
 * Only StaticValue params are extracted; RangeExpr throws error
 */
export function denormalizeSurfaceConfig(config: NormalizedSurfaceConfig): SurfaceConfig {
  const rawParams: Record<string, unknown> = {}
  for (const [key, prop] of Object.entries(config.params)) {
    if ($PropertyValue.isStatic(prop)) {
      rawParams[key] = prop.value
    } else {
      throw new Error(`Cannot denormalize RangeExpr for key "${key}". Use resolveParams() instead.`)
    }
  }
  return { type: config.id, ...rawParams } as SurfaceConfig
}

/**
 * Safely convert NormalizedSurfaceConfig to legacy SurfaceConfig
 * For RangeExpr params, uses the `min` value (base value when intensity=0)
 *
 * Use this for preset matching where approximate values are acceptable.
 * For accurate rendering, use resolveParams() with an IntensityProvider instead.
 */
export function safeDenormalizeSurfaceConfig(config: NormalizedSurfaceConfig): SurfaceConfig {
  const rawParams: Record<string, unknown> = {}
  for (const [key, prop] of Object.entries(config.params)) {
    if ($PropertyValue.isStatic(prop)) {
      rawParams[key] = prop.value
    } else if ($PropertyValue.isRange(prop)) {
      // Use min value as the base/default value for preset matching
      rawParams[key] = prop.min
    } else if (typeof prop === 'number' || typeof prop === 'string' || typeof prop === 'boolean') {
      // Already resolved raw value (from CompiledSurface.params)
      rawParams[key] = prop
    }
  }
  return { type: config.id, ...rawParams } as SurfaceConfig
}

/**
 * Union type for both surface config formats
 */
export type AnySurfaceConfig = SurfaceConfig | NormalizedSurfaceConfig

/**
 * Get surface config in normalized format (accepts both formats)
 */
export function getSurfaceAsNormalized(config: AnySurfaceConfig): NormalizedSurfaceConfig {
  if (isNormalizedSurfaceConfig(config)) return config
  return normalizeSurfaceConfig(config)
}

/**
 * Get surface config in legacy format (accepts both formats)
 * For RangeExpr params, uses the `min` value (base value when intensity=0)
 */
export function getSurfaceAsLegacy(config: AnySurfaceConfig): SurfaceConfig {
  if (isLegacyTypeSurfaceConfig(config)) return config
  return safeDenormalizeSurfaceConfig(config)
}

// ============================================================
// Shader Reference Types (UUID-based system)
// ============================================================

/**
 * UUID-based shader reference
 *
 * This allows referencing shaders by their stable UUID instead of type discriminator.
 * Enables community-created shaders and better versioning.
 *
 * @see ShaderDefinition in ShaderDefinition.ts for the full shader definition
 * @see ShaderRegistry in Infra/ShaderRegistry.ts for the registry
 */
export interface ShaderRefConfig {
  /** UUID of the shader in the registry */
  shaderId: string
  /** Parameter overrides (merged with shader defaults) */
  params?: Record<string, unknown>
}

/**
 * Surface configuration that supports both legacy and UUID-based formats
 *
 * Use this type when accepting surface configs that may be in either format.
 * Legacy format uses `type` discriminator, modern format uses `shaderId`.
 *
 * @example
 * ```typescript
 * // Legacy format (backward compatible)
 * const legacy: SurfaceRefConfig = { type: 'stripe', width1: 20, width2: 20, angle: 45 }
 *
 * // Modern UUID format
 * const modern: SurfaceRefConfig = {
 *   shaderId: '00000000-0000-0000-0000-000000000002',
 *   params: { width1: 30 }
 * }
 * ```
 */
export type SurfaceRefConfig = SurfaceConfig | ShaderRefConfig

/**
 * Type guard to check if a surface config uses the new UUID-based format
 */
export function isShaderRefConfig(config: SurfaceRefConfig): config is ShaderRefConfig {
  return 'shaderId' in config && typeof (config as ShaderRefConfig).shaderId === 'string'
}

/**
 * Type guard to check if a surface config uses the legacy type-based format
 */
export function isLegacySurfaceConfig(config: SurfaceRefConfig): config is SurfaceConfig {
  return 'type' in config && !('shaderId' in config)
}

// ============================================================
// Mask Shape Config
// ============================================================

export interface CircleMaskShapeConfig {
  type: 'circle'
  centerX: number
  centerY: number
  radius: number
  cutout: boolean
}

export interface RectMaskShapeConfig {
  type: 'rect'
  left: number
  right: number
  top: number
  bottom: number
  radiusTopLeft: number
  radiusTopRight: number
  radiusBottomLeft: number
  radiusBottomRight: number
  /** Z-axis rotation in degrees (0-360) */
  rotation: number
  /** Horizontal perspective (-0.5 to 0.5, negative=left narrow, positive=right narrow) */
  perspectiveX: number
  /** Vertical perspective (-0.5 to 0.5, negative=top narrow, positive=bottom narrow) */
  perspectiveY: number
  cutout: boolean
}

export interface BlobMaskShapeConfig {
  type: 'blob'
  centerX: number
  centerY: number
  baseRadius: number
  amplitude: number
  octaves: number
  seed: number
  cutout: boolean
}

export interface PerlinMaskShapeConfig {
  type: 'perlin'
  seed: number
  threshold: number
  scale: number
  octaves: number
  cutout: boolean
}

export interface SimplexMaskShapeConfig {
  type: 'simplex'
  seed: number
  threshold: number
  scale: number
  octaves: number
  cutout: boolean
}

export interface CurlMaskShapeConfig {
  type: 'curl'
  seed: number
  threshold: number
  scale: number
  octaves: number
  intensity: number
  cutout: boolean
}

export interface LinearGradientMaskShapeConfig {
  type: 'linearGradient'
  /** グラデーション方向 (0-360度) */
  angle: number
  /** 開始位置 (0-1, 正規化座標) */
  startOffset: number
  /** 終了位置 (0-1, 正規化座標) */
  endOffset: number
  cutout: boolean
}

export interface RadialGradientMaskShapeConfig {
  type: 'radialGradient'
  /** 中心X座標 (0-1, 正規化) */
  centerX: number
  /** 中心Y座標 (0-1, 正規化) */
  centerY: number
  /** 完全不透明の内側半径 */
  innerRadius: number
  /** 完全透明の外側半径 */
  outerRadius: number
  /** 楕円形対応 (1.0 = 真円) */
  aspectRatio: number
  cutout: boolean
}

export interface BoxGradientMaskShapeConfig {
  type: 'boxGradient'
  /** 左辺からの減衰幅 (0-1, 正規化座標) */
  left: number
  /** 右辺からの減衰幅 (0-1, 正規化座標) */
  right: number
  /** 上辺からの減衰幅 (0-1, 正規化座標) */
  top: number
  /** 下辺からの減衰幅 (0-1, 正規化座標) */
  bottom: number
  /** 角丸半径 */
  cornerRadius: number
  /** フェードカーブ (0=linear, 1=smooth, 2=easeIn, 3=easeOut) */
  curve: 'linear' | 'smooth' | 'easeIn' | 'easeOut'
  cutout: boolean
}

export interface WavyLineMaskShapeConfig {
  type: 'wavyLine'
  /** 境界線の位置 (0-1, 正規化座標) */
  position: number
  /** 分割方向: 'vertical' = 左右分割, 'horizontal' = 上下分割 */
  direction: 'vertical' | 'horizontal'
  /** 波の振幅 (0-0.3) */
  amplitude: number
  /** 波の周波数 (1-20) */
  frequency: number
  /** fBmオクターブ数 (1-5) */
  octaves: number
  /** ランダムシード */
  seed: number
  cutout: boolean
}

export type MaskShapeConfig =
  | CircleMaskShapeConfig
  | RectMaskShapeConfig
  | BlobMaskShapeConfig
  | PerlinMaskShapeConfig
  | SimplexMaskShapeConfig
  | CurlMaskShapeConfig
  | LinearGradientMaskShapeConfig
  | RadialGradientMaskShapeConfig
  | BoxGradientMaskShapeConfig
  | WavyLineMaskShapeConfig

// ============================================================
// Normalized Mask Config Types (Phase 12: id + params pattern)
// ============================================================

/**
 * Mask shape type identifier (re-exported from MaskShapeConfig)
 */
export type MaskShapeTypeId = MaskShapeConfig['type']

/**
 * Array of all mask shape types for iteration
 */
export const MASK_SHAPE_TYPE_IDS: MaskShapeTypeId[] = [
  'circle',
  'rect',
  'blob',
  'perlin',
  'simplex',
  'curl',
  'linearGradient',
  'radialGradient',
  'boxGradient',
  'wavyLine',
]

/**
 * Normalized mask shape configuration (new format)
 *
 * Separates the mask shape type identifier from its parameters.
 * This enables a uniform structure across all config types.
 *
 * @example
 * ```typescript
 * const mask: NormalizedMaskConfig = {
 *   id: 'circle',
 *   params: { centerX: 0.5, centerY: 0.5, radius: 0.3, cutout: true }
 * }
 * ```
 */
export interface NormalizedMaskConfig {
  /** Mask shape type identifier */
  id: MaskShapeTypeId
  /** Mask-specific parameters (static or bound to timeline) */
  params: Record<string, PropertyValue>
}

/**
 * Type guard for NormalizedMaskConfig (new format)
 */
export function isNormalizedMaskConfig(
  config: MaskShapeConfig | NormalizedMaskConfig
): config is NormalizedMaskConfig {
  return 'id' in config && 'params' in config && !('type' in config)
}

/**
 * Type guard for legacy MaskShapeConfig (type-spread format)
 */
export function isLegacyTypeMaskConfig(
  config: MaskShapeConfig | NormalizedMaskConfig
): config is MaskShapeConfig {
  return 'type' in config && !('id' in config)
}

/**
 * Convert legacy MaskShapeConfig to NormalizedMaskConfig
 * Legacy params (raw values) are wrapped in StaticValue
 */
export function normalizeMaskConfig(config: MaskShapeConfig): NormalizedMaskConfig {
  const { type, ...rawParams } = config
  const params: Record<string, PropertyValue> = {}
  for (const [key, value] of Object.entries(rawParams)) {
    if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
      params[key] = $PropertyValue.static(value)
    }
  }
  return { id: type, params }
}

/**
 * Convert NormalizedMaskConfig to legacy MaskShapeConfig
 * Only StaticValue params are extracted; RangeExpr throws error
 */
export function denormalizeMaskConfig(config: NormalizedMaskConfig): MaskShapeConfig {
  const rawParams: Record<string, unknown> = {}
  for (const [key, prop] of Object.entries(config.params)) {
    if ($PropertyValue.isStatic(prop)) {
      rawParams[key] = prop.value
    } else {
      throw new Error(`Cannot denormalize RangeExpr for key "${key}". Use resolveParams() instead.`)
    }
  }
  return { type: config.id, ...rawParams } as MaskShapeConfig
}

/**
 * Safely convert NormalizedMaskConfig to legacy MaskShapeConfig
 * For RangeExpr params, uses the `min` value (base value when intensity=0)
 *
 * Use this for preset matching where approximate values are acceptable.
 * For accurate rendering, use resolveParams() with an IntensityProvider instead.
 */
export function safeDenormalizeMaskConfig(config: NormalizedMaskConfig): MaskShapeConfig {
  const rawParams: Record<string, unknown> = {}
  for (const [key, prop] of Object.entries(config.params)) {
    if ($PropertyValue.isStatic(prop)) {
      rawParams[key] = prop.value
    } else if ($PropertyValue.isRange(prop)) {
      // Use min value as the base/default value for preset matching
      rawParams[key] = prop.min
    }
  }
  return { type: config.id, ...rawParams } as MaskShapeConfig
}

/**
 * Union type for both mask config formats
 */
export type AnyMaskConfig = MaskShapeConfig | NormalizedMaskConfig

/**
 * Get mask config in normalized format (accepts both formats)
 */
export function getMaskAsNormalized(config: AnyMaskConfig): NormalizedMaskConfig {
  if (isNormalizedMaskConfig(config)) return config
  return normalizeMaskConfig(config)
}

/**
 * Get mask config in legacy format (accepts both formats)
 */
export function getMaskAsLegacy(config: AnyMaskConfig): MaskShapeConfig {
  if (isLegacyTypeMaskConfig(config)) return config
  return denormalizeMaskConfig(config)
}

// ============================================================
// Filter Config (JSON シリアライズ用) - Effects only
// ============================================================

/**
 * Single effect configuration (new normalized structure)
 *
 * Each effect is stored as a separate entry in the modifiers array.
 * Multiple effects can be applied by having multiple SingleEffectConfig entries.
 *
 * @example
 * ```typescript
 * const effect: SingleEffectConfig = {
 *   type: 'effect',
 *   id: 'blur',
 *   params: { radius: 8 }
 * }
 * ```
 */
export interface SingleEffectConfig {
  type: 'effect'
  /** Effect type identifier */
  id: EffectType
  /** Effect-specific parameters (static or bound to timeline) */
  params: Record<string, PropertyValue>
}

/**
 * Type guard for SingleEffectConfig
 */
export function isSingleEffectConfig(config: ProcessorConfig): config is SingleEffectConfig {
  return config.type === 'effect' && 'id' in config && 'params' in config
}

// ============================================================
// Mask Processor Config
// ============================================================

/**
 * Mask processor configuration (used in ProcessorNodeConfig.modifiers)
 */
export interface MaskProcessorConfig {
  type: 'mask'
  enabled: boolean
  shape: NormalizedMaskConfig
  invert: boolean
  feather: number
}

/**
 * Processor config for ProcessorNodeConfig.modifiers
 * Includes both effect filters and mask processors
 */
export type ProcessorConfig = SingleEffectConfig | MaskProcessorConfig

/**
 * Type guard for MaskProcessorConfig
 */
export function isMaskProcessorConfig(config: ProcessorConfig): config is MaskProcessorConfig {
  return config.type === 'mask'
}

// ============================================================
// Processor Modifier Helpers
// ============================================================

/**
 * Find the index of the first mask modifier in a processor's modifiers array
 * @returns Index of first mask, or -1 if no mask exists
 */
export function findMaskModifierIndex(modifiers: ProcessorConfig[]): number {
  return modifiers.findIndex((m) => m.type === 'mask')
}

/**
 * Find the index of a specific modifier in a processor's modifiers array
 * @param modifiers - Array of processor modifiers
 * @param predicate - Predicate function to match the modifier
 * @returns Index of matching modifier, or -1 if not found
 */
export function findModifierIndex(
  modifiers: ProcessorConfig[],
  predicate: (m: ProcessorConfig, index: number) => boolean
): number {
  return modifiers.findIndex(predicate)
}

/**
 * Get all effect modifiers that come before a given index in the modifiers array.
 * Useful for generating preview with preceding effects applied.
 *
 * @param modifiers - Array of processor modifiers
 * @param beforeIndex - Index to get effects before (exclusive)
 * @returns Array of SingleEffectConfig that come before the given index
 *
 * @example
 * ```typescript
 * // Processor with [blur, vignette, mask]
 * const maskIndex = findMaskModifierIndex(processor.modifiers) // 2
 * const precedingEffects = getPrecedingEffects(processor.modifiers, maskIndex)
 * // Returns [blur, vignette]
 * ```
 */
export function getPrecedingEffects(
  modifiers: ProcessorConfig[],
  beforeIndex: number
): SingleEffectConfig[] {
  if (beforeIndex <= 0) return []

  return modifiers
    .slice(0, beforeIndex)
    .filter((m): m is SingleEffectConfig => m.type === 'effect')
}

/**
 * Get all effect modifiers that come before the first mask in the modifiers array.
 * Convenience function combining findMaskModifierIndex and getPrecedingEffects.
 *
 * @param modifiers - Array of processor modifiers
 * @returns Array of SingleEffectConfig that come before the first mask
 */
export function getEffectsBeforeMask(modifiers: ProcessorConfig[]): SingleEffectConfig[] {
  const maskIndex = findMaskModifierIndex(modifiers)
  if (maskIndex === -1) {
    // No mask found, return all effects
    return modifiers.filter((m): m is SingleEffectConfig => m.type === 'effect')
  }
  return getPrecedingEffects(modifiers, maskIndex)
}

// ============================================================
// Effect Normalization Utilities
// ============================================================

/**
 * Type guard for checking if a SingleEffectConfig is a specific effect type
 */
export function isEffectOfType<T extends EffectType>(
  config: SingleEffectConfig,
  effectType: T
): config is SingleEffectConfig & { id: T } {
  return config.id === effectType
}

/**
 * Type guard for vignette effect
 */
export function isVignetteEffect(config: SingleEffectConfig): config is SingleEffectConfig & { id: 'vignette' } {
  return config.id === 'vignette'
}

/**
 * Type guard for chromatic aberration effect
 */
export function isChromaticAberrationEffect(config: SingleEffectConfig): config is SingleEffectConfig & { id: 'chromaticAberration' } {
  return config.id === 'chromaticAberration'
}

/**
 * Type guard for dot halftone effect
 */
export function isDotHalftoneEffect(config: SingleEffectConfig): config is SingleEffectConfig & { id: 'dotHalftone' } {
  return config.id === 'dotHalftone'
}

/**
 * Type guard for line halftone effect
 */
export function isLineHalftoneEffect(config: SingleEffectConfig): config is SingleEffectConfig & { id: 'lineHalftone' } {
  return config.id === 'lineHalftone'
}

/**
 * Type guard for blur effect
 */
export function isBlurEffect(config: SingleEffectConfig): config is SingleEffectConfig & { id: 'blur' } {
  return config.id === 'blur'
}

/**
 * Create a SingleEffectConfig with default parameters for a given effect type
 *
 * @example
 * ```typescript
 * const blurEffect = createSingleEffectConfig('blur')
 * // { type: 'effect', id: 'blur', params: { radius: 8 } }
 *
 * const customBlur = createSingleEffectConfig('blur', { radius: 16 })
 * // { type: 'effect', id: 'blur', params: { radius: 16 } }
 * ```
 */
export function createSingleEffectConfig(
  effectType: EffectType,
  params?: Record<string, unknown>
): SingleEffectConfig {
  const definition = EFFECT_REGISTRY[effectType]
  const defaultConfig = definition.createDefaultConfig()

  // Remove 'enabled' from params as SingleEffectConfig doesn't use it
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { enabled: _enabled, ...defaultParams } = defaultConfig as Record<string, unknown>

  // Merge with overrides
  const mergedParams = params ? { ...defaultParams, ...params } : defaultParams

  // Convert raw values to PropertyValue
  const propertyParams: Record<string, PropertyValue> = {}
  for (const [key, value] of Object.entries(mergedParams)) {
    if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
      propertyParams[key] = $PropertyValue.static(value)
    }
  }

  return {
    type: 'effect',
    id: effectType,
    params: propertyParams,
  }
}

/**
 * Extract enabled effects from legacy LayerEffectConfig and convert to SingleEffectConfig[]
 *
 * @example
 * ```typescript
 * const legacyConfig: LayerEffectConfig = {
 *   vignette: { enabled: true, intensity: 0.5, ... },
 *   blur: { enabled: true, radius: 8 },
 *   chromaticAberration: { enabled: false, ... },
 *   ...
 * }
 * const effects = extractEnabledEffects(legacyConfig)
 * // [
 * //   { type: 'effect', id: 'vignette', params: { intensity: 0.5, ... } },
 * //   { type: 'effect', id: 'blur', params: { radius: 8 } }
 * // ]
 * ```
 */
export function extractEnabledEffects(config: LayerEffectConfig): SingleEffectConfig[] {
  const effects: SingleEffectConfig[] = []

  for (const effectType of EFFECT_TYPES) {
    const effectConfig = config[effectType]
    if (effectConfig && 'enabled' in effectConfig && effectConfig.enabled) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { enabled: _enabled, ...rawParams } = effectConfig as Record<string, unknown>

      // Convert raw values to PropertyValue
      const propertyParams: Record<string, PropertyValue> = {}
      for (const [key, value] of Object.entries(rawParams)) {
        if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
          propertyParams[key] = $PropertyValue.static(value)
        }
      }

      effects.push({
        type: 'effect',
        id: effectType,
        params: propertyParams,
      })
    }
  }

  return effects
}

/**
 * Convert SingleEffectConfig[] to LayerEffectConfig for UI display
 * Only StaticValue params are extracted; RangeExpr throws error
 */
export function denormalizeToLayerEffectConfig(effects: SingleEffectConfig[]): LayerEffectConfig {
  const config = createDefaultEffectConfig()

  for (const effect of effects) {
    if (isValidEffectType(effect.id)) {
      const effectKey = effect.id as keyof LayerEffectConfig

      // Extract raw values from PropertyValue
      const rawParams: Record<string, unknown> = {}
      for (const [key, prop] of Object.entries(effect.params)) {
        if ($PropertyValue.isStatic(prop)) {
          rawParams[key] = prop.value
        } else {
          throw new Error(`Cannot denormalize RangeExpr for effect "${effect.id}" key "${key}". Use resolveParams() instead.`)
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(config[effectKey] as any) = {
        ...config[effectKey],
        ...rawParams,
        enabled: true,
      }
    }
  }

  return config
}

// ============================================================
// Layer Node Config (JSON シリアライズ用)
// ============================================================

interface LayerNodeConfigBase {
  id: string
  name: string
  visible: boolean
}

/**
 * @deprecated Use SurfaceLayerNodeConfig instead. Base layer type will be removed.
 * Migrate by changing type: 'base' to type: 'surface' and wrapping in a group.
 */
export interface BaseLayerNodeConfig extends LayerNodeConfigBase {
  type: 'base'
  surface: NormalizedSurfaceConfig
  /** Per-surface color configuration */
  colors?: SurfaceColorsConfig
}

export interface SurfaceLayerNodeConfig extends LayerNodeConfigBase {
  type: 'surface'
  surface: NormalizedSurfaceConfig
  /** Per-surface color configuration */
  colors?: SurfaceColorsConfig
}

export interface TextLayerNodeConfig extends LayerNodeConfigBase {
  type: 'text'
  text: string
  fontFamily: string
  fontSize: number
  fontWeight: number
  letterSpacing: number
  lineHeight: number
  color: string
  position: { x: number; y: number; anchor: string }
  rotation: number
}

export interface Model3DLayerNodeConfig extends LayerNodeConfigBase {
  type: 'model3d'
  modelUrl: string
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }
  scale: number
}

/**
 * Position configuration for positioned image rendering.
 * All values are normalized (0-1) relative to the viewport.
 */
export interface ImagePositionConfig {
  /** X coordinate (normalized 0-1) */
  x: number
  /** Y coordinate (normalized 0-1) */
  y: number
  /** Width (normalized 0-1) */
  width: number
  /** Height (normalized 0-1) */
  height: number
  /** Rotation angle in radians */
  rotation?: number
  /** Opacity (0-1) */
  opacity?: number
}

/**
 * Position configuration for positioned image rendering.
 * All values are normalized (0-1) relative to the viewport.
 */
export interface ImagePositionConfig {
  /** X coordinate (normalized 0-1) */
  x: number
  /** Y coordinate (normalized 0-1) */
  y: number
  /** Width (normalized 0-1) */
  width: number
  /** Height (normalized 0-1) */
  height: number
  /** Rotation angle in radians */
  rotation?: number
  /** Opacity (0-1) */
  opacity?: number
}

export interface ImageLayerNodeConfig extends LayerNodeConfigBase {
  type: 'image'
  /** Image identifier (Object URL or asset ID) */
  imageId: string
  /** Fit mode: 'cover' fills viewport, 'positioned' uses explicit coordinates */
  mode: 'cover' | 'positioned'
  /** Position configuration (only used when mode is 'positioned') */
  position?: ImagePositionConfig
}

/**
 * Blend modes for group composition.
 * Standard Porter-Duff and blend modes.
 */
export type GroupBlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion'

export interface GroupLayerNodeConfig extends LayerNodeConfigBase {
  type: 'group'
  children: LayerNodeConfig[]
  /** Blend mode for compositing this group onto layers below */
  blendMode?: GroupBlendMode
}

/**
 * Processor node configuration
 *
 * A Processor node applies its modifiers (effects, masks) to sibling nodes
 * that appear BEFORE it in the layer tree (Figma-style mask application).
 *
 * @see docs/design/processor-target-specification.md for detailed rules
 */
export interface ProcessorNodeConfig extends LayerNodeConfigBase {
  type: 'processor'
  /** Modifiers to apply (effects, masks) */
  modifiers: ProcessorConfig[]
}

export type LayerNodeConfig =
  | BaseLayerNodeConfig
  | SurfaceLayerNodeConfig
  | TextLayerNodeConfig
  | Model3DLayerNodeConfig
  | ImageLayerNodeConfig
  | GroupLayerNodeConfig
  | ProcessorNodeConfig

// ============================================================
// Legacy Layer Configs (deprecated, for backward compatibility)
// ============================================================

/** @deprecated Use LayerNodeConfig instead */
export interface BackgroundLayerConfig {
  surface: SurfaceConfig
}

/** @deprecated Use LayerNodeConfig instead */
export interface MaskLayerConfig {
  shape: MaskShapeConfig
  surface: SurfaceConfig
}

// ============================================================
// Foreground Config (HTML Layer)
// ============================================================

export type GridPosition =
  | 'top-left' | 'top-center' | 'top-right'
  | 'middle-left' | 'middle-center' | 'middle-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right'

export type ForegroundElementType = 'title' | 'description'

export interface ForegroundElementConfig {
  id: string
  type: ForegroundElementType
  visible: boolean
  position: GridPosition
  content: string
  fontId?: string
  fontSize?: number
  /** Font weight (100-900). Default: 400 */
  fontWeight?: number
  /** Letter spacing in em units. Default: 0 */
  letterSpacing?: number
  /** Line height (unitless multiplier). Default: 1.2 (title), 1.5 (description) */
  lineHeight?: number
  /** Color key from primitive palette, or 'auto' for automatic contrast-based color */
  colorKey?: HeroPrimitiveKey | 'auto'
}

export interface ForegroundLayerConfig {
  elements: ForegroundElementConfig[]
}

// ============================================================
// HeroViewConfig (統合インターフェース)
// ============================================================

/**
 * HeroView の完全な状態
 *
 * @example
 * ```typescript
 * const config: HeroViewConfig = {
 *   viewport: { width: 1280, height: 720 },
 *   colors: { ... },
 *   layers: [
 *     {
 *       type: 'surface',
 *       id: 'background',
 *       name: 'Background',
 *       visible: true,
 *       surface: { type: 'stripe', width1: 20, width2: 20, angle: 45 },
 *     },
 *     {
 *       type: 'processor',
 *       id: 'bg-processor',
 *       name: 'Background Effects',
 *       visible: true,
 *       modifiers: [
 *         { type: 'effect', id: 'vignette', params: { intensity: 0.5 } },
 *       ]
 *     },
 *     {
 *       type: 'processor',
 *       id: 'processor-mask',
 *       name: 'Mask Processor',
 *       visible: true,
 *       modifiers: [
 *         { type: 'effect', id: 'blur', params: { radius: 8 } },
 *         { type: 'mask', enabled: true, shape: { ... }, invert: false, feather: 0 }
 *       ]
 *     }
 *   ],
 *   foreground: {
 *     elements: [
 *       { id: 'title-1', type: 'title', position: 'middle-center', content: 'Hello World', visible: true },
 *     ],
 *   },
 * }
 * ```
 */
export interface HeroViewConfig {
  /** キャンバスサイズ */
  viewport: ViewportConfig

  /** 色設定（パレットキーベース） */
  colors: HeroColorsConfig

  /** レイヤー構成 */
  layers: LayerNodeConfig[]

  /** 前景レイヤー（HTML） */
  foreground: ForegroundLayerConfig
}

// ============================================================
// Factory Functions
// ============================================================

export const createDefaultForegroundConfig = (): ForegroundLayerConfig => ({
  elements: [
    { id: 'title-1', type: 'title', visible: true, position: 'middle-center', content: 'Build Amazing' },
    { id: 'description-1', type: 'description', visible: true, position: 'middle-center', content: 'Create beautiful, responsive websites.\nDesign with confidence.' },
  ],
})

export const createDefaultColorsConfig = (): HeroColorsConfig => ({
  semanticContext: 'canvas',
})

/** Default colors for background surface layer (palette keys) */
export const DEFAULT_LAYER_BACKGROUND_COLORS: SurfaceColorsConfig = {
  primary: 'B',
  secondary: 'auto',
}

/** Default colors for mask surface layer (palette keys) */
export const DEFAULT_LAYER_MASK_COLORS: SurfaceColorsConfig = {
  primary: 'auto',
  secondary: 'auto',
}

export const createDefaultMaskProcessorConfig = (): MaskProcessorConfig => ({
  type: 'mask',
  enabled: true,
  shape: {
    id: 'circle',
    params: {
      centerX: $PropertyValue.static(0.5),
      centerY: $PropertyValue.static(0.5),
      radius: $PropertyValue.static(0.3),
      cutout: $PropertyValue.static(false),
    },
  },
  invert: false,
  feather: 0,
})

export const createDefaultHeroViewConfig = (): HeroViewConfig => ({
  viewport: { width: 1280, height: 720 },
  colors: createDefaultColorsConfig(),
  layers: [
    {
      type: 'group',
      id: 'background-group',
      name: 'Background',
      visible: true,
      children: [
        {
          type: 'surface',
          id: 'background',
          name: 'Surface',
          visible: true,
          surface: { id: 'solid', params: {} },
          colors: { primary: 'B', secondary: 'auto' },
        },
      ],
    },
    {
      type: 'group',
      id: 'clip-group',
      name: 'Clip Group',
      visible: true,
      children: [
        {
          type: 'surface',
          id: 'surface-mask',
          name: 'Surface',
          visible: true,
          surface: { id: 'solid', params: {} },
          colors: { primary: 'auto', secondary: 'auto' },
        },
        {
          type: 'processor',
          id: 'processor-mask',
          name: 'Mask',
          visible: true,
          modifiers: [createDefaultMaskProcessorConfig()],
        },
      ],
    },
  ],
  foreground: createDefaultForegroundConfig(),
})

// ============================================================
// Layer Filter Helpers
// ============================================================

/**
 * Get effect filters from a layer config
 * Only processor nodes have effects (via modifiers)
 */
export const getLayerFilters = (layer: LayerNodeConfig): SingleEffectConfig[] => {
  if (layer.type === 'processor') {
    return layer.modifiers.filter((m): m is SingleEffectConfig => m.type === 'effect')
  }
  return []
}

/**
 * Get mask processor from a layer config (only applicable to ProcessorNodeConfig)
 */
export const getLayerMaskProcessor = (layer: LayerNodeConfig): MaskProcessorConfig | undefined => {
  if (layer.type === 'processor') {
    return layer.modifiers.find((m): m is MaskProcessorConfig => m.type === 'mask')
  }
  return undefined
}

/**
 * Check if layer config has mask processor
 */
export const hasLayerMaskProcessor = (layer: LayerNodeConfig): boolean => {
  return getLayerMaskProcessor(layer) !== undefined
}

// ============================================================
// Processor Node Type Guards & Helpers
// ============================================================

/**
 * Check if layer config is a Processor node
 */
export const isProcessorNodeConfig = (layer: LayerNodeConfig): layer is ProcessorNodeConfig => {
  return layer.type === 'processor'
}

/**
 * Get the target layer configs that a Processor applies to
 *
 * Rules:
 * - Processor applies to sibling nodes that appear BEFORE it (lower index)
 * - In a Group: all preceding non-Processor siblings until another Processor
 * - At Root level: only the immediately preceding node (1 element only)
 * - If no valid target exists (processor first, or preceded by another processor), returns empty
 *
 * @param siblings - Array of sibling layer configs (children of same parent)
 * @param processorIndex - Index of the Processor in the siblings array
 * @param isRoot - Whether this is at root level (true) or inside a Group (false)
 * @returns Array of LayerNodeConfigs that the Processor applies to
 *
 * @see docs/design/processor-target-specification.md for detailed rules
 */
export const getProcessorTargetsFromConfig = (
  siblings: LayerNodeConfig[],
  processorIndex: number,
  isRoot: boolean
): LayerNodeConfig[] => {
  // No targets if processor is first or index is invalid
  if (processorIndex <= 0 || processorIndex >= siblings.length) return []

  if (isRoot) {
    // Root level: only the immediately preceding node
    const prevNode = siblings[processorIndex - 1]
    if (!prevNode) return []
    // If preceded by another processor, no targets
    return isProcessorNodeConfig(prevNode) ? [] : [prevNode]
  }

  // Group context: all preceding non-Processor siblings until another Processor
  const targets: LayerNodeConfig[] = []
  for (let i = processorIndex - 1; i >= 0; i--) {
    const node = siblings[i]
    if (!node) continue
    if (isProcessorNodeConfig(node)) break // Stop at previous Processor
    targets.unshift(node)
  }
  return targets
}

/**
 * Get all Processor-target pairs in a layer config array
 *
 * Useful for rendering: returns each Processor with its target layer configs.
 *
 * @param siblings - Array of sibling layer configs
 * @param isRoot - Whether this is at root level
 * @returns Array of { processor, targets } pairs
 */
export const getProcessorTargetPairsFromConfig = (
  siblings: LayerNodeConfig[],
  isRoot: boolean
): Array<{ processor: ProcessorNodeConfig; targets: LayerNodeConfig[] }> => {
  const pairs: Array<{ processor: ProcessorNodeConfig; targets: LayerNodeConfig[] }> = []

  for (let i = 0; i < siblings.length; i++) {
    const node = siblings[i]
    if (node && isProcessorNodeConfig(node)) {
      const targets = getProcessorTargetsFromConfig(siblings, i, isRoot)
      pairs.push({ processor: node, targets })
    }
  }

  return pairs
}

/**
 * Get mask processor config from a ProcessorNodeConfig
 */
export const getProcessorMask = (processor: ProcessorNodeConfig): MaskProcessorConfig | undefined => {
  return processor.modifiers.find((m): m is MaskProcessorConfig => m.type === 'mask')
}

/**
 * Get effect processor configs from a ProcessorNodeConfig
 * Returns SingleEffectConfig[] (supports both legacy and new formats)
 */
export const getProcessorEffects = (processor: ProcessorNodeConfig): SingleEffectConfig[] => {
  return processor.modifiers.filter((m): m is SingleEffectConfig => m.type === 'effect')
}

// ============================================================
// Migration: Extract expanded state from legacy configs
// ============================================================

/**
 * Legacy GroupLayerNodeConfig with expanded property
 * Used for migration from old configs that stored expanded state in the config
 */
interface LegacyGroupLayerNodeConfig extends LayerNodeConfigBase {
  type: 'group'
  children: LayerNodeConfig[]
  expanded?: boolean
}

/**
 * Extract expanded layer IDs from a legacy config
 *
 * This is used when loading old configs that stored `expanded` in GroupLayerNodeConfig.
 * The extracted IDs should be stored in HeroEditorUIState.layerTree.expandedLayerIds
 *
 * @param layers - Layer tree (may contain legacy groups with expanded property)
 * @returns Set of layer IDs that were expanded
 */
export const extractExpandedLayerIds = (layers: LayerNodeConfig[]): Set<string> => {
  const expandedIds = new Set<string>()

  const traverse = (nodes: LayerNodeConfig[]) => {
    for (const node of nodes) {
      if (node.type === 'group') {
        const legacyNode = node as unknown as LegacyGroupLayerNodeConfig
        if (legacyNode.expanded) {
          expandedIds.add(node.id)
        }
        traverse(node.children)
      }
    }
  }

  traverse(layers)
  return expandedIds
}

/**
 * Remove expanded property from all group layers
 *
 * This migrates a legacy config to the new format by stripping the expanded property
 *
 * @param layers - Layer tree (may contain legacy groups with expanded property)
 * @returns New layer tree without expanded properties
 */
export const migrateExpandedFromConfig = (layers: LayerNodeConfig[]): LayerNodeConfig[] => {
  const migrate = (nodes: LayerNodeConfig[]): LayerNodeConfig[] => {
    return nodes.map((node) => {
      if (node.type === 'group') {
        const { ...rest } = node as unknown as LegacyGroupLayerNodeConfig
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { expanded: _expanded, ...cleanNode } = rest as LegacyGroupLayerNodeConfig
        return {
          ...cleanNode,
          children: migrate(node.children),
        } as GroupLayerNodeConfig
      }
      return node
    })
  }

  return migrate(layers)
}

// ============================================================
// Config Migration: Legacy to Normalized Format
// ============================================================

/**
 * Type guard to check if a surface config is in legacy flat format
 */
export function isLegacyFlatSurfaceConfig(
  config: unknown
): config is SurfaceConfig {
  return (
    typeof config === 'object' &&
    config !== null &&
    'type' in config &&
    !('id' in config) &&
    !('params' in config)
  )
}

/**
 * Type guard to check if a mask config is in legacy flat format
 */
export function isLegacyFlatMaskConfig(
  config: unknown
): config is MaskShapeConfig {
  return (
    typeof config === 'object' &&
    config !== null &&
    'type' in config &&
    !('id' in config) &&
    !('params' in config)
  )
}

/**
 * Migrate a single layer config from legacy to normalized format
 */
function migrateLayerConfig(layer: LayerNodeConfig): LayerNodeConfig {
  switch (layer.type) {
    case 'base':
    case 'surface': {
      const surfaceLayer = layer as BaseLayerNodeConfig | SurfaceLayerNodeConfig
      // Check if surface is in legacy format
      if (isLegacyFlatSurfaceConfig(surfaceLayer.surface)) {
        return {
          ...surfaceLayer,
          surface: normalizeSurfaceConfig(surfaceLayer.surface),
        }
      }
      return layer
    }
    case 'processor': {
      const processorLayer = layer as ProcessorNodeConfig
      const migratedModifiers = processorLayer.modifiers.map((modifier) => {
        if (modifier.type === 'mask') {
          const maskModifier = modifier as MaskProcessorConfig
          // Check if shape is in legacy format (cast to unknown first for type safety)
          const shape = maskModifier.shape as unknown
          if (isLegacyFlatMaskConfig(shape)) {
            return {
              ...maskModifier,
              shape: normalizeMaskConfig(shape),
            }
          }
        }
        if (modifier.type === 'effect') {
          const effectModifier = modifier as SingleEffectConfig
          // Convert raw values to PropertyValue format if needed
          const params = effectModifier.params as Record<string, unknown>
          const needsMigration = Object.values(params).some(
            (value) => typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean'
          )
          if (needsMigration) {
            const migratedParams: Record<string, PropertyValue> = {}
            for (const [key, value] of Object.entries(params)) {
              if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
                migratedParams[key] = $PropertyValue.static(value)
              } else {
                // Already PropertyValue format
                migratedParams[key] = value as PropertyValue
              }
            }
            return {
              ...effectModifier,
              params: migratedParams,
            }
          }
        }
        return modifier
      })
      return {
        ...processorLayer,
        modifiers: migratedModifiers,
      }
    }
    case 'group': {
      const groupLayer = layer as GroupLayerNodeConfig
      return {
        ...groupLayer,
        children: groupLayer.children.map(migrateLayerConfig),
      }
    }
    default:
      return layer
  }
}

/**
 * Migrate HeroViewConfig from legacy flat format to normalized format
 *
 * This function detects and converts:
 * - SurfaceLayerNodeConfig.surface: { type: 'stripe', ... } → { id: 'stripe', params: { ... } }
 * - MaskProcessorConfig.shape: { type: 'circle', ... } → { id: 'circle', params: { ... } }
 *
 * @param config - HeroViewConfig (may contain legacy flat formats)
 * @returns HeroViewConfig with all configs in normalized format
 */
export function migrateToNormalizedFormat(config: HeroViewConfig): HeroViewConfig {
  return {
    ...config,
    layers: config.layers.map(migrateLayerConfig),
  }
}

// ============================================================
// Config Validation (I/O Boundary)
// ============================================================

/**
 * Validation error for HeroViewConfig
 */
export interface ConfigValidationError {
  path: string
  message: string
}

/**
 * Validation result for HeroViewConfig
 */
export interface ConfigValidationResult {
  valid: boolean
  errors: ConfigValidationError[]
}

/**
 * Validate a NormalizedSurfaceConfig
 */
function validateNormalizedSurfaceConfig(
  config: unknown,
  path: string
): ConfigValidationError[] {
  const errors: ConfigValidationError[] = []

  if (typeof config !== 'object' || config === null) {
    errors.push({ path, message: 'Surface config must be an object' })
    return errors
  }

  const surfaceConfig = config as Record<string, unknown>

  if (!('id' in surfaceConfig) || typeof surfaceConfig.id !== 'string') {
    errors.push({ path: `${path}.id`, message: 'Surface config must have a string id' })
  } else if (!SURFACE_TYPES.includes(surfaceConfig.id as SurfaceType)) {
    errors.push({ path: `${path}.id`, message: `Invalid surface type: ${surfaceConfig.id}` })
  }

  if (!('params' in surfaceConfig) || typeof surfaceConfig.params !== 'object') {
    errors.push({ path: `${path}.params`, message: 'Surface config must have params object' })
  }

  return errors
}

/**
 * Validate a NormalizedMaskConfig
 */
function validateNormalizedMaskConfig(
  config: unknown,
  path: string
): ConfigValidationError[] {
  const errors: ConfigValidationError[] = []

  if (typeof config !== 'object' || config === null) {
    errors.push({ path, message: 'Mask config must be an object' })
    return errors
  }

  const maskConfig = config as Record<string, unknown>

  if (!('id' in maskConfig) || typeof maskConfig.id !== 'string') {
    errors.push({ path: `${path}.id`, message: 'Mask config must have a string id' })
  } else if (!MASK_SHAPE_TYPE_IDS.includes(maskConfig.id as MaskShapeTypeId)) {
    errors.push({ path: `${path}.id`, message: `Invalid mask shape type: ${maskConfig.id}` })
  }

  if (!('params' in maskConfig) || typeof maskConfig.params !== 'object') {
    errors.push({ path: `${path}.params`, message: 'Mask config must have params object' })
  }

  return errors
}

/**
 * Validate layer configs recursively
 */
function validateLayerConfigs(
  layers: LayerNodeConfig[],
  basePath: string
): ConfigValidationError[] {
  const errors: ConfigValidationError[] = []

  layers.forEach((layer, index) => {
    const layerPath = `${basePath}[${index}]`

    switch (layer.type) {
      case 'base':
      case 'surface': {
        const surfaceLayer = layer as BaseLayerNodeConfig | SurfaceLayerNodeConfig
        errors.push(...validateNormalizedSurfaceConfig(surfaceLayer.surface, `${layerPath}.surface`))
        break
      }
      case 'processor': {
        const processorLayer = layer as ProcessorNodeConfig
        processorLayer.modifiers.forEach((modifier, modIndex) => {
          if (modifier.type === 'mask') {
            const maskModifier = modifier as MaskProcessorConfig
            errors.push(
              ...validateNormalizedMaskConfig(
                maskModifier.shape,
                `${layerPath}.modifiers[${modIndex}].shape`
              )
            )
          }
        })
        break
      }
      case 'group': {
        const groupLayer = layer as GroupLayerNodeConfig
        errors.push(...validateLayerConfigs(groupLayer.children, `${layerPath}.children`))
        break
      }
    }
  })

  return errors
}

/**
 * Validate HeroViewConfig at I/O boundary
 *
 * This function validates that:
 * - All surface configs are in normalized format with valid types
 * - All mask configs are in normalized format with valid types
 *
 * Use this at I/O boundaries (preset loading, snapshot restore) to ensure
 * data integrity before processing.
 *
 * @param config - HeroViewConfig to validate
 * @returns Validation result with any errors found
 */
export function validateHeroViewConfig(config: HeroViewConfig): ConfigValidationResult {
  const errors: ConfigValidationError[] = []

  // Validate layers
  errors.push(...validateLayerConfigs(config.layers, 'layers'))

  return {
    valid: errors.length === 0,
    errors,
  }
}
