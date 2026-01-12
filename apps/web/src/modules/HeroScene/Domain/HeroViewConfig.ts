/**
 * HeroViewConfig
 *
 * HeroView の完全な状態を表す統合インターフェース
 * - 外部参照なし（fontId, imageId は文字列識別子）
 * - JSON.stringify 可能（保存・復元可能）
 * - LayerNode[] ベースの構造
 */

import type { LayerEffectConfig } from './EffectSchema'

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
// Filter Config (JSON シリアライズ用) - Effects only
// ============================================================

/**
 * Effect filter configuration for JSON serialization
 */
export interface EffectFilterConfig {
  type: 'effect'
  enabled: boolean
  config: LayerEffectConfig
}

/**
 * Filter config type (effects only)
 * Masks are handled as MaskProcessorConfig in processors
 */
export type FilterConfig = EffectFilterConfig

// ============================================================
// Processor Config (deprecated - use FilterConfig)
// ============================================================

/** @deprecated Use EffectFilterConfig instead */
export type EffectProcessorConfig = EffectFilterConfig

/**
 * Mask processor configuration
 */
export interface MaskProcessorConfig {
  type: 'mask'
  enabled: boolean
  shape: MaskShapeConfig
  invert: boolean
  feather: number
}

/** @deprecated Use FilterConfig instead */
export type ProcessorConfig = EffectFilterConfig | MaskProcessorConfig

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
  /** @deprecated Use filters instead */
  processors?: ProcessorConfig[]
}

export interface SurfaceLayerNodeConfig extends LayerNodeConfigBase {
  type: 'surface'
  surface: SurfaceConfig
  /** Effect filters */
  filters?: EffectFilterConfig[]
  /** @deprecated Use filters instead */
  processors?: ProcessorConfig[]
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
  /** @deprecated Use filters instead */
  processors?: ProcessorConfig[]
}

export interface Model3DLayerNodeConfig extends LayerNodeConfigBase {
  type: 'model3d'
  modelUrl: string
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }
  scale: number
  /** Effect filters */
  filters?: EffectFilterConfig[]
  /** @deprecated Use filters instead */
  processors?: ProcessorConfig[]
}

export interface ImageLayerNodeConfig extends LayerNodeConfigBase {
  type: 'image'
  imageId: string
  /** Effect filters */
  filters?: EffectFilterConfig[]
  /** @deprecated Use filters instead */
  processors?: ProcessorConfig[]
}

export interface GroupLayerNodeConfig extends LayerNodeConfigBase {
  type: 'group'
  children: LayerNodeConfig[]
  /** Effect filters applied to the group */
  filters?: EffectFilterConfig[]
  /** @deprecated Use filters instead */
  processors?: ProcessorConfig[]
  /** Whether the group is expanded in UI */
  expanded?: boolean
}

export type LayerNodeConfig =
  | BaseLayerNodeConfig
  | SurfaceLayerNodeConfig
  | TextLayerNodeConfig
  | Model3DLayerNodeConfig
  | ImageLayerNodeConfig
  | GroupLayerNodeConfig

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
 *       processors: [{ type: 'effect', enabled: true, config: { ... } }]
 *     },
 *     {
 *       type: 'surface',
 *       id: 'surface-1',
 *       name: 'Surface',
 *       visible: true,
 *       surface: { type: 'solid' },
 *       processors: [
 *         { type: 'effect', enabled: true, config: { ... } },
 *         { type: 'mask', enabled: true, shape: { ... }, invert: false, feather: 0 }
 *       ]
 *     }
 *   ],
 *   foreground: {
 *     title: { position: 'middle-center', content: 'Hello World' },
 *     description: { position: 'middle-center', content: 'Welcome' },
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
// Migration Helpers (processors → filters)
// ============================================================

/**
 * Get effect filters from a layer config (supports both filters and processors)
 * Use this helper during migration from processors to filters
 */
export const getLayerFilters = (layer: LayerNodeConfig): EffectFilterConfig[] => {
  // Prefer filters if available
  if (layer.filters && layer.filters.length > 0) {
    return layer.filters
  }
  // Fall back to processors (filtering out mask processors)
  if (layer.processors) {
    return layer.processors.filter((p): p is EffectFilterConfig => p.type === 'effect')
  }
  return []
}

/**
 * Get mask processor from a layer config
 */
export const getLayerMaskProcessor = (layer: LayerNodeConfig): MaskProcessorConfig | undefined => {
  if (layer.processors) {
    return layer.processors.find((p): p is MaskProcessorConfig => p.type === 'mask')
  }
  return undefined
}

/**
 * Check if layer config has mask processor
 */
export const hasLayerMaskProcessor = (layer: LayerNodeConfig): boolean => {
  return getLayerMaskProcessor(layer) !== undefined
}
