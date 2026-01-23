/**
 * useHeroSurfaceParams
 *
 * マスク形状・サーフェスパラメータの管理を担当するcomposable
 * - customMaskShapeParams: マスク形状パラメータ
 * - customSurfaceParams: マスクサーフェスパラメータ
 * - customBackgroundSurfaceParams: 背景サーフェスパラメータ
 * - 各種スキーマの派生
 */

import { computed, type ComputedRef, type ShallowRef, type Ref } from 'vue'
import {
  MaskShapeSchemas,
  SurfaceSchemas,
  type RGBA,
  type SurfacePresetParams,
} from '@practice/texture'
import type { ObjectSchema } from '@practice/schema'
import {
  type HeroViewConfig,
  type HeroViewRepository,
  type LayerNodeConfig,
  type GroupLayerNodeConfig,
  type MaskProcessorConfig,
  type ProcessorNodeConfig,
  type NormalizedMaskConfig,
  type NormalizedSurfaceConfig,
  type SurfaceLayerNodeConfig,
  toCustomMaskShapeParams,
  fromCustomMaskShapeParams,
  toCustomSurfaceParams,
  toCustomBackgroundSurfaceParams,
  fromCustomSurfaceParams,
  syncBackgroundSurfaceParams,
  syncMaskSurfaceParams,
  normalizeMaskConfig,
  normalizeSurfaceConfig,
  $PropertyValue,
  findLayerInTree,
  isSurfaceLayerConfig,
  getSurfaceAsNormalized,
  denormalizeSurfaceConfig,
} from '@practice/section-visual'
// Internal import for denormalize function (not part of public API)
import { getMaskAsNormalized, denormalizeMaskConfig } from '@practice/section-visual'

import type {
  CustomMaskShapeParams,
  CustomSurfaceParams,
  CustomBackgroundSurfaceParams,
  MidgroundSurfacePreset,
} from './useHeroScene'

/**
 * Check if a normalized mask config has any RangeExpr values
 * (timeline-driven params can't be synced to UI)
 */
function hasMaskRangeValues(config: NormalizedMaskConfig): boolean {
  return Object.values(config.params).some((prop) => $PropertyValue.isRange(prop))
}

/**
 * Check if a normalized surface config has any RangeExpr values
 * (timeline-driven params can't be synced to UI)
 */
function hasSurfaceRangeValues(config: NormalizedSurfaceConfig): boolean {
  return Object.values(config.params).some((prop) => $PropertyValue.isRange(prop))
}

// Layer ID for background
const BASE_LAYER_ID = 'background'

export interface UseHeroSurfaceParamsOptions {
  repoConfig: ShallowRef<HeroViewConfig>
  heroViewRepository: HeroViewRepository
  selectedLayerId: Ref<string | null>
  textureColor1: ComputedRef<RGBA>
  textureColor2: ComputedRef<RGBA>
  midgroundTextureColor1: ComputedRef<RGBA>
  midgroundTextureColor2: ComputedRef<RGBA>
}

export interface UseHeroSurfaceParamsReturn {
  customMaskShapeParams: ComputedRef<CustomMaskShapeParams | null> & { value: CustomMaskShapeParams | null }
  customSurfaceParams: ComputedRef<CustomSurfaceParams | null> & { value: CustomSurfaceParams | null }
  customBackgroundSurfaceParams: ComputedRef<CustomBackgroundSurfaceParams | null> & { value: CustomBackgroundSurfaceParams | null }
  currentMaskShapeSchema: ComputedRef<ObjectSchema | null>
  currentSurfaceSchema: ComputedRef<ObjectSchema | null>
  currentBackgroundSurfaceSchema: ComputedRef<ObjectSchema | null>
  extractSurfaceParams: (preset: MidgroundSurfacePreset, colorA: RGBA, colorB: RGBA) => CustomSurfaceParams
  extractBackgroundSurfaceParams: (params: SurfacePresetParams, colorA: RGBA, colorB: RGBA) => CustomBackgroundSurfaceParams
}

// Helper to find processor with mask modifier in layers (including groups)
const findProcessorWithMask = (layers: LayerNodeConfig[]): ProcessorNodeConfig | null => {
  for (const layer of layers) {
    if (layer.type === 'processor') {
      const maskModifier = layer.modifiers.find((m): m is MaskProcessorConfig => m.type === 'mask')
      if (maskModifier) {
        return layer
      }
    }
    if (layer.type === 'group') {
      const found = findProcessorWithMask((layer as GroupLayerNodeConfig).children)
      if (found) return found
    }
  }
  return null
}

