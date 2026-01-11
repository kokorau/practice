/**
 * HeroViewRepository Port
 *
 * HeroViewConfigの状態管理を抽象化するインターフェース
 * - InMemory実装: 開発中のリアクティブ状態管理
 * - LocalStorage実装: 将来の永続化対応
 */

import type {
  HeroViewConfig,
  HeroColorsConfig,
  ViewportConfig,
  ForegroundLayerConfig,
  LayerNodeConfig,
} from '../HeroViewConfig'

/**
 * Subscribe callback type
 */
export type HeroViewSubscriber = (config: HeroViewConfig) => void

/**
 * Unsubscribe function type
 */
export type HeroViewUnsubscribe = () => void

/**
 * HeroViewConfigのリポジトリインターフェース
 */
export interface HeroViewRepository {
  /**
   * 現在のHeroViewConfigを取得
   */
  get(): HeroViewConfig

  /**
   * HeroViewConfigを更新
   * @param config 新しい設定
   */
  set(config: HeroViewConfig): void

  /**
   * 設定変更を購読
   * @param subscriber 変更時に呼び出されるコールバック
   * @returns 購読解除関数
   */
  subscribe(subscriber: HeroViewSubscriber): HeroViewUnsubscribe

  // ============================================================
  // セクション単位の部分更新
  // ============================================================

  /**
   * カラー設定を部分更新
   */
  updateColors(colors: Partial<HeroColorsConfig>): void

  /**
   * ビューポート設定を部分更新
   */
  updateViewport(viewport: Partial<ViewportConfig>): void

  /**
   * 前景レイヤー設定を部分更新
   */
  updateForeground(foreground: Partial<ForegroundLayerConfig>): void

  // ============================================================
  // レイヤー操作
  // ============================================================

  /**
   * 特定レイヤーを更新
   */
  updateLayer(layerId: string, updates: Partial<LayerNodeConfig>): void

  /**
   * レイヤーを追加
   * @param layer 追加するレイヤー
   * @param index 挿入位置（省略時は末尾）
   */
  addLayer(layer: LayerNodeConfig, index?: number): void

  /**
   * レイヤーを削除
   */
  removeLayer(layerId: string): void

  /**
   * レイヤーの順序を変更
   * @param layerIds 新しい順序のレイヤーID配列
   */
  reorderLayers(layerIds: string[]): void
}
