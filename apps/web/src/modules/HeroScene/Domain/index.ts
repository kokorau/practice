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

// Legacy alias for backward compatibility
const createDefaultFilterConfig = createDefaultEffectConfig
type LayerFilterConfig = LayerEffectConfig

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
  filters: LayerFilterConfig
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
  LayerEffectSchemas,
  type VignetteEffectConfig,
  type ChromaticAberrationEffectConfig,
  type DotHalftoneEffectConfig,
  type LineHalftoneEffectConfig,
  type LayerEffectConfig,
  type LayerEffectSchemaMap,
  createDefaultEffectConfig,
  // Legacy aliases (deprecated)
  VignetteFilterSchema,
  ChromaticAberrationFilterSchema,
  DotHalftoneFilterSchema,
  LineHalftoneFilterSchema,
  LayerFilterSchemas,
  type VignetteFilterConfig,
  type ChromaticAberrationFilterConfig,
  type DotHalftoneFilterConfig,
  type LineHalftoneFilterConfig,
  type LayerFilterConfig,
  type LayerFilterSchemaMap,
  createDefaultVignetteConfig,
  createDefaultChromaticAberrationConfig,
  createDefaultDotHalftoneConfig,
  createDefaultLineHalftoneConfig,
  createDefaultFilterConfig,
} from './EffectSchema'

// ============================================================
// Modifier Types (new naming)
// ============================================================

export {
  // New types
  type EffectModifier,
  type MaskModifier,
  type Modifier,
  createEffectModifier,
  createMaskModifier,
  isEffectModifier,
  isMaskModifier,
  getEnabledEffects,
  getEnabledMasks,
  // Legacy aliases (deprecated)
  type EffectProcessor,
  type MaskProcessor,
  type Processor,
  createEffectProcessor,
  createMaskProcessor,
  isEffectProcessor,
  isMaskProcessor,
} from './Modifier'

// ============================================================
// Layer & Group Types (new naming)
// ============================================================

export {
  // Types
  type Layer,
  type Group,
  type MaskNode,
  type MaskShape,
  type SceneNode,
  type LayerType,
  type LayerVariant,
  type NodeBase,
  type Surface,
  type PatternSurface,
  type ImageSurface,
  type SolidSurface,
  type TextConfig,
  type Model3DConfig,
  type DropPosition,
  // Factory functions
  createLayer,
  createBaseLayer,
  createSurfaceLayer,
  createTextLayer as createSceneTextLayer,
  createModel3DLayer,
  createImageLayer as createSceneImageLayer,
  createGroup,
  createMaskNode,
  // Type guards
  isLayer,
  isGroup,
  isMaskNode,
  isBaseLayer,
  isSurfaceLayer,
  isTextLayer,
  isModel3DLayer,
  isImageLayer,
  // Tree utilities
  findNode,
  updateNode,
  removeNode,
  flattenNodes,
  findParentNode,
  isAncestorOf,
  insertNode,
  moveNode,
  wrapNodeInGroup,
  wrapNodeInMaskedGroup,
  // Scene layer ID mapping
  SCENE_LAYER_IDS,
  type SceneLayerId,
  getSceneLayerId,
} from './LayerNode'

// ============================================================
// Move Rules (for Drag & Drop)
// ============================================================

export {
  type MoveValidationResult,
  canMoveBaseLayer,
  canDropBeforeBaseLayer,
  canPlaceMaskInBaseLayer,
  canDropIntoNonGroup,
  validateMove,
  getMaskedNodes,
  findApplicableMask,
  isNodeMasked,
  ensureBaseLayerFirst,
  isValidLayerStructure,
} from './MoveRules'

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
 * CanvasLayer[] + HtmlLayer で構成されるHeroセクション
 */
export interface HeroScene {
  /** シーン設定 */
  config: HeroSceneConfig
  /** Canvasレイヤー (zIndexでソート済み、小さいほど奥) */
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
  filters: createDefaultFilterConfig(),
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
 * デフォルトのHeroSceneを作成
 */
export const createHeroScene = (
  config?: Partial<HeroSceneConfig>
): HeroScene => ({
  config: {
    width: 1280,
    height: 720,
    devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
    ...config,
  },
  canvasLayers: [],
  htmlLayer: createHtmlLayer('row-top-between'),
})

// ============================================================
// Utility Functions
// ============================================================

/**
 * CanvasLayerをzIndexでソート（小さい順 = 奥から手前）
 */
export const sortCanvasLayers = (layers: CanvasLayer[]): CanvasLayer[] =>
  [...layers].sort((a, b) => a.zIndex - b.zIndex)

/**
 * レイヤーを追加
 */
export const addCanvasLayer = (scene: HeroScene, layer: CanvasLayer): HeroScene => ({
  ...scene,
  canvasLayers: sortCanvasLayers([...scene.canvasLayers, layer]),
})

/**
 * レイヤーを削除
 */
export const removeCanvasLayer = (scene: HeroScene, layerId: string): HeroScene => ({
  ...scene,
  canvasLayers: scene.canvasLayers.filter((l) => l.id !== layerId),
})

/**
 * レイヤーを更新
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
  ViewportConfig,
  StripeSurfaceConfig,
  GridSurfaceConfig,
  PolkaDotSurfaceConfig,
  CheckerSurfaceConfig,
  SolidSurfaceConfig,
  ImageSurfaceConfig,
  // New SurfaceConfig type (replaces BackgroundSurfaceConfig/MaskSurfaceConfig)
  SurfaceConfig as HeroSurfaceConfig,
  // Mask shape types
  CircleMaskShapeConfig as HeroCircleMaskShapeConfig,
  RectMaskShapeConfig as HeroRectMaskShapeConfig,
  BlobMaskShapeConfig as HeroBlobMaskShapeConfig,
  PerlinMaskShapeConfig as HeroPerlinMaskShapeConfig,
  MaskShapeConfig,
  MaskShapeConfig as HeroMaskShapeConfig,
  // Filter config types (for JSON serialization)
  FilterConfig,
  EffectFilterConfig,
  // LayerNodeConfig types (for JSON serialization)
  LayerNodeConfig,
  MaskNodeConfig,
  BaseLayerNodeConfig,
  SurfaceLayerNodeConfig,
  TextLayerNodeConfig,
  Model3DLayerNodeConfig,
  ImageLayerNodeConfig,
  GroupLayerNodeConfig,
  // Deprecated processor config types
  ProcessorConfig,
  EffectProcessorConfig,
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
  createDefaultEffectFilterConfig,
  createDefaultEffectProcessorConfig,
  createDefaultHeroViewConfig,
  // Migration helpers
  getLayerFilters,
  getLayerMaskProcessor,
  hasLayerMaskProcessor,
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

