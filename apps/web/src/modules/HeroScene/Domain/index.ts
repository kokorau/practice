/**
 * HeroScene Domain Layer
 *
 * レイヤーベースのHeroセクション描画システムの型定義
 *
 * 構成:
 * - HtmlLayer: 最前面、インタラクティブ要素（CTA、リンク等）
 * - CanvasLayer[]: 装飾レイヤー（テクスチャ、マスク、装飾テキスト等）
 */

import type { TexturePatternSpec } from '@practice/texture'
import { createDefaultEffectConfig, type LayerEffectConfig } from './EffectSchema'
import type { LayerNodeConfig } from './HeroViewConfig'


// ============================================================
// Base Layer Types
// ============================================================

/**
 * レイヤーの基本プロパティ
 */
export interface LayerBase {
  /** 一意な識別子 */
  id: string
  /** 表示名（デバッグ用） */
  name: string
  /** 表示/非表示 */
  visible: boolean
  /** 不透明度 (0.0 - 1.0) */
  opacity: number
}

// ============================================================
// Canvas Layer Types
// ============================================================

/**
 * Canvasレイヤーの種類
 */
export type CanvasLayerType = 'texture' | 'image' | 'text' | 'object' | 'clipGroup'

/**
 * マスク形状の種類
 */
export type ClipMaskShape = 'circle' | 'rect' | 'blob' | 'perlin' | 'image'

/**
 * テクスチャレイヤーの設定
 * シェーダーとパラメータを直接保持（自己完結型）
 */
export interface TextureLayerConfig {
  type: 'texture'
  /** テクスチャパターンのスペック（シェーダー + パラメータ） */
  spec: TexturePatternSpec
}

/**
 * 画像レイヤーの設定
 */
export interface ImageLayerConfig {
  type: 'image'
  /** 画像ソース (ImageBitmap or URL) */
  source: ImageBitmap | string
}

/**
 * テキストレイヤーの設定
 */
export interface TextLayerConfig {
  type: 'text'
  /** 表示テキスト */
  text: string
  /** フォントファミリー */
  fontFamily: string
  /** フォントサイズ (px) */
  fontSize: number
  /** フォントウェイト */
  fontWeight: number
  /** 字詰め (em単位) */
  letterSpacing: number
  /** 行の高さ (倍率) */
  lineHeight: number
  /** テキスト色 (CSS color string) */
  color: string
  /** 配置 */
  position: {
    /** X座標 (0.0 - 1.0, 正規化座標) */
    x: number
    /** Y座標 (0.0 - 1.0, 正規化座標) */
    y: number
    /** アンカー位置 */
    anchor: 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
  }
  /** 回転角度 (radians) */
  rotation: number
}

/**
 * 3Dオブジェクトレイヤーの設定
 */
export interface ObjectLayerConfig {
  type: 'object'
  /** モデルファイルのURL (GLTF/GLB) */
  modelUrl: string
  /** 3D位置 */
  position: {
    x: number
    y: number
    z: number
  }
  /** 3D回転 (radians) */
  rotation: {
    x: number
    y: number
    z: number
  }
  /** スケール */
  scale: number
  /** マテリアルオーバーライド */
  materialOverrides?: {
    color?: string
    metalness?: number
    roughness?: number
  }
}

// ============================================================
// ClipGroup Types
// ============================================================

/**
 * クリッピングマスクの設定
 */
export interface ClipMaskConfig {
  /** マスク形状 */
  shape: ClipMaskShape
  /** 形状パラメータ（形状タイプに応じた設定） */
  shapeParams: ClipMaskShapeParams
  /** 内側/外側の反転 (true: 外側を表示) */
  invert: boolean
  /** エッジのフェード量 (0-1, 0=シャープ, 1=最大フェード) */
  feather: number
  /** マスク表面のテクスチャスペック（オプション） */
  surface?: TexturePatternSpec
}

/**
 * マスク形状のパラメータ（Union型）
 */
export type ClipMaskShapeParams =
  | CircleClipShapeParams
  | RectClipShapeParams
  | BlobClipShapeParams
  | PerlinClipShapeParams
  | ImageClipShapeParams

/**
 * 円形マスクのパラメータ
 */
