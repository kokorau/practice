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
  ProcessorNodeConfig,
  HeroColorsConfig,
  ViewportConfig,
  ForegroundLayerConfig,
} from '../Domain/HeroViewConfig'
import { createDefaultHeroViewConfig, createDefaultMaskProcessorConfig } from '../Domain/HeroViewConfig'
import {
  findLayerInTree,
  updateLayerInTree,
  removeLayerFromTree,
  wrapLayerInGroupInTree,
  isGroupLayerConfig,
  moveLayerInTree,
  moveModifierInTree,
  type LayerDropPosition,
  type ModifierDropPosition,
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

    wrapLayerWithMask: (layerId: string): string | null => {
      const layer = findLayerInTree(config.layers, layerId)
      if (!layer || isGroupLayerConfig(layer)) return null

      const groupId = `group-${Date.now()}`
      const processorId = `processor-${Date.now()}`

      // Create processor node with default mask
      const processor: ProcessorNodeConfig = {
        type: 'processor',
        id: processorId,
        name: 'Mask',
        visible: true,
        modifiers: [createDefaultMaskProcessorConfig()],
      }

      // Create group containing layer and processor
      const newGroup: GroupLayerNodeConfig = {
        type: 'group',
        id: groupId,
        name: 'Masked Group',
        visible: true,
        children: [layer, processor],
      }

      // Replace layer with group in tree
      const replaceWithGroup = (layerList: LayerNodeConfig[]): LayerNodeConfig[] => {
        return layerList.map(l => {
          if (l.id === layerId) {
            return newGroup
          }
          if (isGroupLayerConfig(l)) {
            return {
              ...l,
              children: replaceWithGroup(l.children),
            }
          }
          return l
        })
      }

      config = {
        ...config,
        layers: replaceWithGroup(config.layers),
      }
      notifySubscribers()
      return groupId
    },

    moveLayer: (layerId: string, position: LayerDropPosition) => {
      config = {
        ...config,
        layers: moveLayerInTree(config.layers, layerId, position),
      }
      notifySubscribers()
    },

    moveModifier: (sourceNodeId: string, sourceModifierIndex: number, position: ModifierDropPosition) => {
      config = {
        ...config,
        layers: moveModifierInTree(config.layers, sourceNodeId, sourceModifierIndex, position),
      }
      notifySubscribers()
    },
  }
}
