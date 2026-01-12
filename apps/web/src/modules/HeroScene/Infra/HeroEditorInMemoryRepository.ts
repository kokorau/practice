/**
 * HeroEditorInMemoryRepository
 *
 * HeroEditorState（UI状態 + HeroViewConfig）をメモリ上で管理するリポジトリ実装
 * subscribeパターンで変更通知をサポート
 */

import type {
  HeroEditorRepository,
  HeroEditorSubscriber,
  HeroEditorUnsubscribe,
} from '../Domain/repository/HeroEditorRepository'
import type {
  HeroEditorState,
  HeroEditorUIState,
  BackgroundUIState,
  MaskUIState,
  FilterUIState,
  ForegroundUIState,
  PresetUIState,
  ColorUIState,
  EditorSectionType,
} from '../Domain/HeroEditorState'
import { createDefaultHeroEditorUIState } from '../Domain/HeroEditorState'
import type {
  HeroViewConfig,
  LayerNodeConfig,
  GroupLayerNodeConfig,
  HeroColorsConfig,
  ViewportConfig,
  ForegroundLayerConfig,
} from '../Domain/HeroViewConfig'
import { createDefaultHeroViewConfig } from '../Domain/HeroViewConfig'

// ============================================================
// Helper Functions
// ============================================================

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

// ============================================================
// Factory Function
// ============================================================

export interface CreateHeroEditorRepositoryOptions {
  /** 初期UI状態 */
  initialUI?: Partial<HeroEditorUIState>
  /** 初期Config */
  initialConfig?: HeroViewConfig
}

/**
 * インメモリHeroEditorリポジトリを作成
 * @param options 初期設定オプション
 */