export interface CircleClipShapeParams {
  type: 'circle'
  /** 中心X座標 (0-1, 正規化) */
  centerX: number
  /** 中心Y座標 (0-1, 正規化) */
  centerY: number
  /** 半径 (0-1, 画面短辺に対する比率) */
  radius: number
}

/**
 * 矩形マスクのパラメータ
 */
export interface RectClipShapeParams {
  type: 'rect'
  /** 中心X座標 (0-1, 正規化) */
  centerX: number
  /** 中心Y座標 (0-1, 正規化) */
  centerY: number
  /** 幅 (0-1, 正規化) */
  width: number
  /** 高さ (0-1, 正規化) */
  height: number
  /** 角丸半径 [top-left, top-right, bottom-right, bottom-left] */
  cornerRadius: [number, number, number, number]
}

/**
 * Blobマスクのパラメータ
 */
export interface BlobClipShapeParams {
  type: 'blob'
  /** 中心X座標 (0-1, 正規化) */
  centerX: number
  /** 中心Y座標 (0-1, 正規化) */
  centerY: number
  /** 基本半径 (0-1) */
  baseRadius: number
  /** 変形の振幅 (0-1) */
  amplitude: number
  /** 波の数 */
  octaves: number
  /** ランダムシード */
  seed: number
}

/**
 * Perlinノイズマスクのパラメータ
 */
export interface PerlinClipShapeParams {
  type: 'perlin'
  /** スケール */
  scale: number
  /** オクターブ数 */
  octaves: number
  /** 閾値 */
  threshold: number
  /** シード */
  seed: number
}

/**
 * 画像マスクのパラメータ
 */
export interface ImageClipShapeParams {
  type: 'image'
  /** マスク画像 */
  source: ImageBitmap | string
}

/**
 * ClipGroupレイヤーの設定（子レイヤーを再帰的に持たない簡易版）
 * 注: 子レイヤーはCanvasLayerとして別途管理
 */
export interface ClipGroupLayerConfig {
  type: 'clipGroup'
  /** クリッピングマスク設定 */
  mask: ClipMaskConfig
  /** 子レイヤーのID配列（描画順） */
  childIds: string[]
}

/**
 * Canvasレイヤーの設定（Union型）
 */
export type CanvasLayerConfig =
  | TextureLayerConfig
  | ImageLayerConfig
  | TextLayerConfig
  | ObjectLayerConfig
  | ClipGroupLayerConfig

/**
 * Canvasレイヤー
 * WebGPUで描画される装飾レイヤー
 */
export interface CanvasLayer extends LayerBase {
  /** レイヤーの描画順序 (小さいほど奥) */
  zIndex: number
  /** レイヤー固有の設定 */
  config: CanvasLayerConfig
  /** ブレンドモード */
  blendMode: BlendMode
  /** フィルター設定 */
  filters: LayerEffectConfig
}

/**
 * ブレンドモード
 */
export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay'

// ============================================================
// Effect Types (Schema-based)
// ============================================================

export {
  // New Effect exports
  VignetteEffectSchema,
  ChromaticAberrationEffectSchema,
  DotHalftoneEffectSchema,
  LineHalftoneEffectSchema,
  BlurEffectSchema,
  LayerEffectSchemas,
  type VignetteEffectConfig,
  type ChromaticAberrationEffectConfig,
  type DotHalftoneEffectConfig,
  type LineHalftoneEffectConfig,
  type BlurEffectConfig,
  type LayerEffectConfig,
  type LayerEffectSchemaMap,
  createDefaultEffectConfig,
  createDefaultBlurConfig,
  // Vignette shape schemas and types
  VignetteBaseSchema,
  VignetteShapeSchemas,
  EllipseVignetteSchema,
  CircleVignetteSchema,
  RectVignetteSchema,
  LinearVignetteSchema,
  VignetteShapeOptions,
  createDefaultVignetteShapeConfig,
  type VignetteShape,
  type VignetteConfig,
  type EllipseVignetteConfig,
  type CircleVignetteConfig,
  type RectVignetteConfig,
  type LinearVignetteConfig,
  createDefaultVignetteConfig,
  createDefaultChromaticAberrationConfig,
  createDefaultDotHalftoneConfig,
  createDefaultLineHalftoneConfig,
} from './EffectSchema'

