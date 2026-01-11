/**
 * HeroViewInMemoryRepository
 *
 * HeroViewConfigをメモリ上で管理するリポジトリ実装
 * subscribeパターンで変更通知をサポート
 */

import type { HeroViewRepository } from '../Domain/repository/HeroViewRepository'
import type {
  HeroViewConfig,
  LayerNodeConfig,
  GroupLayerNodeConfig,
  HeroColorsConfig,
  ViewportConfig,
  ForegroundLayerConfig,
} from '../Domain/HeroViewConfig'
import { createDefaultHeroViewConfig } from '../Domain/HeroViewConfig'

// Re-export LayerUpdate type for backward compatibility
export type { LayerUpdate } from '../Application/ports/HeroViewRepository'

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
  updates: Partial<LayerNodeConfig>
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
 * レイヤーツリーからレイヤーを削除（イミュータブル）
 */
const removeLayerFromTree = (
  layers: LayerNodeConfig[],
  id: string
): LayerNodeConfig[] => {
  return layers
    .filter(layer => layer.id !== id)
    .map(layer => {
      if (layer.type === 'group') {
        const group = layer as GroupLayerNodeConfig
        return {
          ...group,
          children: removeLayerFromTree(group.children, id),
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
        colors: {
          ...config.colors,
          ...colors,
          background: {
            ...config.colors.background,
            ...(colors.background ?? {}),
          },
          mask: {
            ...config.colors.mask,
            ...(colors.mask ?? {}),
          },
        },
      }
      notifySubscribers()
    },

    updateViewport: (viewport: Partial<ViewportConfig>) => {
      config = {
        ...config,
        viewport: {
          ...config.viewport,
          ...viewport,
        },
      }
      notifySubscribers()
    },

    updateForeground: (foreground: Partial<ForegroundLayerConfig>) => {
      config = {
        ...config,
        foreground: {
          ...config.foreground,
          ...foreground,
        },
      }
      notifySubscribers()
    },

    // ============================================================
    // レイヤー操作
    // ============================================================

    updateLayer: (layerId: string, updates: Partial<LayerNodeConfig>) => {
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

    addLayer: (layer: LayerNodeConfig, index?: number) => {
      const layers = [...config.layers]
      if (index !== undefined && index >= 0 && index <= layers.length) {
        layers.splice(index, 0, layer)
      } else {
        layers.push(layer)
      }
      config = {
        ...config,
        layers,
      }
      notifySubscribers()
    },

    removeLayer: (layerId: string) => {
      config = {
        ...config,
        layers: removeLayerFromTree(config.layers, layerId),
      }
      notifySubscribers()
    },

    reorderLayers: (layerIds: string[]) => {
      // IDの順序に従ってレイヤーを並び替え
      const layerMap = new Map<string, LayerNodeConfig>()
      for (const layer of config.layers) {
        layerMap.set(layer.id, layer)
      }

      const reorderedLayers: LayerNodeConfig[] = []
      for (const id of layerIds) {
        const layer = layerMap.get(id)
        if (layer) {
          reorderedLayers.push(layer)
        }
      }

      // 指定されなかったレイヤーは末尾に追加
      for (const layer of config.layers) {
        if (!layerIds.includes(layer.id)) {
          reorderedLayers.push(layer)
        }
      }

      config = {
        ...config,
        layers: reorderedLayers,
      }
      notifySubscribers()
    },
  }
}