export const useHeroSurfaceParams = (
  options: UseHeroSurfaceParamsOptions
): UseHeroSurfaceParamsReturn => {
  const {
    repoConfig,
    heroViewRepository,
    selectedLayerId,
    textureColor1,
    textureColor2,
    midgroundTextureColor1,
    midgroundTextureColor2,
  } = options

  const extractSurfaceParams = (preset: MidgroundSurfacePreset, colorA: RGBA, colorB: RGBA): CustomSurfaceParams => {
    return toCustomSurfaceParams(preset.params, colorA, colorB)
  }

  const extractBackgroundSurfaceParams = (params: SurfacePresetParams, colorA: RGBA, colorB: RGBA): CustomBackgroundSurfaceParams => {
    return toCustomBackgroundSurfaceParams(params, colorA, colorB)
  }

  // Current custom params (derived from Repository via repoConfig)
  const customMaskShapeParams = computed({
    get: (): CustomMaskShapeParams | null => {
      const config = repoConfig.value
      if (!config) return null
      const processor = findProcessorWithMask(config.layers)
      if (!processor) return null
      const maskModifier = processor.modifiers.find((m): m is MaskProcessorConfig => m.type === 'mask')
      if (!maskModifier) return null
      // Normalize first (ensures consistent format), then extract static values for UI params
      const normalizedMask = getMaskAsNormalized(maskModifier.shape)
      // Skip if config has RangeExpr values (timeline-driven params can't be synced to UI)
      if (hasMaskRangeValues(normalizedMask)) {
        return null
      }
      const staticMask = denormalizeMaskConfig(normalizedMask)
      return toCustomMaskShapeParams(staticMask)
    },
    set: (val: CustomMaskShapeParams | null) => {
      if (val === null) return
      const config = repoConfig.value
      if (!config) return
      const processor = findProcessorWithMask(config.layers)
      if (!processor) return
      const maskModifierIndex = processor.modifiers.findIndex((m): m is MaskProcessorConfig => m.type === 'mask')
      if (maskModifierIndex === -1) return
      const newModifiers = [...processor.modifiers]
      const existingMask = newModifiers[maskModifierIndex] as MaskProcessorConfig
      // Convert legacy format to NormalizedMaskConfig
      newModifiers[maskModifierIndex] = {
        ...existingMask,
        shape: normalizeMaskConfig(fromCustomMaskShapeParams(val)),
      }
      heroViewRepository.updateLayer(processor.id, { modifiers: newModifiers } as Partial<ProcessorNodeConfig>)
    },
  })

  const customSurfaceParams = computed({
    get: (): CustomSurfaceParams | null => {
      const config = repoConfig.value
      if (!config) return null

      // If a layer is selected, try to get surface params from that layer
      if (selectedLayerId.value) {
        const selectedLayer = findLayerInTree(config.layers, selectedLayerId.value)
        if (selectedLayer && isSurfaceLayerConfig(selectedLayer)) {
          const surfaceLayer = selectedLayer as SurfaceLayerNodeConfig
          // Image type is handled separately
          if (surfaceLayer.surface.id === 'image') {
            return null
          }
          // Normalize and extract params
          const normalizedSurface = getSurfaceAsNormalized(surfaceLayer.surface)
          // Skip if config has binding values (timeline-driven params can't be synced to UI)
          if (hasSurfaceRangeValues(normalizedSurface)) {
            return null
          }
          const staticSurface = denormalizeSurfaceConfig(normalizedSurface)
          return toCustomSurfaceParams(staticSurface, midgroundTextureColor1.value, midgroundTextureColor2.value)
        }
      }

      // Fallback: use syncMaskSurfaceParams for default behavior
      const result = syncMaskSurfaceParams(config, midgroundTextureColor1.value, midgroundTextureColor2.value)
      return result.surfaceParams
    },
    set: (val: CustomSurfaceParams | null) => {
      if (val === null) return
      const targetLayerId = selectedLayerId.value ?? 'surface-mask'
      // Convert legacy format to NormalizedSurfaceConfig
      heroViewRepository.updateLayer(targetLayerId, { surface: normalizeSurfaceConfig(fromCustomSurfaceParams(val)) })
    },
  })

  const customBackgroundSurfaceParams = computed({
    get: (): CustomBackgroundSurfaceParams | null => {
      const result = syncBackgroundSurfaceParams(repoConfig.value, textureColor1.value, textureColor2.value)
      return result.surfaceParams
    },
    set: (val: CustomBackgroundSurfaceParams | null) => {
      if (val === null) return
      // Convert legacy format to NormalizedSurfaceConfig
      heroViewRepository.updateLayer(BASE_LAYER_ID, { surface: normalizeSurfaceConfig(fromCustomSurfaceParams(val)) })
    },
  })

  // Current schema for UI rendering
  const currentMaskShapeSchema = computed(() => {
    if (!customMaskShapeParams.value) return null
    return MaskShapeSchemas[customMaskShapeParams.value.id] as ObjectSchema
  })

  const currentSurfaceSchema = computed(() => {
    if (!customSurfaceParams.value) return null
    return SurfaceSchemas[customSurfaceParams.value.id] as ObjectSchema
  })

  const currentBackgroundSurfaceSchema = computed(() => {
    if (!customBackgroundSurfaceParams.value) return null
    return SurfaceSchemas[customBackgroundSurfaceParams.value.id] as ObjectSchema
  })

  return {
    customMaskShapeParams,
    customSurfaceParams,
    customBackgroundSurfaceParams,
    currentMaskShapeSchema,
    currentSurfaceSchema,
    currentBackgroundSurfaceSchema,
    extractSurfaceParams,
    extractBackgroundSurfaceParams,
  }
}