// ============================================================
// Vignette Shape Params Types (additional exports from VignetteSchema)
// ============================================================

export {
  type EllipseVignetteParams,
  type CircleVignetteParams,
  type RectVignetteParams,
  type LinearVignetteParams,
  createDefaultVignetteConfig as createDefaultShapeVignetteConfig,
  createVignetteConfigForShape,
} from './VignetteSchema'

// ============================================================
// LayerTreeOps (shared utilities)
// ============================================================

export {
  // Drop position types
  type LayerDropPosition,
  type ModifierDropPosition,
  // Type guards
  isGroupLayerConfig,
  isProcessorLayerConfig,
  isSurfaceLayerConfig,
  isBaseLayerConfig,
  isTextLayerConfig,
  isImageLayerConfig,
  isModel3DLayerConfig,
  isMaskProcessorConfig,
  // Tree operations
  findLayerInTree,
  updateLayerInTree,
  removeLayerFromTree,
  findParentLayerInTree,
  moveLayerInTree,
  canMoveLayerInTree,
  wrapLayerInGroupInTree,
  flattenLayersInTree,
  insertLayerInTree,
  createGroupLayerConfig,
  // Modifier operations
  canMoveModifierInTree,
  moveModifierInTree,
  addModifierToProcessor,
  removeModifierFromProcessor,
  findProcessorForLayer,
  createProcessorNodeConfig,
  ensureProcessorForLayer,
} from './LayerTreeOps'


// ============================================================
// HTML Layer Types
// ============================================================

/**
 * HTMLレイヤーのコンテンツアイテム
 */
export interface HtmlContentItem {
  /** 一意な識別子 */
  id: string
  /** 要素タイプ */
  type: 'heading' | 'paragraph' | 'button' | 'link' | 'custom'
  /** テキストコンテンツ */
  content: string
  /** CSSクラス */
  className?: string
  /** インラインスタイル */
  style?: Record<string, string>
}

/**
 * HTMLレイヤー
 * 常に最前面に配置されるインタラクティブレイヤー
 */
export interface HtmlLayer extends LayerBase {
  /** レイアウトパターンID */
  layoutId: string
  /** コンテンツアイテム */
  items: HtmlContentItem[]
}

// ============================================================
// Hero Scene Types
// ============================================================

/**
 * HeroSceneの設定
 */
export interface HeroSceneConfig {
  /** キャンバスの幅 */
  width: number
  /** キャンバスの高さ */
  height: number
  /** デバイスピクセル比 */
  devicePixelRatio: number
}

/**
 * HeroScene
 * LayerNodeConfig tree based hero section with optional canvas layers
 */
export interface HeroScene {
  /** シーン設定 */
  config: HeroSceneConfig
  /**
   * Layer node tree (LayerNodeConfig from HeroViewConfig)
   */
  layers?: LayerNodeConfig[]
  /**
   * Canvasレイヤー (zIndexでソート済み、小さいほど奥)
   * @deprecated Use HeroViewConfig.layers instead
   * Will be removed in a future version.
   */
  canvasLayers: CanvasLayer[]
  /** HTMLレイヤー (常に最前面) */
  htmlLayer: HtmlLayer
}

// ============================================================
// Factory Functions
// ============================================================

/**
 * デフォルトのCanvasレイヤーを作成
 */
export const createCanvasLayer = (
  id: string,
  name: string,
  config: CanvasLayerConfig,
  options?: Partial<Omit<CanvasLayer, 'id' | 'name' | 'config'>>
): CanvasLayer => ({
  id,
  name,
  visible: true,
  opacity: 1.0,
  zIndex: 0,
  blendMode: 'normal',
  filters: createDefaultEffectConfig(),
  ...options,
  config,
})

/**
 * テクスチャレイヤーを作成
 */
export const createTextureLayer = (
  id: string,
  spec: TexturePatternSpec,
  options?: Partial<Omit<CanvasLayer, 'id' | 'config'>>
): CanvasLayer =>
  createCanvasLayer(id, 'Background Texture', { type: 'texture', spec }, options)

