/**
 * HeroViewConfig
 *
 * HeroView の完全な状態を表す統合インターフェース
 * - 外部参照なし（fontId, imageId は文字列識別子）
 * - JSON.stringify 可能（保存・復元可能）
 * - LayerNode[] ベースの構造
 */

import type { LayerEffectConfig } from './EffectSchema'
import type { EffectType } from './EffectRegistry'

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
 * Color configuration for HeroView
 * Contains all color-related state needed for rendering
 */
export interface HeroColorsConfig {
  /** Background layer colors */
  background: {
    /** Primary color (e.g., brand color for patterns) */
    primary: HeroPrimitiveKey
    /** Secondary color ('auto' = derived from canvas surface) */
    secondary: HeroPrimitiveKey | 'auto'
  }
  /** Mask layer colors */
  mask: {
    /** Primary color ('auto' = surface with shifted lightness) */
    primary: HeroPrimitiveKey | 'auto'
    /** Secondary color ('auto' = derived from semantic context surface) */
    secondary: HeroPrimitiveKey | 'auto'
  }
  /** Semantic context for mask layer color resolution */
  semanticContext: HeroContextName
  /** Brand color (HSV) */
  brand: HsvColor
  /** Accent color (HSV) */
  accent: HsvColor
  /** Foundation color (HSV) */
  foundation: HsvColor
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

export interface ImageSurfaceConfig {
  type: 'image'
  /** 画像の識別子（URL or asset ID） */
  imageId: string
}

export type DepthMapType = 'linear' | 'circular' | 'radial' | 'perlin'

export interface GradientGrainSurfaceConfig {
  type: 'gradientGrain'
  depthMapType: DepthMapType
  angle: number
  centerX: number
  centerY: number
  radialStartAngle: number
  radialSweepAngle: number
  perlinScale: number
  perlinOctaves: number
  perlinContrast: number
  perlinOffset: number
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
  | ImageSurfaceConfig
  | GradientGrainSurfaceConfig
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
  'image',
  'gradientGrain',
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
  /** Surface-specific parameters (validated against schema at runtime) */
  params: Record<string, unknown>
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
 */
export function normalizeSurfaceConfig(config: SurfaceConfig): NormalizedSurfaceConfig {
  const { type, ...params } = config
  return { id: type, params }
}

/**
 * Convert NormalizedSurfaceConfig to legacy SurfaceConfig
 */
export function denormalizeSurfaceConfig(config: NormalizedSurfaceConfig): SurfaceConfig {
  return { type: config.id, ...config.params } as SurfaceConfig
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
 */
export function getSurfaceAsLegacy(config: AnySurfaceConfig): SurfaceConfig {
  if (isLegacyTypeSurfaceConfig(config)) return config
  return denormalizeSurfaceConfig(config)
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

export type MaskShapeConfig =
  | CircleMaskShapeConfig
  | RectMaskShapeConfig
  | BlobMaskShapeConfig
  | PerlinMaskShapeConfig
  | LinearGradientMaskShapeConfig
  | RadialGradientMaskShapeConfig
  | BoxGradientMaskShapeConfig

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
  'linearGradient',
  'radialGradient',
  'boxGradient',
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
  /** Mask-specific parameters (validated against schema at runtime) */
  params: Record<string, unknown>
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
 */
export function normalizeMaskConfig(config: MaskShapeConfig): NormalizedMaskConfig {
  const { type, ...params } = config
  return { id: type, params }
}

/**
 * Convert NormalizedMaskConfig to legacy MaskShapeConfig
 */
export function denormalizeMaskConfig(config: NormalizedMaskConfig): MaskShapeConfig {
  return { type: config.id, ...config.params } as MaskShapeConfig
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
  /** Effect-specific parameters (validated against schema at runtime) */
  params: Record<string, unknown>
}

/**
 * Effect filter configuration for JSON serialization
 * @deprecated Use SingleEffectConfig instead - this legacy format will be removed
 */
export interface EffectFilterConfig {
  type: 'effect'
  enabled: boolean
  config: LayerEffectConfig
}

/**
 * Type guard for SingleEffectConfig (new format)
 */
export function isSingleEffectConfig(config: ProcessorConfig): config is SingleEffectConfig {
  return config.type === 'effect' && 'id' in config && 'params' in config
}

/**
 * Type guard for EffectFilterConfig (legacy format)
 * @deprecated Will be removed when legacy format is phased out
 */
export function isLegacyEffectFilterConfig(config: ProcessorConfig): config is EffectFilterConfig {
  return config.type === 'effect' && 'config' in config && !('id' in config)
}

/**
 * Filter config type (effects only)
 * Masks are handled as MaskProcessorConfig in ProcessorNodeConfig.modifiers
 */
export type FilterConfig = EffectFilterConfig

// ============================================================
// Mask Processor Config
// ============================================================

/**
 * Mask processor configuration (used in ProcessorNodeConfig.modifiers)
 */
export interface MaskProcessorConfig {
  type: 'mask'
  enabled: boolean
  shape: MaskShapeConfig
  invert: boolean
  feather: number
}

/**
 * Processor config for ProcessorNodeConfig.modifiers
 * Includes both effect filters and mask processors
 *
 * Effect configs can be in two formats:
 * - SingleEffectConfig (new): { type: 'effect', id: 'blur', params: {...} }
 * - EffectFilterConfig (legacy): { type: 'effect', enabled: true, config: {...} }
 */
export type ProcessorConfig = SingleEffectConfig | EffectFilterConfig | MaskProcessorConfig

/**
 * Effect config type (union of new and legacy formats)
 */
export type AnyEffectConfig = SingleEffectConfig | EffectFilterConfig

/** @deprecated Use SingleEffectConfig instead */
export type EffectProcessorConfig = EffectFilterConfig

// ============================================================
// Layer Node Config (JSON シリアライズ用)
// ============================================================

interface LayerNodeConfigBase {
  id: string
  name: string
  visible: boolean
}

export interface BaseLayerNodeConfig extends LayerNodeConfigBase {
  type: 'base'
  surface: SurfaceConfig
  /** Effect filters */
  filters?: EffectFilterConfig[]
}

export interface SurfaceLayerNodeConfig extends LayerNodeConfigBase {
  type: 'surface'
  surface: SurfaceConfig
  /** Effect filters */
  filters?: EffectFilterConfig[]
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
  /** Effect filters */
  filters?: EffectFilterConfig[]
}

export interface Model3DLayerNodeConfig extends LayerNodeConfigBase {
  type: 'model3d'
  modelUrl: string
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }
  scale: number
  /** Effect filters */
  filters?: EffectFilterConfig[]
}

export interface ImageLayerNodeConfig extends LayerNodeConfigBase {
  type: 'image'
  imageId: string
  /** Effect filters */
  filters?: EffectFilterConfig[]
}

export interface GroupLayerNodeConfig extends LayerNodeConfigBase {
  type: 'group'
  children: LayerNodeConfig[]
  /** Effect filters applied to the group */
  filters?: EffectFilterConfig[]
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
  filters: LayerEffectConfig
}

/** @deprecated Use LayerNodeConfig instead */
export interface MaskLayerConfig {
  shape: MaskShapeConfig
  surface: SurfaceConfig
  filters: LayerEffectConfig
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
 *       type: 'base',
 *       id: 'base',
 *       name: 'Background',
 *       visible: true,
 *       surface: { type: 'stripe', width1: 20, width2: 20, angle: 45 },
 *       filters: [{ type: 'effect', enabled: true, config: { ... } }]
 *     },
 *     {
 *       type: 'processor',
 *       id: 'processor-1',
 *       name: 'Mask Processor',
 *       visible: true,
 *       modifiers: [
 *         { type: 'effect', enabled: true, config: { ... } },
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
  background: {
    primary: 'B',
    secondary: 'auto',
  },
  mask: {
    primary: 'auto',
    secondary: 'auto',
  },
  semanticContext: 'canvas',
  brand: { hue: 198, saturation: 70, value: 65 },
  accent: { hue: 30, saturation: 80, value: 60 },
  foundation: { hue: 0, saturation: 0, value: 97 },
})

export const createDefaultEffectFilterConfig = (): EffectFilterConfig => ({
  type: 'effect',
  enabled: true,
  config: {
    vignette: {
      enabled: false,
      shape: 'ellipse',
      intensity: 0.5,
      softness: 0.4,
      color: [0, 0, 0, 1],
      radius: 0.8,
      centerX: 0.5,
      centerY: 0.5,
      aspectRatio: 1,
    },
    chromaticAberration: { enabled: false, intensity: 0.01 },
    dotHalftone: { enabled: false, dotSize: 8, spacing: 16, angle: 45 },
    lineHalftone: { enabled: false, lineWidth: 4, spacing: 12, angle: 45 },
    blur: { enabled: false, radius: 8 },
  },
})

/** @deprecated Use createDefaultEffectFilterConfig instead */
export const createDefaultEffectProcessorConfig = createDefaultEffectFilterConfig

export const createDefaultHeroViewConfig = (): HeroViewConfig => ({
  viewport: { width: 1280, height: 720 },
  colors: createDefaultColorsConfig(),
  layers: [
    {
      type: 'base',
      id: 'base',
      name: 'Background',
      visible: true,
      surface: { type: 'solid' },
      filters: [createDefaultEffectFilterConfig()],
    },
  ],
  foreground: createDefaultForegroundConfig(),
})

// ============================================================
// Layer Filter Helpers
// ============================================================

/**
 * Get effect filters from a layer config
 */
export const getLayerFilters = (layer: LayerNodeConfig): EffectFilterConfig[] => {
  // ProcessorNodeConfig uses modifiers
  if (layer.type === 'processor') {
    return layer.modifiers.filter((m): m is EffectFilterConfig => m.type === 'effect')
  }
  return layer.filters ?? []
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
 */
export const getProcessorEffects = (processor: ProcessorNodeConfig): EffectFilterConfig[] => {
  return processor.modifiers.filter((m): m is EffectFilterConfig => m.type === 'effect')
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
  filters?: EffectFilterConfig[]
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
// Migration: Effect Config (Legacy → SingleEffectConfig)
// ============================================================

// Import EFFECT_TYPES for migration - moved to avoid circular dependency
// Note: This import is safe because EffectRegistry only imports types from this file
import { EFFECT_TYPES } from './EffectRegistry'

/**
 * Convert legacy EffectFilterConfig to SingleEffectConfig array
 *
 * Extracts enabled effects from the legacy bundled config format.
 * Each enabled effect becomes a separate SingleEffectConfig entry.
 *
 * @param legacy - Legacy EffectFilterConfig with all effects bundled
 * @returns Array of SingleEffectConfig for enabled effects only
 */
export const migrateLegacyEffectConfig = (legacy: EffectFilterConfig): SingleEffectConfig[] => {
  if (!legacy.enabled) return []

  const effects: SingleEffectConfig[] = []

  for (const effectType of EFFECT_TYPES) {
    const effectConfig = legacy.config[effectType]
    if (!effectConfig || !effectConfig.enabled) continue

    // Extract params without the 'enabled' property
    const { enabled: _enabled, ...params } = effectConfig
    effects.push({
      type: 'effect',
      id: effectType,
      params,
    })
  }

  return effects
}

/**
 * Convert SingleEffectConfig array back to legacy EffectFilterConfig
 *
 * This is useful for backward compatibility when exporting to legacy systems.
 *
 * @param effects - Array of SingleEffectConfig
 * @param defaultConfig - Default LayerEffectConfig to use as base
 * @returns Legacy EffectFilterConfig format
 */
export const toLegacyEffectConfig = (
  effects: SingleEffectConfig[],
  defaultConfig: LayerEffectConfig
): EffectFilterConfig => {
  // Create a mutable copy with explicit typing to allow indexed assignment
  const config: Record<string, unknown> = {}

  // Copy default config and reset all effects to disabled
  for (const effectType of EFFECT_TYPES) {
    const defaultEffect = defaultConfig[effectType]
    config[effectType] = { ...defaultEffect, enabled: false }
  }

  // Enable and apply params for each effect in the array
  for (const effect of effects) {
    const effectType = effect.id
    if (effectType in config) {
      const existing = config[effectType] as Record<string, unknown>
      config[effectType] = {
        ...existing,
        ...effect.params,
        enabled: true,
      }
    }
  }

  return {
    type: 'effect',
    enabled: effects.length > 0,
    config: config as unknown as LayerEffectConfig,
  }
}

/**
 * Check if any effect config in the array is legacy format
 */
export const hasLegacyEffectConfigs = (configs: ProcessorConfig[]): boolean => {
  return configs.some((c) => c.type === 'effect' && 'config' in c && !('id' in c))
}

/**
 * Migrate all effect configs in a ProcessorConfig array from legacy to new format
 *
 * @param modifiers - Array of ProcessorConfig (may contain legacy EffectFilterConfig)
 * @returns Array with all effect configs migrated to SingleEffectConfig format
 */
export const migrateEffectConfigsInModifiers = (modifiers: ProcessorConfig[]): ProcessorConfig[] => {
  const result: ProcessorConfig[] = []

  for (const modifier of modifiers) {
    if (isLegacyEffectFilterConfig(modifier)) {
      // Migrate legacy format to new format
      const newEffects = migrateLegacyEffectConfig(modifier)
      result.push(...newEffects)
    } else {
      // Keep non-effect modifiers and already-migrated effects as-is
      result.push(modifier)
    }
  }

  return result
}

/**
 * Get all effect configs from modifiers (both new and legacy formats)
 * Returns normalized SingleEffectConfig array
 */
export const getEffectConfigsFromModifiers = (modifiers: ProcessorConfig[]): SingleEffectConfig[] => {
  const effects: SingleEffectConfig[] = []

  for (const modifier of modifiers) {
    if (isSingleEffectConfig(modifier)) {
      effects.push(modifier)
    } else if (isLegacyEffectFilterConfig(modifier)) {
      effects.push(...migrateLegacyEffectConfig(modifier))
    }
  }

  return effects
}
