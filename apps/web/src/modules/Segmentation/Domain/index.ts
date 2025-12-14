import type { Srgb } from '@practice/color'

/**
 * 画像内の1つのセグメント（領域）
 */
export type Segment = {
  id: number
  bounds: { x: number; y: number; width: number; height: number }
  color: Srgb
  area: number
}

/**
 * セグメンテーション結果
 */
export type SegmentationMap = {
  /** 各ピクセルが属するセグメントID (-1 = エッジ/境界) */
  labels: Int32Array
  /** セグメント一覧 */
  segments: readonly Segment[]
  /** 画像サイズ */
  width: number
  height: number
}

/**
 * 色でグルーピングされたセグメント群
 */
export type LayerGroup = {
  id: number
  /** 統合後の代表色 */
  color: Srgb
  /** 合計面積 */
  totalArea: number
  /** 含まれる元セグメントのID群 */
  sourceSegmentIds: readonly number[]
}

/**
 * レイヤーとしてグルーピングされたセグメンテーション結果
 */
export type LayeredSegmentationMap = {
  /** 元のセグメンテーション結果 */
  base: SegmentationMap
  /** 色でグルーピングされたレイヤー群 */
  layers: readonly LayerGroup[]
  /** 各ピクセルが属するレイヤーID (-1 = エッジ/境界) */
  layerLabels: Int32Array
}

/**
 * 色ベースのレイヤー（k-meansクラスタリング結果）
 */
export type ColorBasedLayer = {
  id: number
  /** クラスタの代表色 */
  color: Srgb
  /** ピクセル数 */
  pixelCount: number
  /** 全体に占める割合 */
  ratio: number
}

/**
 * 色ベースのレイヤー抽出結果
 */
export type ColorBasedLayerMap = {
  /** 各ピクセルが属するレイヤーID */
  labels: Int32Array
  /** レイヤー情報（面積順にソート済み） */
  layers: readonly ColorBasedLayer[]
  /** 画像サイズ */
  width: number
  height: number
}
