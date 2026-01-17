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
  HeroColorsConfig,
  ViewportConfig,
  ForegroundLayerConfig,
} from '../Domain/HeroViewConfig'
import { createDefaultHeroViewConfig } from '../Domain/HeroViewConfig'
import {
  findLayerInTree,
  updateLayerInTree,
  removeLayerFromTree,
  wrapLayerInGroupInTree,
} from '../Domain/LayerTreeOps'

// Re-export LayerUpdate type for backward compatibility
export type { LayerUpdate } from '../Application/ports/HeroViewRepository'

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
        layers: updateLayerInTree(config.layers, layerId, updates as LayerUpdate),
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

    wrapLayerInGroup: (layerId: string, groupId?: string): string | null => {
      const layer = findLayerInTree(config.layers, layerId)
      if (!layer) return null

      const newGroupId = groupId ?? `group-${Date.now()}`
      config = {
        ...config,
        layers: wrapLayerInGroupInTree(config.layers, layerId, newGroupId),
      }
      notifySubscribers()
      return newGroupId
    },
  }
}
