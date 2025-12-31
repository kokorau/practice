/**
 * HeroScene Editor State
 *
 * エディタ用の中間状態を管理する型定義
 * patternIndexで管理し、コンパイル時にHeroSceneに変換される
 */

import type {
  LayerBase,
  BlendMode,
  LayerFilterConfig,
  HeroSceneConfig,
  HtmlLayer,
  TextLayerConfig,
} from '../Domain'

// ============================================================
// Editor Layer Config Types (index-based)
// ============================================================

/**
 * テクスチャレイヤーのエディタ設定（インデックス参照）
 */
export interface EditorTextureLayerConfig {
  type: 'texture'
  /** texturePatterns配列へのインデックス */
  patternIndex: number
}

/**
 * マスク付きテクスチャレイヤーのエディタ設定（インデックス参照）
 */
export interface EditorMaskedTextureLayerConfig {
  type: 'maskedTexture'
  /** maskPatterns配列へのインデックス */
  maskIndex: number
  /** midgroundTexturePatterns配列へのインデックス（null = ソリッドマスク） */
  textureIndex: number | null
  /** カスタム画像をサーフェスとして使用する場合 */
  surfaceImage?: ImageBitmap
}

/**
 * 画像レイヤーのエディタ設定
 */
export interface EditorImageLayerConfig {
  type: 'image'
  /** 画像ソース (ImageBitmap or URL) */
  source: ImageBitmap | string
}

/**
 * テキストレイヤーのエディタ設定（Domainと同一）
 */
export type EditorTextLayerConfig = TextLayerConfig

/**
 * エディタレイヤー設定（Union型）
 */
export type EditorCanvasLayerConfig =
  | EditorTextureLayerConfig
  | EditorMaskedTextureLayerConfig
  | EditorImageLayerConfig
  | EditorTextLayerConfig

/**
 * エディタ用Canvasレイヤー
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