/**
 * デフォルトのClipMaskConfigを作成
 */
export const createDefaultClipMask = (
  shape: ClipMaskShape = 'circle',
  options?: Partial<ClipMaskConfig>
): ClipMaskConfig => {
  const defaultShapeParams: Record<ClipMaskShape, ClipMaskShapeParams> = {
    circle: { type: 'circle', centerX: 0.5, centerY: 0.5, radius: 0.3 },
    rect: { type: 'rect', centerX: 0.5, centerY: 0.5, width: 0.6, height: 0.4, cornerRadius: [0, 0, 0, 0] },
    blob: { type: 'blob', centerX: 0.5, centerY: 0.5, baseRadius: 0.3, amplitude: 0.1, octaves: 3, seed: 42 },
    perlin: { type: 'perlin', scale: 4, octaves: 4, threshold: 0.5, seed: 42 },
    image: { type: 'image', source: '' },
  }

  return {
    shape,
    shapeParams: defaultShapeParams[shape],
    invert: false,
    feather: 0,
    ...options,
  }
}

/**
 * ClipGroupレイヤーを作成
 */
export const createClipGroupLayer = (
  id: string,
  mask?: Partial<ClipMaskConfig>,
  childIds: string[] = [],
  options?: Partial<Omit<CanvasLayer, 'id' | 'config'>>
): CanvasLayer =>
  createCanvasLayer(
    id,
    'Clip Group',
    {
      type: 'clipGroup',
      mask: createDefaultClipMask(mask?.shape ?? 'circle', mask),
      childIds,
    },
    options
  )

/**
 * 画像レイヤーを作成
 */
export const createImageLayer = (
  id: string,
  source: ImageBitmap | string,
  options?: Partial<Omit<CanvasLayer, 'id' | 'config'>>
): CanvasLayer =>
  createCanvasLayer(id, 'Image', { type: 'image', source }, options)

/**
 * テキストレイヤーを作成
 */
export const createTextLayer = (
  id: string,
  text: string,
  options?: Partial<Omit<CanvasLayer, 'id' | 'config'>> & Partial<Omit<TextLayerConfig, 'type' | 'text'>>
): CanvasLayer => {
  const {
    fontFamily = 'sans-serif',
    fontSize = 48,
    fontWeight = 700,
    letterSpacing = 0,
    lineHeight = 1.2,
    color = '#ffffff',
    position = { x: 0.5, y: 0.5, anchor: 'center' },
    rotation = 0,
    ...layerOptions
  } = options ?? {}

  return createCanvasLayer(
    id,
    `Text: ${text.slice(0, 20)}`,
    {
      type: 'text',
      text,
      fontFamily,
      fontSize,
      fontWeight,
      letterSpacing,
      lineHeight,
      color,
      position,
      rotation,
    },
    layerOptions
  )
}

/**
 * デフォルトのHtmlLayerを作成
 */
export const createHtmlLayer = (
  layoutId: string,
  items: HtmlContentItem[] = []
): HtmlLayer => ({
  id: 'html-layer',
  name: 'HTML Layer',
  visible: true,
  opacity: 1.0,
  layoutId,
  items,
})

/**
 * Create a default HeroScene
 *
 * @param options - Optional configuration and initial nodes
 * @returns A new HeroScene instance
 */
export const createHeroScene = (
  options?: {
    config?: Partial<HeroSceneConfig>
    layers?: LayerNodeConfig[]
  }
): HeroScene => ({
  config: {
    width: 1280,
    height: 720,
    devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
    ...options?.config,
  },
  layers: options?.layers ?? [],
  canvasLayers: [],
  htmlLayer: createHtmlLayer('row-top-between'),
})

// ============================================================
// Utility Functions (CanvasLayer - deprecated)
// ============================================================

/**
 * CanvasLayerをzIndexでソート（小さい順 = 奥から手前）
 * @deprecated Use SceneNode tree with toRenderSpecs() instead
 */
export const sortCanvasLayers = (layers: CanvasLayer[]): CanvasLayer[] =>
  [...layers].sort((a, b) => a.zIndex - b.zIndex)

/**
 * レイヤーを追加
 * @deprecated Use addNode from LayerNode instead
 */
