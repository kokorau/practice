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
  type MaskProcessorConfig,
  type MaskShapeConfig as HeroMaskShapeConfig,
  type ForegroundLayerConfig,
  type HeroViewRepository,
  migrateHeroViewConfig,
  createDefaultColorsConfig,
  DEFAULT_LAYER_BACKGROUND_COLORS,
  DEFAULT_LAYER_MASK_COLORS,
  findSurfacePresetIndex,
  findMaskPatternIndex,
  isSingleEffectConfig,
  isLegacyEffectFilterConfig,
  getEffectsAsNormalized,
} from '../../modules/HeroScene'
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
      // Migrate legacy configs before applying
      const migratedConfig = migrateHeroViewConfig(config)
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

      // Read colors from surface layers (migration ensures colors always exist)
      const configColors = migratedConfig.colors ?? createDefaultColorsConfig()
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
        if (bgSurface.type === 'image') {
          await heroImages.restoreBackgroundImage(bgSurface.imageId)
        }
        const bgPresetIndex = findSurfacePresetIndex(bgSurface, surfacePresets)
        selectedBackgroundIndex.value = bgPresetIndex ?? 0

        // Load effect filters (supports both legacy and new formats)
        const effectFilters = (backgroundSurfaceLayer.filters ?? []).filter((p) => p.type === 'effect')
        if (effectFilters.length > 0) {
          // Collect all effects as SingleEffectConfig[]
          const pipeline: SingleEffectConfig[] = []
          for (const filter of effectFilters) {
            if (isSingleEffectConfig(filter)) {
              // New format: SingleEffectConfig
              pipeline.push(filter)
            } else if (isLegacyEffectFilterConfig(filter)) {
              // Legacy format: EffectFilterConfig - convert to SingleEffectConfig[]
              pipeline.push(...getEffectsAsNormalized(filter))
            }
          }
          if (pipeline.length > 0) {
            heroFilters.effectManager.setEffectPipeline(LAYER_IDS.BASE, pipeline)
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
        for (const layer of migratedConfig.layers) {
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
        selectedMaskIndex.value = findMaskPatternIndex(maskShape, heroThumbnails.maskPatterns)
      } else {
        selectedMaskIndex.value = null
      }

      if (maskSurfaceLayer) {
        const maskSurface = maskSurfaceLayer.surface
        if (maskSurface.type === 'image') {
          await heroImages.restoreMaskImage(maskSurface.imageId)
        }
        const midgroundPresetIndex = findSurfacePresetIndex(maskSurface, heroThumbnails.midgroundTexturePatterns)
        selectedMidgroundTextureIndex.value = midgroundPresetIndex ?? 0

        // Load mask effect filters (supports both legacy and new formats)
        const maskEffectFilters = (maskSurfaceLayer.filters ?? []).filter((p) => p.type === 'effect')
        if (maskEffectFilters.length > 0) {
          // Collect all effects as SingleEffectConfig[]
          const pipeline: SingleEffectConfig[] = []
          for (const filter of maskEffectFilters) {
            if (isSingleEffectConfig(filter)) {
              // New format: SingleEffectConfig
              pipeline.push(filter)
            } else if (isLegacyEffectFilterConfig(filter)) {
              // Legacy format: EffectFilterConfig - convert to SingleEffectConfig[]
              pipeline.push(...getEffectsAsNormalized(filter))
            }
          }
          if (pipeline.length > 0) {
            heroFilters.effectManager.setEffectPipeline(LAYER_IDS.MASK, pipeline)
          }
        }
      }

      foregroundConfig.value = migratedConfig.foreground

      await render()
    } finally {
      isLoadingFromConfig.value = false
    }
  }

  return {
    fromHeroViewConfig,
  }
}
