/**
 * HeroViewInMemoryRepository
 *
 * HeroViewConfigをメモリ上で管理するリポジトリ実装
 * subscribeパターンで変更通知をサポート
 */

import type { HeroViewRepository as DomainHeroViewRepository } from '../Domain/repository/HeroViewRepository'
import type { LayerUpdate } from '../Application/ports/HeroViewRepository'
import type {
  HeroViewConfig,
  LayerNodeConfig,
  GroupLayerNodeConfig,
  HeroColorsConfig,
  ViewportConfig,
  ForegroundLayerConfig,
} from '../Domain/HeroViewConfig'
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
): DomainHeroViewRepository => {
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

    updateLayer: (layerId: string, updates: Partial<LayerNodeConfig>) => {
      const layer = findLayerInTree(config.layers, layerId)
      if (!layer) return

      config = {
        ...config,
        layers: updateLayerInTree(config.layers, layerId, updates as LayerUpdate),
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

    // ============================================================
    // セクション単位の部分更新
    // ============================================================

    updateColors: (colors: Partial<HeroColorsConfig>) => {
      config = {
        ...config,
        colors: { ...config.colors, ...colors },
      }
      notifySubscribers()
    },

    updateViewport: (viewport: Partial<ViewportConfig>) => {
      config = {
        ...config,
        viewport: { ...config.viewport, ...viewport },
      }
      notifySubscribers()
    },

    updateForeground: (foreground: Partial<ForegroundLayerConfig>) => {
      config = {
        ...config,
        foreground: { ...config.foreground, ...foreground },
      }
      notifySubscribers()
    },

    // ============================================================
    // レイヤー操作
    // ============================================================

    addLayer: (layer: LayerNodeConfig, index?: number) => {
      const newLayers = [...config.layers]
      if (index !== undefined && index >= 0 && index <= newLayers.length) {
        newLayers.splice(index, 0, layer)
      } else {
        newLayers.push(layer)
      }
      config = {
        ...config,
        layers: newLayers,
      }
      notifySubscribers()
    },

    removeLayer: (layerId: string) => {
      const newLayers = config.layers.filter((l) => l.id !== layerId)
      if (newLayers.length === config.layers.length) return
      config = {
        ...config,
        layers: newLayers,
      }
      notifySubscribers()
    },

    reorderLayers: (layerIds: string[]) => {
      const layerMap = new Map(config.layers.map((l) => [l.id, l]))
      const newLayers: LayerNodeConfig[] = []
      for (const id of layerIds) {
        const layer = layerMap.get(id)
        if (layer) {
          newLayers.push(layer)
        }
      }
      // Keep any layers not in the reorder list at the end
      for (const layer of config.layers) {
        if (!layerIds.includes(layer.id)) {
          newLayers.push(layer)
        }
      }
      config = {
        ...config,
        layers: newLayers,
      }
      notifySubscribers()
    },
  }
}