export const addCanvasLayer = (scene: HeroScene, layer: CanvasLayer): HeroScene => ({
  ...scene,
  canvasLayers: sortCanvasLayers([...scene.canvasLayers, layer]),
})

/**
 * レイヤーを削除
 * @deprecated Use removeNode from LayerNode instead
 */
export const removeCanvasLayer = (scene: HeroScene, layerId: string): HeroScene => ({
  ...scene,
  canvasLayers: scene.canvasLayers.filter((l) => l.id !== layerId),
})

/**
 * レイヤーを更新
 * @deprecated Use updateNode from LayerNode instead
 */
export const updateCanvasLayer = (
  scene: HeroScene,
  layerId: string,
  updates: Partial<Omit<CanvasLayer, 'id'>>
): HeroScene => ({
  ...scene,
  canvasLayers: sortCanvasLayers(
    scene.canvasLayers.map((l) => (l.id === layerId ? { ...l, ...updates } : l))
  ),
})

// ============================================================
// HeroViewConfig (統合インターフェース)
// ============================================================

export type {
  HsvColor,
  HeroPrimitiveKey,
  HeroContextName,
  HeroColorsConfig,
  SurfaceColorsConfig,
  ViewportConfig,
  StripeSurfaceConfig,
  GridSurfaceConfig,
  PolkaDotSurfaceConfig,
  CheckerSurfaceConfig,
  SolidSurfaceConfig,
  ImageSurfaceConfig,
  // New SurfaceConfig type (replaces BackgroundSurfaceConfig/MaskSurfaceConfig)
  SurfaceConfig as HeroSurfaceConfig,
  // Normalized Surface config (Phase 12)
  SurfaceType,
  NormalizedSurfaceConfig,
  AnySurfaceConfig,
  // Mask shape types
  CircleMaskShapeConfig as HeroCircleMaskShapeConfig,
  RectMaskShapeConfig as HeroRectMaskShapeConfig,
  BlobMaskShapeConfig as HeroBlobMaskShapeConfig,
  PerlinMaskShapeConfig as HeroPerlinMaskShapeConfig,
  MaskShapeConfig,
  MaskShapeConfig as HeroMaskShapeConfig,
  // Normalized Mask config (Phase 12)
  MaskShapeTypeId,
  NormalizedMaskConfig,
  AnyMaskConfig,
  // Filter config types (for JSON serialization)
  SingleEffectConfig,
  // LayerNodeConfig types (for JSON serialization)
  LayerNodeConfig,
  BaseLayerNodeConfig,
  SurfaceLayerNodeConfig,
  TextLayerNodeConfig,
  Model3DLayerNodeConfig,
  ImageLayerNodeConfig,
  ImagePositionConfig,
  GroupLayerNodeConfig,
  ProcessorNodeConfig,
  // Processor modifier config types
  ProcessorConfig,
  MaskProcessorConfig,
  // Foreground
  GridPosition,
  ForegroundElementType,
  ForegroundElementConfig,
  ForegroundLayerConfig,
  HeroViewConfig,
  // Legacy types (deprecated)
  BackgroundSurfaceConfig,
  MaskSurfaceConfig,
  BackgroundLayerConfig,
  MaskLayerConfig,
} from './HeroViewConfig'

export {
  createDefaultColorsConfig,
  createDefaultForegroundConfig,
  createDefaultHeroViewConfig,
  // Default colors for surface layers (palette keys)
  DEFAULT_LAYER_BACKGROUND_COLORS,
  DEFAULT_LAYER_MASK_COLORS,
  // Layer helpers
  getLayerFilters,
  getLayerMaskProcessor,
  hasLayerMaskProcessor,
  // Effect config type guard
  isSingleEffectConfig,
  // Effect utilities
  isEffectOfType,
  isVignetteEffect,
  isChromaticAberrationEffect,
  isDotHalftoneEffect,
  isLineHalftoneEffect,
  isBlurEffect,
  createSingleEffectConfig,
  extractEnabledEffects,
  denormalizeToLayerEffectConfig,
  createDefaultMaskProcessorConfig,
  // Surface config normalization (Phase 12)
  SURFACE_TYPES,
  isNormalizedSurfaceConfig,
  isLegacyTypeSurfaceConfig,
  normalizeSurfaceConfig,
  denormalizeSurfaceConfig,
  getSurfaceAsNormalized,
  getSurfaceAsLegacy,
  // Mask config normalization (Phase 12)
  MASK_SHAPE_TYPE_IDS,
  isNormalizedMaskConfig,
  isLegacyTypeMaskConfig,
  normalizeMaskConfig,
  denormalizeMaskConfig,
  getMaskAsNormalized,
  getMaskAsLegacy,
  // Migration and validation functions
  migrateToNormalizedFormat,
  validateHeroViewConfig,
  type ConfigValidationResult,
} from './HeroViewConfig'

