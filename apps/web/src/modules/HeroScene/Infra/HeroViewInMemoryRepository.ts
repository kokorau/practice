/**
 * HeroViewInMemoryRepository
 *
 * HeroViewConfigをメモリ上で管理するリポジトリ実装
 * subscribeパターンで変更通知をサポート
 */

import type { HeroViewRepository, LayerUpdate } from '../Application/ports/HeroViewRepository'
import type { HeroViewConfig, LayerNodeConfig, GroupLayerNodeConfig } from '../Domain/HeroViewConfig'
import { createDefaultHeroViewConfig } from '../Domain/HeroViewConfig'

/**
 * レイヤーツリーから特定のIDを検索
 */
const findLayerInTree = (layers: LayerNodeConfig[], id: string): LayerNodeConfig | undefined => {
  for (const layer of layers) {
    if (layer.id === id) return layer
    if (layer.type === 'group') {
      const found = findLayerInTree((layer as GroupLayerNodeConfig).children, id)
      if (found) return found
    }
  }
  return undefined
}

/**
 * レイヤーツリーを更新（イミュータブル）
 */
const updateLayerInTree = (
  layers: LayerNodeConfig[],
  id: string,
  updates: LayerUpdate
): LayerNodeConfig[] => {
  return layers.map(layer => {
    if (layer.id === id) {
      return { ...layer, ...updates } as LayerNodeConfig
    }
    if (layer.type === 'group') {
      const group = layer as GroupLayerNodeConfig
      return {
        ...group,
        children: updateLayerInTree(group.children, id, updates),
      }
    }
    return layer
  })
}

/**
 * インメモリHeroViewリポジトリを作成
 * @param initialConfig 初期設定（省略時はデフォルト）
 */
export const createHeroViewInMemoryRepository = (
  initialConfig?: HeroViewConfig
): HeroViewRepository => {
  let config = initialConfig ?? createDefaultHeroViewConfig()
  const subscribers = new Set<(config: HeroViewConfig) => void>()

  const notifySubscribers = () => {
    for (const callback of subscribers) {
      callback(config)
    }
  }

  return {
    get: () => config,

    set: (newConfig: HeroViewConfig) => {
      config = newConfig
      notifySubscribers()
    },

    updateLayer: (layerId: string, updates: LayerUpdate) => {
      const layer = findLayerInTree(config.layers, layerId)
      if (!layer) return

      config = {
        ...config,
        layers: updateLayerInTree(config.layers, layerId, updates),
      }
      notifySubscribers()
    },

    findLayer: (layerId: string) => {
      return findLayerInTree(config.layers, layerId)
    },

    subscribe: (callback: (config: HeroViewConfig) => void) => {
      subscribers.add(callback)
      return () => {
        subscribers.delete(callback)
      }
    },
  }
}
