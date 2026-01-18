/**
 * useHeroConfigLoader
 *
 * HeroViewConfigの読み込み・マイグレーションロジックを管理するcomposable
 * - fromHeroViewConfig: 設定からの状態復元
 * - isLoadingFromConfig: 読み込み中フラグ（他のウォッチャーとの連携用）
 */

import { type Ref, type ShallowRef } from 'vue'
import type { SurfacePreset } from '@practice/texture'
import type { ContextName, PrimitiveKey } from '../../modules/SemanticColorPalette/Domain'
import {
  type HeroViewConfig,
  type HeroSceneConfig,
  type HtmlLayer,
  type SingleEffectConfig,
  type SurfaceLayerNodeConfig,
  type BaseLayerNodeConfig,
  type GroupLayerNodeConfig,
  type MaskProcessorConfig,
  type NormalizedMaskConfig as HeroMaskShapeConfig,
  type ForegroundLayerConfig,
  type HeroViewRepository,
  createDefaultColorsConfig,
  DEFAULT_LAYER_BACKGROUND_COLORS,
  DEFAULT_LAYER_MASK_COLORS,
  findSurfacePresetIndex,
  findMaskPatternIndex,
  isSingleEffectConfig,
} from '../../modules/HeroScene'
// Internal imports for denormalize functions (not part of public API)
import {
  denormalizeSurfaceConfig,
  denormalizeMaskConfig,
} from '../../modules/HeroScene/Domain/HeroViewConfig'
import type { UseHeroColorsReturn } from './useHeroColors'
import type { UseHeroFiltersReturn } from './useHeroFilters'
import type { UseHeroImagesReturn } from './useHeroImages'
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
  heroColors: UseHeroColorsReturn
  heroFilters: UseHeroFiltersReturn
  heroImages: UseHeroImagesReturn
  heroThumbnails: UseHeroThumbnailsReturn
  selectedBackgroundIndex: Ref<number>
  selectedMaskIndex: Ref<number | null>
  selectedMidgroundTextureIndex: Ref<number>
  foregroundConfig: Ref<ForegroundLayerConfig>
  surfacePresets: SurfacePreset[]
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
    heroColors,
    heroFilters,
    heroImages,
    heroThumbnails,
    selectedBackgroundIndex,
    selectedMaskIndex,
    selectedMidgroundTextureIndex,
    foregroundConfig,
    surfacePresets,
    render,
    isLoadingFromConfig,
  } = options

  const fromHeroViewConfig = async (config: HeroViewConfig) => {
    isLoadingFromConfig.value = true

    try {
      heroViewRepository.set(config)

      editorState.value = {
        ...editorState.value,
        config: {
          ...editorState.value.config,
          width: config.viewport.width,
          height: config.viewport.height,
        },
      }

      // Find background surface layer (inside background-group or legacy base layer)
      let backgroundSurfaceLayer: SurfaceLayerNodeConfig | BaseLayerNodeConfig | undefined
      const backgroundGroup = config.layers.find(l => l.id === 'background-group' && l.type === 'group')
      if (backgroundGroup && backgroundGroup.type === 'group') {
        backgroundSurfaceLayer = backgroundGroup.children.find((c): c is SurfaceLayerNodeConfig => c.id === 'background' && c.type === 'surface')
      }
      // Fallback: check for legacy base layer
      if (!backgroundSurfaceLayer) {
        backgroundSurfaceLayer = config.layers.find((l): l is BaseLayerNodeConfig => l.type === 'base')
      }

      // Find mask surface layer (inside clip-group)
      let maskSurfaceLayer: SurfaceLayerNodeConfig | undefined
      const clipGroup = config.layers.find(l => l.id === 'clip-group' && l.type === 'group')
      if (clipGroup && clipGroup.type === 'group') {
        maskSurfaceLayer = clipGroup.children.find((c): c is SurfaceLayerNodeConfig => c.id === 'surface-mask' && c.type === 'surface')
      }
      // Fallback: find first surface layer not in background-group
      if (!maskSurfaceLayer) {
        for (const layer of config.layers) {
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

      // Read colors from surface layers (migration ensures colors always exist)
      const configColors = config.colors ?? createDefaultColorsConfig()
      // Background colors from layer (use defaults if missing - migration should prevent this)
      const bgColors = backgroundSurfaceLayer?.colors ?? DEFAULT_LAYER_BACKGROUND_COLORS
      heroColors.backgroundColorKey1.value = (bgColors.primary === 'auto' ? DEFAULT_LAYER_BACKGROUND_COLORS.primary : bgColors.primary) as PrimitiveKey
      heroColors.backgroundColorKey2.value = bgColors.secondary as PrimitiveKey | 'auto'
      // Mask colors from layer (use defaults if missing - migration should prevent this)
      const maskColors = maskSurfaceLayer?.colors ?? DEFAULT_LAYER_MASK_COLORS
      heroColors.maskColorKey1.value = maskColors.primary as PrimitiveKey | 'auto'
      heroColors.maskColorKey2.value = maskColors.secondary as PrimitiveKey | 'auto'
      // Semantic context from config.colors (kept at top level)
      heroColors.maskSemanticContext.value = configColors.semanticContext as ContextName

      if (backgroundSurfaceLayer) {
        const bgSurface = backgroundSurfaceLayer.surface
        if (bgSurface.id === 'image') {
          await heroImages.restoreBackgroundImage(bgSurface.params.imageId as string)
        }
        const bgPresetIndex = findSurfacePresetIndex(denormalizeSurfaceConfig(bgSurface), surfacePresets)
        selectedBackgroundIndex.value = bgPresetIndex ?? 0
      }

      // Load background effects from processor (background-group or root-level)
      const bgGroup = config.layers.find((l) => l.type === 'group' && l.id === 'background-group') as GroupLayerNodeConfig | undefined
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

      // Find mask shape from processor layer (inside clip-group or top-level)
      let maskShape: HeroMaskShapeConfig | undefined
      if (clipGroup && clipGroup.type === 'group') {
        for (const child of clipGroup.children) {
          if (child.type === 'processor') {
            const maskModifier = child.modifiers.find((m): m is MaskProcessorConfig => m.type === 'mask')
            if (maskModifier) {
              maskShape = maskModifier.shape
              break
            }
          }
        }
      }
      // Fallback: check top-level processors
      if (!maskShape) {
        for (const layer of config.layers) {
          if (layer.type === 'processor') {
            const maskModifier = layer.modifiers.find((m): m is MaskProcessorConfig => m.type === 'mask')
            if (maskModifier) {
              maskShape = maskModifier.shape
              break
            }
          }
        }
      }

      if (maskShape) {
        selectedMaskIndex.value = findMaskPatternIndex(denormalizeMaskConfig(maskShape), heroThumbnails.maskPatterns)
      } else {
        selectedMaskIndex.value = null
      }

      if (maskSurfaceLayer) {
        const maskSurface = maskSurfaceLayer.surface
        if (maskSurface.id === 'image') {
          await heroImages.restoreMaskImage(maskSurface.params.imageId as string)
        }
        const midgroundPresetIndex = findSurfacePresetIndex(denormalizeSurfaceConfig(maskSurface), heroThumbnails.midgroundTexturePatterns)
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

      foregroundConfig.value = config.foreground

      await render()
    } finally {
      isLoadingFromConfig.value = false
    }
  }

  return {
    fromHeroViewConfig,
  }
}
