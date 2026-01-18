/**
 * HeroViewRepository Port
 *
 * HeroViewConfigの状態管理を抽象化するインターフェース
 * Domain層のHeroViewRepositoryを再エクスポート
 */

import type {
  BaseLayerNodeConfig,
  SurfaceLayerNodeConfig,
  TextLayerNodeConfig,
  Model3DLayerNodeConfig,
  ImageLayerNodeConfig,
  GroupLayerNodeConfig,
} from '../../Domain/HeroViewConfig'

// Re-export from Domain layer
export type {
  HeroViewRepository,
  HeroViewSubscriber,
  HeroViewUnsubscribe,
} from '../../Domain/repository/HeroViewRepository'

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
