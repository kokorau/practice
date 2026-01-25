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
  NormalizedMaskConfig,
} from '../HeroViewConfig'
import type { LayerDropPosition, ModifierDropPosition } from '../LayerTreeOps'

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

  /**
   * レイヤーIDで検索
   * @param layerId レイヤーID
   * @returns 見つかったレイヤー、なければundefined
   */
  findLayer(layerId: string): LayerNodeConfig | undefined

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
   * レイヤーIDで検索
   * @param layerId レイヤーID
   * @returns 見つかったレイヤー、なければundefined
   */
  findLayer(layerId: string): LayerNodeConfig | undefined

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

  /**
   * レイヤーをグループで包む
   * @param layerId 包むレイヤーのID
   * @param groupId 新しいグループのID（省略時は自動生成）
   * @returns 作成されたグループのID
   */
  wrapLayerInGroup(layerId: string, groupId?: string): string | null

  /**
   * レイヤーをマスク付きグループで包む
   * @param layerId 包むレイヤーのID
   * @returns 作成されたグループのID、失敗時はnull
   */
  wrapLayerWithMask(layerId: string): string | null

  /**
   * レイヤーを移動（ドラッグ&ドロップ用）
   * @param layerId 移動するレイヤーのID
   * @param position 移動先の位置
   */
  moveLayer(layerId: string, position: LayerDropPosition): void

  /**
   * 修飾子を移動（ドラッグ&ドロップ用）
   * @param sourceNodeId 移動元のレイヤーID
   * @param sourceModifierIndex 移動する修飾子のインデックス
   * @param position 移動先の位置
   */
  moveModifier(sourceNodeId: string, sourceModifierIndex: number, position: ModifierDropPosition): void

  // ============================================================
  // マスク操作
  // ============================================================

  /**
   * マスク形状を更新
   * @param processorId プロセッサレイヤーのID
   * @param modifierIndex マスク修飾子のインデックス
   * @param shape 新しいマスク形状設定
   */
  updateMaskShape(processorId: string, modifierIndex: number, shape: NormalizedMaskConfig): void

  /**
   * マスクにレイヤーを追加
   * @param processorId プロセッサレイヤーのID
   * @param modifierIndex マスク修飾子のインデックス
   * @param layer 追加するレイヤー
   * @param index 挿入位置（省略時は末尾）
   */
  addLayerToMask(processorId: string, modifierIndex: number, layer: LayerNodeConfig, index?: number): void

  /**
   * マスクからレイヤーを削除
   * @param processorId プロセッサレイヤーのID
   * @param modifierIndex マスク修飾子のインデックス
   * @param layerId 削除するレイヤーのID
   */
  removeLayerFromMask(processorId: string, modifierIndex: number, layerId: string): void

  /**
   * マスク内でレイヤーを移動
   * @param processorId プロセッサレイヤーのID
   * @param modifierIndex マスク修飾子のインデックス
   * @param layerId 移動するレイヤーのID
   * @param newIndex 新しい位置
   */
  moveLayerInMask(processorId: string, modifierIndex: number, layerId: string, newIndex: number): void
}
