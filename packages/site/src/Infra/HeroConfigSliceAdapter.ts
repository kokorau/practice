/**
 * HeroConfigSliceAdapter - SiteRepositoryからHeroViewConfigへのスライスビュー
 *
 * SiteRepositoryのconfigs.hero[configId]に対するHeroViewRepository互換のアダプター
 * useHeroSceneなどのcomposableでそのまま使用可能
 */

import type { HeroViewRepository } from '@practice/section-visual'
import type {
  HeroViewConfig,
  HeroColorsConfig,
  ViewportConfig,
  ForegroundLayerConfig,
  LayerNodeConfig,
  GroupLayerNodeConfig,
  ProcessorNodeConfig,
} from '@practice/section-visual'
import {
  createDefaultHeroViewConfig,
  createDefaultMaskProcessorConfig,
  findLayerInTree,
  updateLayerInTree,
  removeLayerFromTree,
  wrapLayerInGroupInTree,
  isGroupLayerConfig,
  moveLayerInTree,
  moveModifierInTree,
  type LayerDropPosition,
  type ModifierDropPosition,
  type LayerUpdate,
} from '@practice/section-visual'
import type { SiteRepository } from '../Application/ports/SiteRepository'

export interface CreateHeroConfigSliceOptions {
  /** Site repository */
  siteRepository: SiteRepository
  /** Config ID in Site.configs.hero */
  configId: string
  /** Create default config if not exists (default: true) */
  createIfNotExists?: boolean
}

/**
 * Create a HeroViewRepository-compatible slice adapter for a specific hero config
 *
 * @example
 * ```typescript
 * const siteRepository = createSiteInMemoryRepository({ initialSite })
 * const heroRepo = createHeroConfigSlice({
 *   siteRepository,
 *   configId: 'hero-main',
 * })
 *
 * // Use with useHeroScene
 * const heroScene = useHeroScene({
 *   primitivePalette,
 *   isDark,
 *   repository: heroRepo,
 * })
 * ```
 */
export const createHeroConfigSlice = (
  options: CreateHeroConfigSliceOptions
): HeroViewRepository => {
  const { siteRepository, configId, createIfNotExists = true } = options

  const getConfig = (): HeroViewConfig => {
    const config = siteRepository.getHeroConfig(configId)
    if (config) return config

    if (createIfNotExists) {
      const defaultConfig = createDefaultHeroViewConfig()
      siteRepository.addHeroConfig(configId, defaultConfig)
      return defaultConfig
    }

    // Return default config without persisting (for read-only scenarios)
    return createDefaultHeroViewConfig()
  }

  const setConfig = (config: HeroViewConfig): void => {
    siteRepository.setHeroConfig(configId, config)
  }

  return {
    get: () => getConfig(),

    set: (newConfig: HeroViewConfig) => {
      setConfig(newConfig)
    },

    subscribe: (callback: (config: HeroViewConfig) => void) => {
      let lastConfig = getConfig()

      return siteRepository.subscribe((site) => {
        const currentConfig = site.configs.hero[configId]
        // Only notify if config actually changed
        if (currentConfig && currentConfig !== lastConfig) {
          lastConfig = currentConfig
          callback(currentConfig)
        }
      })
    },

    // ============================================================
    // セクション単位の部分更新
    // ============================================================

    updateColors: (colors: Partial<HeroColorsConfig>) => {
      const config = getConfig()
      setConfig({
        ...config,
        colors: {
          ...config.colors,
          ...colors,
        },
      })
    },

    updateViewport: (viewport: Partial<ViewportConfig>) => {
      const config = getConfig()
      setConfig({
        ...config,
        viewport: {
          ...config.viewport,
          ...viewport,
        },
      })
    },

    updateForeground: (foreground: Partial<ForegroundLayerConfig>) => {
      const config = getConfig()
      setConfig({
        ...config,
        foreground: {
          ...config.foreground,
          ...foreground,
        },
      })
    },

    // ============================================================
    // レイヤー操作
    // ============================================================

    findLayer: (layerId: string) => {
      const config = getConfig()
      return findLayerInTree(config.layers, layerId)
    },

    updateLayer: (layerId: string, updates: Partial<LayerNodeConfig>) => {
      const config = getConfig()
      const layer = findLayerInTree(config.layers, layerId)
      if (!layer) return

      setConfig({
        ...config,
        layers: updateLayerInTree(config.layers, layerId, updates as LayerUpdate),
      })
    },

    addLayer: (layer: LayerNodeConfig, index?: number) => {
      const config = getConfig()
      const layers = [...config.layers]
      if (index !== undefined && index >= 0 && index <= layers.length) {
        layers.splice(index, 0, layer)
      } else {
        layers.push(layer)
      }
      setConfig({
        ...config,
        layers,
      })
    },

    removeLayer: (layerId: string) => {
      const config = getConfig()
      setConfig({
        ...config,
        layers: removeLayerFromTree(config.layers, layerId),
      })
    },

    reorderLayers: (layerIds: string[]) => {
      const config = getConfig()
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

      setConfig({
        ...config,
        layers: reorderedLayers,
      })
    },

    wrapLayerInGroup: (layerId: string, groupId?: string): string | null => {
      const config = getConfig()
      const layer = findLayerInTree(config.layers, layerId)
      if (!layer) return null

      const newGroupId = groupId ?? `group-${Date.now()}`
      setConfig({
        ...config,
        layers: wrapLayerInGroupInTree(config.layers, layerId, newGroupId),
      })
      return newGroupId
    },

    wrapLayerWithMask: (layerId: string): string | null => {
      const config = getConfig()
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

      setConfig({
        ...config,
        layers: replaceWithGroup(config.layers),
      })
      return groupId
    },

    moveLayer: (layerId: string, position: LayerDropPosition) => {
      const config = getConfig()
      setConfig({
        ...config,
        layers: moveLayerInTree(config.layers, layerId, position),
      })
    },

    moveModifier: (sourceNodeId: string, sourceModifierIndex: number, position: ModifierDropPosition) => {
      const config = getConfig()
      setConfig({
        ...config,
        layers: moveModifierInTree(config.layers, sourceNodeId, sourceModifierIndex, position),
      })
    },
  }
}
