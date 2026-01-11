/**
 * HeroViewInMemoryRepository
 *
 * インメモリでHeroViewConfigを管理するリポジトリ実装
 * - subscribe機能でリアクティブな状態管理を提供
 * - 初期値はDomain層のcreateDefaultHeroViewConfigを使用
 */

import type {
  HeroViewRepository,
  HeroViewSubscriber,
  HeroViewUnsubscribe,
} from '../../Domain/repository/HeroViewRepository'
import {
  type HeroViewConfig,
  type HeroColorsConfig,
  type ViewportConfig,
  type ForegroundLayerConfig,
  type LayerNodeConfig,
  createDefaultHeroViewConfig,
} from '../../Domain/HeroViewConfig'

// ============================================================
// Repository Implementation
// ============================================================

/**
 * インメモリHeroViewリポジトリを作成
 *
 * @param initialConfig 初期設定（省略時はデフォルト値を使用）
 */
export const createHeroViewInMemoryRepository = (
  initialConfig?: HeroViewConfig
): HeroViewRepository => {
  // State
  let currentConfig: HeroViewConfig = initialConfig ?? createDefaultHeroViewConfig()
  const subscribers = new Set<HeroViewSubscriber>()

  // Notify all subscribers
  const notifySubscribers = (): void => {
    for (const subscriber of subscribers) {
      subscriber(currentConfig)
    }
  }

  return {
    get(): HeroViewConfig {
      return currentConfig
    },

    set(config: HeroViewConfig): void {
      currentConfig = config
      notifySubscribers()
    },

    subscribe(subscriber: HeroViewSubscriber): HeroViewUnsubscribe {
      subscribers.add(subscriber)
      // Immediately notify with current value
      subscriber(currentConfig)

      return () => {
        subscribers.delete(subscriber)
      }
    },

    // ============================================================
    // セクション単位の部分更新
    // ============================================================

    updateColors(colors: Partial<HeroColorsConfig>): void {
      currentConfig = {
        ...currentConfig,
        colors: { ...currentConfig.colors, ...colors },
      }
      notifySubscribers()
    },

    updateViewport(viewport: Partial<ViewportConfig>): void {
      currentConfig = {
        ...currentConfig,
        viewport: { ...currentConfig.viewport, ...viewport },
      }
      notifySubscribers()
    },

    updateForeground(foreground: Partial<ForegroundLayerConfig>): void {
      currentConfig = {
        ...currentConfig,
        foreground: { ...currentConfig.foreground, ...foreground },
      }
      notifySubscribers()
    },

    // ============================================================
    // レイヤー操作
    // ============================================================

    findLayer(layerId: string): LayerNodeConfig | undefined {
      return currentConfig.layers.find((layer) => layer.id === layerId)
    },

    updateLayer(layerId: string, updates: Partial<LayerNodeConfig>): void {
      currentConfig = {
        ...currentConfig,
        layers: currentConfig.layers.map((layer) =>
          layer.id === layerId ? ({ ...layer, ...updates } as LayerNodeConfig) : layer
        ),
      }
      notifySubscribers()
    },

    addLayer(layer: LayerNodeConfig, index?: number): void {
      const newLayers = [...currentConfig.layers]
      if (index !== undefined && index >= 0 && index <= newLayers.length) {
        newLayers.splice(index, 0, layer)
      } else {
        newLayers.push(layer)
      }
      currentConfig = {
        ...currentConfig,
        layers: newLayers,
      }
      notifySubscribers()
    },

    removeLayer(layerId: string): void {
      currentConfig = {
        ...currentConfig,
        layers: currentConfig.layers.filter((layer) => layer.id !== layerId),
      }
      notifySubscribers()
    },

    reorderLayers(layerIds: string[]): void {
      const layerMap = new Map(currentConfig.layers.map((l) => [l.id, l]))
      const reordered = layerIds
        .map((id) => layerMap.get(id))
        .filter((l): l is LayerNodeConfig => l !== undefined)
      currentConfig = {
        ...currentConfig,
        layers: reordered,
      }
      notifySubscribers()
    },
  }
}
