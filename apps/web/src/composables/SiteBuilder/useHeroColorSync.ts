/**
 * useHeroColorSync
 *
 * カラー同期ロジックを管理するcomposable
 * - レイヤーのカラーキー変更をリポジトリに同期
 * - セマンティックコンテキストの同期
 * - アクティブセクションとレイヤー選択の同期
 */

import { watch, type Ref } from 'vue'
import type {
  HeroViewRepository,
  LayerNodeConfig,
  SurfaceColorsConfig,
  HeroPrimitiveKey,
} from '../../modules/HeroScene'
import type { UseHeroColorsReturn } from './useHeroColors'
import type { UseHeroThumbnailsReturn } from './useHeroThumbnails'

export interface UseHeroColorSyncOptions {
  heroViewRepository: HeroViewRepository
  heroColors: UseHeroColorsReturn
  heroThumbnails: UseHeroThumbnailsReturn
  isLoadingFromConfig: Ref<boolean>
  selectCanvasLayer: (layerId: string) => void
}

/**
 * Helper to update colors on surface layer within layer tree
 */
const updateSurfaceLayerColors = (
  layers: LayerNodeConfig[],
  layerId: string,
  colorUpdate: Partial<SurfaceColorsConfig>
): LayerNodeConfig[] => {
  return layers.map((layer): LayerNodeConfig => {
    if (layer.type === 'group') {
      return {
        ...layer,
        children: layer.children.map((child): LayerNodeConfig => {
          if ((child.type === 'surface' || child.type === 'base') && child.id === layerId) {
            return {
              ...child,
              colors: { ...(child.colors ?? { primary: 'B', secondary: 'auto' }), ...colorUpdate },
            }
          }
          return child
        }),
      }
    }
    if ((layer.type === 'surface' || layer.type === 'base') && layer.id === layerId) {
      return {
        ...layer,
        colors: { ...(layer.colors ?? { primary: 'B', secondary: 'auto' }), ...colorUpdate },
      }
    }
    return layer
  })
}

export const useHeroColorSync = (options: UseHeroColorSyncOptions): void => {
  const {
    heroViewRepository,
    heroColors,
    heroThumbnails,
    isLoadingFromConfig,
    selectCanvasLayer,
  } = options

  // Color watchers: per-surface colors (primary/secondary) are written to layer.colors.
  // Global semanticContext is written to config.colors (still used for context-based color resolution).
  watch(heroColors.backgroundColorKey1, (newValue) => {
    if (isLoadingFromConfig.value) return
    const config = heroViewRepository.get()
    const updatedLayers = updateSurfaceLayerColors(config.layers, 'background', { primary: newValue as HeroPrimitiveKey | 'auto' })
    heroViewRepository.set({ ...config, layers: updatedLayers })
  })

  watch(heroColors.backgroundColorKey2, (newValue) => {
    if (isLoadingFromConfig.value) return
    const config = heroViewRepository.get()
    const updatedLayers = updateSurfaceLayerColors(config.layers, 'background', { secondary: newValue as HeroPrimitiveKey | 'auto' })
    heroViewRepository.set({ ...config, layers: updatedLayers })
  })

  watch(heroColors.maskColorKey1, (newValue) => {
    if (isLoadingFromConfig.value) return
    const config = heroViewRepository.get()
    const updatedLayers = updateSurfaceLayerColors(config.layers, 'surface-mask', { primary: newValue as HeroPrimitiveKey | 'auto' })
    heroViewRepository.set({ ...config, layers: updatedLayers })
  })

  watch(heroColors.maskColorKey2, (newValue) => {
    if (isLoadingFromConfig.value) return
    const config = heroViewRepository.get()
    const updatedLayers = updateSurfaceLayerColors(config.layers, 'surface-mask', { secondary: newValue as HeroPrimitiveKey | 'auto' })
    heroViewRepository.set({ ...config, layers: updatedLayers })
  })

  watch(heroColors.maskSemanticContext, (newValue) => {
    if (isLoadingFromConfig.value) return
    const config = heroViewRepository.get()
    heroViewRepository.set({
      ...config,
      colors: {
        ...config.colors,
        semanticContext: newValue,
      },
    })
  })

  // Sync activeSection to layer selection for proper surface targeting
  watch(heroThumbnails.activeSection, (section) => {
    if (!section) return
    // Map section to layer ID
    const sectionToLayerId: Record<string, string> = {
      'background': 'background',
      'clip-group-surface': 'surface-mask',
    }
    const layerId = sectionToLayerId[section]
    if (layerId) {
      selectCanvasLayer(layerId)
    }
  })
}
