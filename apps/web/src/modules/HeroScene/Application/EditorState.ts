/**
 * HeroScene Editor State
 *
 * エディタ用の中間状態を管理する型定義
 * patternIndexで管理し、コンパイル時にHeroSceneに変換される
 *
 * @deprecated This entire module is deprecated.
 * Use SceneNode[] from Domain/LayerNode.ts with toRenderSpecs() instead.
 * See docs/architecture/hero-scene.md for the new architecture.
 */

import type {
  LayerBase,
  BlendMode,
  LayerFilterConfig,
  HeroSceneConfig,
  HtmlLayer,
  TextLayerConfig,
  ObjectLayerConfig,
  ClipMaskShape,
  ClipMaskShapeParams,
} from '../Domain'

// ============================================================
// Editor Layer Config Types (index-based)
// ============================================================

/**
 * テクスチャレイヤーのエディタ設定（インデックス参照）
 * @deprecated Use PatternSurface from Domain/LayerNode.ts instead
 */
export interface EditorTextureLayerConfig {
  type: 'texture'
  /** texturePatterns配列へのインデックス */
  patternIndex: number
}

/**
 * ClipGroupレイヤーのエディタ設定
 * 子レイヤーを直接保持する
 * @deprecated Use Processor from Domain/LayerNode.ts with MaskModifier instead
 */
export interface EditorClipGroupLayerConfig {
  type: 'clipGroup'
  /** マスク形状 */
  maskShape: ClipMaskShape
  /** マスク形状のパラメータ */
  maskShapeParams: ClipMaskShapeParams
  /** 内側/外側の反転 */
  maskInvert: boolean
  /** エッジのフェード量 (0-1) */
  maskFeather: number
  /** マスク表面テクスチャのインデックス（null = なし） */
  maskTextureIndex: number | null
  /** 子レイヤー（Editor版、再帰的に持たない簡易版のため別配列で管理） */
  childIds: string[]
}

/**
 * 画像レイヤーのエディタ設定
 * @deprecated Use ImageSurface from Domain/LayerNode.ts instead
 */
export interface EditorImageLayerConfig {
  type: 'image'
  /** 画像ソース (ImageBitmap or URL) */
  source: ImageBitmap | string
}

/**
 * テキストレイヤーのエディタ設定（Domainと同一）
 * @deprecated Use Layer with variant='text' from Domain/LayerNode.ts instead
 */
export type EditorTextLayerConfig = TextLayerConfig

/**
 * オブジェクトレイヤーのエディタ設定（Domainと同一）
 * @deprecated Use Layer with variant='model3d' from Domain/LayerNode.ts instead
 */
export type EditorObjectLayerConfig = ObjectLayerConfig

/**
 * エディタレイヤー設定（Union型）
 * @deprecated Use Surface union type from Domain/LayerNode.ts instead
 */
export type EditorCanvasLayerConfig =
  | EditorTextureLayerConfig
  | EditorClipGroupLayerConfig
  | EditorImageLayerConfig
  | EditorTextLayerConfig
  | EditorObjectLayerConfig

/**
 * エディタ用Canvasレイヤー
 * @deprecated Use SceneNode (Layer | Group | Processor) from Domain/LayerNode.ts instead
 */
export interface EditorCanvasLayer extends LayerBase {
  /** レイヤーの描画順序 (小さいほど奥) */
  zIndex: number
  /** レイヤー固有の設定（インデックス参照） */
  config: EditorCanvasLayerConfig
  /** ブレンドモード */
  blendMode: BlendMode
  /** フィルター設定 */
  filters: LayerFilterConfig
}

// ============================================================
// Editor State
// ============================================================

/**
 * HeroSceneエディタ状態
 * patternIndexで管理される中間状態
 * @deprecated Use HeroScene with nodes: SceneNode[] instead
 */
export interface HeroSceneEditorState {
  /** シーン設定 */
  config: HeroSceneConfig
  /** Canvasレイヤー (zIndexでソート済み) */
  canvasLayers: EditorCanvasLayer[]
  /** HTMLレイヤー */
  htmlLayer: HtmlLayer
}

// ============================================================
// Factory Functions
// ============================================================

/**
 * デフォルトのHeroSceneEditorStateを作成
 * @deprecated Use createHeroScene from Domain/index.ts instead
 */
export const createHeroSceneEditorState = (
  config?: Partial<HeroSceneConfig>
): HeroSceneEditorState => ({
  config: {
    width: 1280,
    height: 720,
    devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
    ...config,
  },
  canvasLayers: [],
  htmlLayer: {
    id: 'html-layer',
    name: 'HTML Layer',
    visible: true,
    opacity: 1.0,
    layoutId: 'row-top-between',
    items: [],
  },
})
