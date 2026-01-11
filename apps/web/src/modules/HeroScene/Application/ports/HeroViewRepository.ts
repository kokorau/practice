/**
 * HeroViewRepository Port
 *
 * HeroViewConfigの状態管理を抽象化するインターフェース
 * レイヤーの更新、取得、監視機能を提供
 */

import type {
  HeroViewConfig,
  LayerNodeConfig,
  BaseLayerNodeConfig,
  SurfaceLayerNodeConfig,
  TextLayerNodeConfig,
  Model3DLayerNodeConfig,
  ImageLayerNodeConfig,
  GroupLayerNodeConfig,
} from '../../Domain/HeroViewConfig'

/**
 * レイヤー更新のパーシャル型
 * 各レイヤータイプに応じた更新可能なプロパティ
 */
export type LayerUpdate =
  | Partial<Omit<BaseLayerNodeConfig, 'id' | 'type'>>
  | Partial<Omit<SurfaceLayerNodeConfig, 'id' | 'type'>>
  | Partial<Omit<TextLayerNodeConfig, 'id' | 'type'>>
  | Partial<Omit<Model3DLayerNodeConfig, 'id' | 'type'>>
  | Partial<Omit<ImageLayerNodeConfig, 'id' | 'type'>>
  | Partial<Omit<GroupLayerNodeConfig, 'id' | 'type'>>

/**
 * HeroViewConfig状態管理のリポジトリインターフェース
 */
export interface HeroViewRepository {
  /**
   * 現在のHeroViewConfigを取得
   */
  get(): HeroViewConfig

  /**
   * HeroViewConfig全体を設定
   * @param config 新しいConfig
   */
  set(config: HeroViewConfig): void

  /**
   * 特定のレイヤーを更新
   * @param layerId 更新対象のレイヤーID
   * @param updates 更新内容
   */
  updateLayer(layerId: string, updates: LayerUpdate): void

  /**
   * レイヤーIDで検索
   * @param layerId レイヤーID
   * @returns 見つかったレイヤー、なければundefined
   */
  findLayer(layerId: string): LayerNodeConfig | undefined

  /**
   * 変更を監視
   * @param callback 変更時に呼ばれるコールバック
   * @returns 監視解除関数
   */
  subscribe(callback: (config: HeroViewConfig) => void): () => void
}