// ============================================================
// HeroViewPreset
// ============================================================

export type {
  PresetHsvColor,
  PresetFoundation,
  PresetColorConfig,
  HeroViewPreset,
} from './HeroViewPreset'

// ============================================================
// Reverse Lookup Utilities
// ============================================================

export {
  approxEqual,
  findSurfacePresetIndex,
  findMaskPatternIndex,
  type SurfacePresetParams,
  type MaskPatternConfig,
} from './ReverseLookup'

// ============================================================
// Effect Registry
// ============================================================

export {
  EFFECT_REGISTRY,
  EFFECT_TYPES,
  getEffectDefinition,
  isValidEffectType,
  type EffectType,
  type FilterType,
  type EffectDefinition,
  type VignetteEffectDefinition,
  type EffectShaderSpec,
} from './EffectRegistry'

// ============================================================
// Effector Types (Unified Effect + Mask)
// ============================================================

export {
  // Types
  type EffectorType,
  type EffectorCategory,
  type EffectorModifier,
  type MaskShapeType,
  type UnifiedFilterType,
  type BaseEffectorDefinition,
  type EffectEffectorDefinition,
  type MaskEffectorDefinition,
  type EffectorDefinition,
  // Constants
  EFFECTOR_TYPES,
  MASK_SHAPE_TYPES,
  EFFECTOR_REGISTRY,
  MASK_EFFECTOR_DEFINITION,
  // Type guards
  isEffectType,
  isMaskType,
  isValidEffectorType,
  isValidMaskShapeType,
  isRegisteredEffector,
  // Utilities
  getEffectorCategory,
  getEffectorDisplayName,
  getMaskShapeDisplayName,
  createEffectorModifier,
  getEffectorDefinition,
  // Mask Schema re-exports
  MaskBaseSchema,
  MaskShapeSchemas,
  MaskShapeOptions,
  type MaskShape,
  type MaskConfig,
  type CircleMaskConfig,
  type RectMaskConfig,
  type BlobMaskConfig,
  type PerlinMaskConfig,
  type LinearGradientMaskConfig,
  type RadialGradientMaskConfig,
  type BoxGradientMaskConfig,
  type BoxGradientCurve,
  type CircleMaskParams,
  type RectMaskParams,
  type BlobMaskParams,
  type PerlinMaskParams,
  type LinearGradientMaskParams,
  type RadialGradientMaskParams,
  type BoxGradientMaskParams,
  createDefaultMaskConfig,
  createMaskConfigForShape,
  isCircleMaskConfig,
  isRectMaskConfig,
  isBlobMaskConfig,
  isPerlinMaskConfig,
  isLinearGradientMaskConfig,
  isRadialGradientMaskConfig,
  isBoxGradientMaskConfig,
  // Migration helpers
  type LegacyClipMaskShape,
  type LegacyClipMaskConfig,
  type LegacyMaskModifier,
  isSupportedMaskShape,
  migrateClipMaskConfig,
  migrateMaskModifier,
  toLegacyClipMaskConfig,
  toLegacyMaskModifier,
} from './EffectorTypes'

// ============================================================
// Constants
// ============================================================

export {
  HERO_CANVAS_WIDTH,
  HERO_CANVAS_HEIGHT,
  HERO_CANVAS_DIMENSIONS,
} from './constants'

// ============================================================
// Repository Interfaces
// ============================================================

export type {
  HeroViewRepository,
  HeroViewSubscriber,
  HeroViewUnsubscribe,
} from './repository'

