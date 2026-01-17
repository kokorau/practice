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
  toCustomMaskShapeParams,
  fromCustomMaskShapeParams,
  toCustomSurfaceParams,
  toCustomBackgroundSurfaceParams,
  fromCustomSurfaceParams,
  syncBackgroundSurfaceParams,
  syncMaskSurfaceParams,
} from '../../modules/HeroScene'
import type {
  CustomMaskShapeParams,
  CustomSurfaceParams,
  CustomBackgroundSurfaceParams,
  MidgroundSurfacePreset,
} from './useHeroScene'

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
      return toCustomMaskShapeParams(maskModifier.shape)
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
      newModifiers[maskModifierIndex] = {
        ...existingMask,
        shape: fromCustomMaskShapeParams(val),
      }
      heroViewRepository.updateLayer(processor.id, { modifiers: newModifiers } as Partial<ProcessorNodeConfig>)
    },
  })

  const customSurfaceParams = computed({
    get: (): CustomSurfaceParams | null => {
      const result = syncMaskSurfaceParams(repoConfig.value, midgroundTextureColor1.value, midgroundTextureColor2.value)
      return result.surfaceParams
    },
    set: (val: CustomSurfaceParams | null) => {
      if (val === null) return
      const targetLayerId = selectedLayerId.value ?? 'surface-mask'
      heroViewRepository.updateLayer(targetLayerId, { surface: fromCustomSurfaceParams(val) })
    },
  })

  const customBackgroundSurfaceParams = computed({
    get: (): CustomBackgroundSurfaceParams | null => {
      const result = syncBackgroundSurfaceParams(repoConfig.value, textureColor1.value, textureColor2.value)
      return result.surfaceParams
    },
    set: (val: CustomBackgroundSurfaceParams | null) => {
      if (val === null) return
      heroViewRepository.updateLayer(BASE_LAYER_ID, { surface: fromCustomSurfaceParams(val) })
    },
  })

  // Current schema for UI rendering
  const currentMaskShapeSchema = computed(() => {
    if (!customMaskShapeParams.value) return null
    return MaskShapeSchemas[customMaskShapeParams.value.type] as ObjectSchema
  })

  const currentSurfaceSchema = computed(() => {
    if (!customSurfaceParams.value) return null
    return SurfaceSchemas[customSurfaceParams.value.type] as ObjectSchema
  })

  const currentBackgroundSurfaceSchema = computed(() => {
    if (!customBackgroundSurfaceParams.value) return null
    return SurfaceSchemas[customBackgroundSurfaceParams.value.type] as ObjectSchema
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