export const createHeroEditorInMemoryRepository = (
  options?: CreateHeroEditorRepositoryOptions
): HeroEditorRepository => {
  let state: HeroEditorState = {
    ui: {
      ...createDefaultHeroEditorUIState(),
      ...options?.initialUI,
    },
    config: options?.initialConfig ?? createDefaultHeroViewConfig(),
  }

  const subscribers = new Set<HeroEditorSubscriber>()

  const notifySubscribers = () => {
    for (const callback of subscribers) {
      callback(state)
    }
  }

  return {
    // ============================================================
    // Core Operations
    // ============================================================

    get: () => state,

    set: (newState: HeroEditorState) => {
      state = newState
      notifySubscribers()
    },

    subscribe: (callback: HeroEditorSubscriber): HeroEditorUnsubscribe => {
      subscribers.add(callback)
      return () => {
        subscribers.delete(callback)
      }
    },

    // ============================================================
    // UI State Operations
    // ============================================================

    updateUI: (updates: Partial<HeroEditorUIState>) => {
      state = {
        ...state,
        ui: {
          ...state.ui,
          ...updates,
        },
      }
      notifySubscribers()
    },

    setActiveSection: (section: EditorSectionType) => {
      state = {
        ...state,
        ui: {
          ...state.ui,
          activeSection: section,
        },
      }
      notifySubscribers()
    },

    updateBackgroundUI: (updates: Partial<BackgroundUIState>) => {
      state = {
        ...state,
        ui: {
          ...state.ui,
          background: {
            ...state.ui.background,
            ...updates,
          },
        },
      }
      notifySubscribers()
    },

    updateMaskUI: (updates: Partial<MaskUIState>) => {
      state = {
        ...state,
        ui: {
          ...state.ui,
          mask: {
            ...state.ui.mask,
            ...updates,
          },
        },
      }
      notifySubscribers()
    },

    updateFilterUI: (updates: Partial<FilterUIState>) => {
      state = {
        ...state,
        ui: {
          ...state.ui,
          filter: {
            ...state.ui.filter,
            ...updates,
          },
        },
      }
      notifySubscribers()
    },

    updateForegroundUI: (updates: Partial<ForegroundUIState>) => {
      state = {
        ...state,
        ui: {
          ...state.ui,
          foreground: {
            ...state.ui.foreground,
            ...updates,
          },
        },
      }
      notifySubscribers()
    },

    updatePresetUI: (updates: Partial<PresetUIState>) => {
      state = {
        ...state,
        ui: {
          ...state.ui,
          preset: {
            ...state.ui.preset,
            ...updates,
          },
        },
      }
      notifySubscribers()
    },

    updateColorUI: (updates: Partial<ColorUIState>) => {
      state = {
        ...state,
        ui: {
          ...state.ui,
          color: {
            ...state.ui.color,
            ...updates,
          },
        },
      }
      notifySubscribers()
    },

    // ============================================================
    // Config (Domain) Operations
    // ============================================================

    updateConfig: (configUpdates: Partial<HeroViewConfig>) => {
      state = {
        ...state,
        config: {
          ...state.config,
          ...configUpdates,
        },
      }
      notifySubscribers()
    },

    setConfig: (config: HeroViewConfig) => {
      state = {
        ...state,
        config,
      }
      notifySubscribers()
    },

    updateColors: (colors: Partial<HeroColorsConfig>) => {
      state = {
        ...state,
        config: {
          ...state.config,
          colors: {
            ...state.config.colors,
            ...colors,
            background: {
              ...state.config.colors.background,
              ...(colors.background ?? {}),
            },
            mask: {
              ...state.config.colors.mask,
              ...(colors.mask ?? {}),
            },
          },
        },
      }
      notifySubscribers()
    },

    updateViewport: (viewport: Partial<ViewportConfig>) => {
      state = {
        ...state,
        config: {
          ...state.config,
          viewport: {
            ...state.config.viewport,
            ...viewport,
          },
        },
      }
      notifySubscribers()
    },

    updateForeground: (foreground: Partial<ForegroundLayerConfig>) => {
      state = {
        ...state,
        config: {
          ...state.config,
          foreground: {
            ...state.config.foreground,
            ...foreground,
          },
        },
      }
      notifySubscribers()
    },

    // ============================================================
    // Layer Operations
    // ============================================================

    findLayer: (layerId: string) => {
      return findLayerInTree(state.config.layers, layerId)
    },

    updateLayer: (layerId: string, updates: Partial<LayerNodeConfig>) => {
      const layer = findLayerInTree(state.config.layers, layerId)
      if (!layer) return

      state = {
        ...state,
        config: {
          ...state.config,
          layers: updateLayerInTree(state.config.layers, layerId, updates),
        },
      }
      notifySubscribers()
    },

    addLayer: (layer: LayerNodeConfig, index?: number) => {
      const layers = [...state.config.layers]
      if (index !== undefined && index >= 0 && index <= layers.length) {
        layers.splice(index, 0, layer)
      } else {
        layers.push(layer)
      }
      state = {
        ...state,
        config: {
          ...state.config,
          layers,
        },
      }
      notifySubscribers()
    },

    removeLayer: (layerId: string) => {
      state = {
        ...state,
        config: {
          ...state.config,
          layers: removeLayerFromTree(state.config.layers, layerId),
        },
      }
      notifySubscribers()
    },

    reorderLayers: (layerIds: string[]) => {
      const layerMap = new Map<string, LayerNodeConfig>()
      for (const layer of state.config.layers) {
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
      for (const layer of state.config.layers) {
        if (!layerIds.includes(layer.id)) {
          reorderedLayers.push(layer)
        }
      }

      state = {
        ...state,
        config: {
          ...state.config,
          layers: reorderedLayers,
        },
      }
      notifySubscribers()
    },

    // ============================================================
    // Snapshot Operations
    // ============================================================

    snapshot: (): string => {
      return JSON.stringify(state.config)
    },

    restore: (snapshot: string): void => {
      try {
        const config = JSON.parse(snapshot) as HeroViewConfig
        state = {
          ...state,
          config,
        }
        notifySubscribers()
      } catch {
        console.error('Failed to restore snapshot: invalid JSON')
      }
    },
  }
}
