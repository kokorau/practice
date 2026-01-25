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
} from '@practice/texture'
import type { ObjectSchema } from '@practice/schema'
import {
  type HeroViewConfig,
  type SurfaceUsecase,
  syncBackgroundSurfaceParams,
  syncMaskSurfaceParams,
  syncMaskShapeParams,
  syncSurfaceParamsForLayer,
  syncRawParams,
} from '@practice/section-visual'

import type {
  CustomMaskShapeParams,
  CustomSurfaceParams,
  CustomBackgroundSurfaceParams,
} from './useHeroScene'

// Layer ID for background
const BASE_LAYER_ID = 'background'

export interface UseHeroSurfaceParamsOptions {
  repoConfig: ShallowRef<HeroViewConfig>
  surfaceUsecase: SurfaceUsecase
  selectedLayerId: Ref<string | null>
  textureColor1: ComputedRef<RGBA>
  textureColor2: ComputedRef<RGBA>
  midgroundTextureColor1: ComputedRef<RGBA>
  midgroundTextureColor2: ComputedRef<RGBA>
}

/** Raw params containing PropertyValue (static or range) - for DSL display/edit */
export type RawParams = Record<string, unknown> | null

export interface UseHeroSurfaceParamsReturn {
  customMaskShapeParams: ComputedRef<CustomMaskShapeParams | null> & { value: CustomMaskShapeParams | null }
  customSurfaceParams: ComputedRef<CustomSurfaceParams | null> & { value: CustomSurfaceParams | null }
  customBackgroundSurfaceParams: ComputedRef<CustomBackgroundSurfaceParams | null> & { value: CustomBackgroundSurfaceParams | null }
  /** Raw params with PropertyValue preserved (for DSL display) */
  rawMaskShapeParams: ComputedRef<RawParams>
  rawSurfaceParams: ComputedRef<RawParams>
  rawBackgroundSurfaceParams: ComputedRef<RawParams>
  /** ID of the processor layer containing the mask modifier */
  processorLayerId: ComputedRef<string | null>
  currentMaskShapeSchema: ComputedRef<ObjectSchema | null>
  currentSurfaceSchema: ComputedRef<ObjectSchema | null>
  currentBackgroundSurfaceSchema: ComputedRef<ObjectSchema | null>
}

export const useHeroSurfaceParams = (
  options: UseHeroSurfaceParamsOptions
): UseHeroSurfaceParamsReturn => {
  const {
    repoConfig,
    surfaceUsecase,
    selectedLayerId,
    textureColor1,
    textureColor2,
    midgroundTextureColor1,
    midgroundTextureColor2,
  } = options

  // Current custom params (derived from Repository via repoConfig)
  const customMaskShapeParams = computed({
    get: (): CustomMaskShapeParams | null => {
      const config = repoConfig.value
      if (!config) return null
      const result = syncMaskShapeParams(config)
      // Type assertion needed due to monorepo type resolution
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return result.maskShapeParams as any
    },
    set: (val: CustomMaskShapeParams | null) => {
      if (val === null) return
      surfaceUsecase.setMaskShapeFromCustomParams(val)
    },
  })

  const customSurfaceParams = computed({
    get: (): CustomSurfaceParams | null => {
      const config = repoConfig.value
      if (!config) return null

      // If a layer is selected, try to get surface params from that layer
      if (selectedLayerId.value) {
        const result = syncSurfaceParamsForLayer(config, selectedLayerId.value)
        if (result.surfaceParams) {
          return result.surfaceParams
        }
      }

      // Fallback: use syncMaskSurfaceParams for default behavior
      const result = syncMaskSurfaceParams(config, midgroundTextureColor1.value, midgroundTextureColor2.value)
      return result.surfaceParams
    },
    set: (val: CustomSurfaceParams | null) => {
      if (val === null) return
      const targetLayerId = selectedLayerId.value ?? 'surface-mask'
      surfaceUsecase.setSurfaceFromCustomParams(targetLayerId, val)
    },
  })

  const customBackgroundSurfaceParams = computed({
    get: (): CustomBackgroundSurfaceParams | null => {
      const result = syncBackgroundSurfaceParams(repoConfig.value, textureColor1.value, textureColor2.value)
      return result.surfaceParams
    },
    set: (val: CustomBackgroundSurfaceParams | null) => {
      if (val === null) return
      surfaceUsecase.setSurfaceFromCustomParams(BASE_LAYER_ID, val)
    },
  })

  // Current schema for UI rendering
  const currentMaskShapeSchema = computed(() => {
    if (!customMaskShapeParams.value) return null
    const id = customMaskShapeParams.value.id
    return (MaskShapeSchemas as Record<string, ObjectSchema>)[id] ?? null
  })

  const currentSurfaceSchema = computed(() => {
    if (!customSurfaceParams.value) return null
    const id = customSurfaceParams.value.id
    return (SurfaceSchemas as Record<string, ObjectSchema>)[id] ?? null
  })

  const currentBackgroundSurfaceSchema = computed(() => {
    if (!customBackgroundSurfaceParams.value) return null
    const id = customBackgroundSurfaceParams.value.id
    return (SurfaceSchemas as Record<string, ObjectSchema>)[id] ?? null
  })

  // Processor layer ID (for mask shape updates)
  const processorLayerId = computed((): string | null => {
    const config = repoConfig.value
    if (!config) return null
    const result = syncMaskShapeParams(config)
    return result.processorId
  })

  // Raw params with PropertyValue preserved (for DSL display/edit)
  const rawMaskShapeParams = computed((): RawParams => {
    const config = repoConfig.value
    if (!config) return null
    const result = syncRawParams(config)
    return result.maskShape
  })

  const rawSurfaceParams = computed((): RawParams => {
    const config = repoConfig.value
    if (!config) return null

    if (selectedLayerId.value) {
      const result = syncSurfaceParamsForLayer(config, selectedLayerId.value)
      return result.rawParams
    }
    return null
  })

  const rawBackgroundSurfaceParams = computed((): RawParams => {
    const config = repoConfig.value
    if (!config) return null
    const result = syncRawParams(config)
    return result.backgroundSurface
  })

  return {
    customMaskShapeParams,
    customSurfaceParams,
    customBackgroundSurfaceParams,
    rawMaskShapeParams,
    rawSurfaceParams,
    rawBackgroundSurfaceParams,
    processorLayerId,
    currentMaskShapeSchema,
    currentSurfaceSchema,
    currentBackgroundSurfaceSchema,
  }
}