// ============================================================
// HeroEditorState (統合状態管理)
// ============================================================

export type {
  EditorSectionType,
  BackgroundUIState,
  MaskUIState,
  FilterUIState,
  ForegroundUIState,
  PresetUIState,
  HeroEditorUIState,
  HeroEditorState,
  CustomMaskShapeParams,
  CustomSurfaceParams,
  CustomBackgroundSurfaceParams,
} from './HeroEditorState'

export {
  createDefaultBackgroundUIState,
  createDefaultMaskUIState,
  createDefaultFilterUIState,
  createDefaultForegroundUIState,
  createDefaultPresetUIState,
  createDefaultHeroEditorUIState,
  isValidEditorSection,
} from './HeroEditorState'

export type {
  HeroEditorRepository,
  HeroEditorSubscriber,
  HeroEditorUnsubscribe,
} from './repository/HeroEditorRepository'

// ============================================================
// Mappers
// ============================================================

export { toCustomMaskShapeParams, fromCustomMaskShapeParams } from './MaskShapeMapper'
export { toCustomSurfaceParams, toCustomBackgroundSurfaceParams, fromCustomSurfaceParams } from './SurfaceMapper'

// ============================================================
// Mask Shader Registry
// ============================================================

export {
  MASK_SHADER_REGISTRY,
  MASK_SHAPES_WITH_SHADER,
  DEFAULT_MASK_COLORS,
  createMaskShaderSpec,
  createCircleMaskShaderSpec,
  createRectMaskShaderSpec,
  createPerlinMaskShaderSpec,
  createLinearGradientMaskShaderSpec,
  createRadialGradientMaskShaderSpec,
  createBoxGradientMaskShaderSpec,
  hasMaskShader,
  type MaskColors,
} from './MaskShaderRegistry'

// ============================================================
// Shader Definition Types (UUID-based system)
// ============================================================

export {
  // Types
  type ShaderDefinition,
  type ShaderCategory,
  type ShaderAuthor,
  type ShaderParamSchema,
  type ParamDefinition,
  type NumberParamDefinition,
  type BooleanParamDefinition,
  type SelectParamDefinition,
  type StringParamDefinition,
  type ColorParamDefinition,
  // Constants
  OFFICIAL_AUTHOR,
  // Factory
  createShaderDefinition,
  // Type guards
  isShaderDefinition,
  isShaderCategory,
} from './ShaderDefinition'

// ============================================================
// Shader Reference Types (for presets/configs)
// ============================================================

export {
  // Types
  type ShaderRef,
  type LegacySurfaceType,
  type LegacyShaderRef,
  type SurfaceRef,
  // Type guards
  isShaderRef,
  isLegacyShaderRef,
  isSurfaceRef,
  // Utilities
  getShaderIdentifier,
  getShaderParams,
  toShaderRef,
  normalizeSurfaceRef,
} from './ShaderRef'

// ============================================================
// HeroViewConfig Shader Reference Types
// ============================================================

export {
  type ShaderRefConfig,
  type SurfaceRefConfig,
  isShaderRefConfig,
  isLegacySurfaceConfig,
} from './HeroViewConfig'

// ============================================================
// Compositor Node System
// ============================================================

export {
  // Core types
  type TextureHandle,
  type TexturePool,
  type CompositorRenderer,
  type NodeContext,
  type NodeType,
  type BaseNode,
  type RGBA,
  type ColorKeyPair,
  // RenderNode
  type RenderNode,
  type SurfaceRenderInput,
  type MaskRenderInput,
  type EffectRenderInput,
  type ImageRenderInput,
  type CompositorNodeLike,
  isRenderNode,
  // CompositorNode
  type CompositorNode,
  type MaskCompositorInput,
  type OverlayCompositorInput,
  type EffectChainCompositorInput,
  type BlendMode as CompositorBlendMode,
  type CompositorInput,
  isCompositorNode,
  getTextureFromNode,
  DEFAULT_BLEND_MODE,
  // OutputNode
  type OutputNode,
  type CanvasOutputOptions,
  isOutputNode,
  // Union types
  type PipelineNode,
  type TextureProducingNode,
} from './Compositor'

