/**
 * useHeroConfigLoader
 *
 * HeroViewConfigの読み込み・マイグレーションロジックを管理するcomposable
 * - fromHeroViewConfig: 設定からの状態復元
 * - isLoadingFromConfig: 読み込み中フラグ（他のウォッチャーとの連携用）
 */

import { type Ref, type ShallowRef } from 'vue'
import type { SurfacePreset } from '@practice/texture'
import {
  type HeroViewConfig,
  type HeroSceneConfig,
  type HtmlLayer,
  type SingleEffectConfig,
  type SurfaceLayerNodeConfig,
  type BaseLayerNodeConfig,
  type GroupLayerNodeConfig,
  type HeroViewRepository,
  findSurfacePresetIndex,
  isSingleEffectConfig,
  migrateToNormalizedFormat,
} from '@practice/section-visual'

// Internal imports for normalization/denormalization functions
import {
  getSurfaceAsNormalized,
  safeDenormalizeSurfaceConfig,
} from '@practice/section-visual'
import type { UseHeroFiltersReturn } from './useHeroFilters'
import type { UseHeroThumbnailsReturn } from './useHeroThumbnails'

// Layer IDs constant
export const LAYER_IDS = {
  BASE: 'background',
  MASK: 'surface-mask',
} as const

/** @internal Editor state for viewport and html layer config */
interface HeroSceneEditorState {
  config: HeroSceneConfig
  htmlLayer: HtmlLayer
}

export interface UseHeroConfigLoaderOptions {
  heroViewRepository: HeroViewRepository
  editorState: ShallowRef<HeroSceneEditorState>
  heroFilters: UseHeroFiltersReturn
  heroThumbnails: UseHeroThumbnailsReturn
  selectedBackgroundIndex: Ref<number>
  selectedMidgroundTextureIndex: Ref<number>
  surfacePresets: Ref<SurfacePreset[]>
  render: () => Promise<void>
  isLoadingFromConfig: Ref<boolean>
}

export interface UseHeroConfigLoaderReturn {
  fromHeroViewConfig: (config: HeroViewConfig) => Promise<void>
}

export const useHeroConfigLoader = (
  options: UseHeroConfigLoaderOptions
): UseHeroConfigLoaderReturn => {
  const {
    heroViewRepository,
    editorState,
    heroFilters,
    heroThumbnails,
    selectedBackgroundIndex,
    selectedMidgroundTextureIndex,
    surfacePresets,
    render,
    isLoadingFromConfig,
  } = options

  const fromHeroViewConfig = async (config: HeroViewConfig) => {
    isLoadingFromConfig.value = true

    try {
      // Migrate legacy format to normalized format (converts raw effect params to PropertyValue)
      const migratedConfig = migrateToNormalizedFormat(config)
      heroViewRepository.set(migratedConfig)

      editorState.value = {
        ...editorState.value,
        config: {
          ...editorState.value.config,
          width: migratedConfig.viewport.width,
          height: migratedConfig.viewport.height,
        },
      }

      // Find background surface layer (inside background-group or legacy base layer)
      let backgroundSurfaceLayer: SurfaceLayerNodeConfig | BaseLayerNodeConfig | undefined
      const backgroundGroup = migratedConfig.layers.find(l => l.id === 'background-group' && l.type === 'group')
      if (backgroundGroup && backgroundGroup.type === 'group') {
        backgroundSurfaceLayer = backgroundGroup.children.find((c): c is SurfaceLayerNodeConfig => c.id === 'background' && c.type === 'surface')
      }
      // Fallback: check for legacy base layer
      if (!backgroundSurfaceLayer) {
        backgroundSurfaceLayer = migratedConfig.layers.find((l): l is BaseLayerNodeConfig => l.type === 'base')
      }

      // Find mask surface layer (inside clip-group)
      let maskSurfaceLayer: SurfaceLayerNodeConfig | undefined
      const clipGroup = migratedConfig.layers.find(l => l.id === 'clip-group' && l.type === 'group')
      if (clipGroup && clipGroup.type === 'group') {
        maskSurfaceLayer = clipGroup.children.find((c): c is SurfaceLayerNodeConfig => c.id === 'surface-mask' && c.type === 'surface')
      }
      // Fallback: find first surface layer not in background-group
      if (!maskSurfaceLayer) {
        for (const layer of migratedConfig.layers) {
          if (layer.type === 'surface' && layer.id !== 'background') {
            maskSurfaceLayer = layer
            break
          }
          if (layer.type === 'group' && layer.id !== 'background-group' && layer.children) {
            const nested = layer.children.find((c): c is SurfaceLayerNodeConfig => c.type === 'surface')
            if (nested) {
              maskSurfaceLayer = nested
              break
            }
          }
        }
      }

      // Note: Color refs are now computed from repository (SSOT), so we don't need to manually sync them.
      // heroColors.backgroundColorKey1, backgroundColorKey2, maskColorKey1, maskColorKey2, maskSemanticContext
      // are all derived from heroViewRepository.get() via computed getters.

      if (backgroundSurfaceLayer) {
        const bgSurface = backgroundSurfaceLayer.surface
        const normalizedBgSurface = getSurfaceAsNormalized(bgSurface)
        const bgPresetIndex = findSurfacePresetIndex(safeDenormalizeSurfaceConfig(normalizedBgSurface), surfacePresets.value)
        selectedBackgroundIndex.value = bgPresetIndex ?? 0
      }

      // Load background effects from processor (background-group or root-level)
      const bgGroup = migratedConfig.layers.find((l) => l.type === 'group' && l.id === 'background-group') as GroupLayerNodeConfig | undefined
      if (bgGroup) {
        for (const child of bgGroup.children) {
          if (child.type === 'processor') {
            const effectFilters = child.modifiers.filter((m): m is SingleEffectConfig => isSingleEffectConfig(m))
            if (effectFilters.length > 0) {
              heroFilters.effectManager.setEffectPipeline(LAYER_IDS.BASE, effectFilters)
              break
            }
          }
        }
      }

      // NOTE: selectedMaskIndex is UI state that is set when user selects a preset.
      // We preserve it here - it should not be reset when loading config.

      if (maskSurfaceLayer) {
        const maskSurface = maskSurfaceLayer.surface
        const normalizedMaskSurface = getSurfaceAsNormalized(maskSurface)
        const midgroundPresetIndex = findSurfacePresetIndex(safeDenormalizeSurfaceConfig(normalizedMaskSurface), heroThumbnails.midgroundTexturePatterns.value)
        selectedMidgroundTextureIndex.value = midgroundPresetIndex ?? 0
      }

      // Load mask effects from processor (clip-group)
      if (clipGroup && clipGroup.type === 'group') {
        for (const child of clipGroup.children) {
          if (child.type === 'processor') {
            const effectFilters = child.modifiers.filter((m): m is SingleEffectConfig => isSingleEffectConfig(m))
            if (effectFilters.length > 0) {
              heroFilters.effectManager.setEffectPipeline(LAYER_IDS.MASK, effectFilters)
              break
            }
          }
        }
      }

      // Note: foregroundConfig is now computed from repository (SSOT), so we don't need to manually sync it.
      // foregroundConfig is derived from heroViewRepository.get().foreground via computed getter.

      await render()
    } finally {
      isLoadingFromConfig.value = false
    }
  }

  return {
    fromHeroViewConfig,
  }
}
