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
export type CanvasLayerType = 'texture' | 'maskedTexture' | 'image' | 'text'

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
 * マスク付きテクスチャレイヤーの設定
 * シェーダーとパラメータを直接保持（自己完結型）
 */
export interface MaskedTextureLayerConfig {
  type: 'maskedTexture'
  /** マスク付きテクスチャのスペック（シェーダー + パラメータ） */
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
 * Canvasレイヤーの設定（Union型）
 */
export type CanvasLayerConfig =
  | TextureLayerConfig
  | MaskedTextureLayerConfig
  | ImageLayerConfig
  | TextLayerConfig

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
// Filter Types
// ============================================================

/**
 * ビネットフィルター設定
 */
export interface VignetteFilterConfig {
  enabled: boolean
  /** 強さ (0.0 - 1.0) */
  intensity: number
  /** 半径 (0.2 - 1.5) */
  radius: number
  /** ソフトさ (0.1 - 1.0) */
  softness: number
}

/**
 * 色収差フィルター設定
 */
export interface ChromaticAberrationFilterConfig {
  enabled: boolean
  /** 強さ (0 - 20) */
  intensity: number
}

/**
 * レイヤーフィルター設定
 */
export interface LayerFilterConfig {
  vignette: VignetteFilterConfig
  chromaticAberration: ChromaticAberrationFilterConfig
}

/**
 * デフォルトのフィルター設定
 */
export const createDefaultFilterConfig = (): LayerFilterConfig => ({
  vignette: {
    enabled: false,
    intensity: 0.5,
    radius: 0.8,
    softness: 0.4,
  },
  chromaticAberration: {
    enabled: false,
    intensity: 3.0,
  },
})

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
 * マスク付きテクスチャレイヤーを作成
 */
export const createMaskedTextureLayer = (
  id: string,
  spec: TexturePatternSpec,
  options?: Partial<Omit<CanvasLayer, 'id' | 'config'>>
): CanvasLayer =>
  createCanvasLayer(id, 'Masked Texture', { type: 'maskedTexture', spec }, options)

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
