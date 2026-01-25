/**
 * useHeroPatternPresets
 *
 * パターンプリセットの初期化・更新ロジックを管理するcomposable
 * - initMaskShapeParamsFromPreset: マスク形状パラメータの初期化
 * - initSurfaceParamsFromPreset: マスクサーフェスパラメータの初期化
 * - initBackgroundSurfaceParamsFromPreset: 背景サーフェスパラメータの初期化
 * - updateMaskShapeParams, updateSurfaceParams, updateBackgroundSurfaceParams: パラメータ更新
 */

import type { ComputedRef, Ref } from 'vue'
import {
  getSurfacePresets,
  type RGBA,
  type MaskPattern,
} from '@practice/texture'
import {
  type HeroViewRepository,
  type NormalizedSurfaceConfig,
  type PropertyValue,
  type SurfaceUsecase,
  type SurfaceParamsUpdate,
  type MaskShapeParamsUpdate,
  toCustomMaskShapeParams,
  toCustomSurfaceParams,
  toCustomBackgroundSurfaceParams,
  $PropertyValue,
} from '@practice/section-visual'

/**
 * Convert raw param values to PropertyValue format
 */
function toPropertyValueParams(
  params: Record<string, string | number | boolean | undefined>
): Record<string, PropertyValue> {
  const result: Record<string, PropertyValue> = {}
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      result[key] = $PropertyValue.static(value)
    }
  }
  return result
}
import type {
  MidgroundSurfacePreset,
} from './useHeroScene'
import type { UseHeroSurfaceParamsReturn } from './useHeroSurfaceParams'

// Layer ID for background
const BASE_LAYER_ID = 'background'

export interface UseHeroPatternPresetsOptions {
  heroViewRepository: HeroViewRepository
  surfaceUsecase: SurfaceUsecase
  midgroundTexturePatterns: MidgroundSurfacePreset[]
  maskPatterns: MaskPattern[]
  surfaceParams: UseHeroSurfaceParamsReturn
  selectedBackgroundIndex: ComputedRef<number> & { value: number }
  selectedMaskIndex: ComputedRef<number | null> & { value: number | null }
  selectedMidgroundTextureIndex: ComputedRef<number> & { value: number }
  selectedLayerId: ComputedRef<string | null> | Ref<string | null>
  textureColor1: ComputedRef<RGBA>
  textureColor2: ComputedRef<RGBA>
  midgroundTextureColor1: ComputedRef<RGBA>
  midgroundTextureColor2: ComputedRef<RGBA>
}

export interface UseHeroPatternPresetsReturn {
  surfacePresets: ReturnType<typeof getSurfacePresets>
  setBaseSurface: (surface: NormalizedSurfaceConfig) => void
  initMaskShapeParamsFromPreset: () => void
  initSurfaceParamsFromPreset: () => void
  initBackgroundSurfaceParamsFromPreset: () => void
  updateMaskShapeParams: (updates: Record<string, unknown>) => void
  updateSurfaceParams: (updates: Record<string, unknown>) => void
  updateBackgroundSurfaceParams: (updates: Record<string, unknown>) => void
}

export const useHeroPatternPresets = (
  options: UseHeroPatternPresetsOptions
): UseHeroPatternPresetsReturn => {
  const {
    heroViewRepository,
    surfaceUsecase,
    midgroundTexturePatterns,
    maskPatterns,
    surfaceParams,
    selectedBackgroundIndex,
    selectedMaskIndex,
    selectedMidgroundTextureIndex,
    selectedLayerId,
  } = options

  const {
    customMaskShapeParams,
    customSurfaceParams,
    customBackgroundSurfaceParams,
    processorLayerId,
  } = surfaceParams

  const surfacePresets = getSurfacePresets()

  const setBaseSurface = (surface: NormalizedSurfaceConfig) => {
    heroViewRepository.updateLayer(BASE_LAYER_ID, { surface })
  }

  const initMaskShapeParamsFromPreset = () => {
    const idx = selectedMaskIndex.value
    if (idx === null) return
    const pattern = maskPatterns[idx]
    if (pattern) {
      // Type assertion needed due to monorepo type resolution
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      customMaskShapeParams.value = toCustomMaskShapeParams(pattern.maskConfig) as any
    }
  }

  const initSurfaceParamsFromPreset = () => {
    const idx = selectedMidgroundTextureIndex.value
    const preset = midgroundTexturePatterns[idx]
    if (preset) {
      // Convert GenericSurfaceParams to SurfaceConfig format (type -> id mapping)
      // Cast needed since preset.params is GenericSurfaceParams (string) but toCustomSurfaceParams expects SurfaceConfig union
      customSurfaceParams.value = toCustomSurfaceParams(preset.params as Parameters<typeof toCustomSurfaceParams>[0])
    }
  }

  const initBackgroundSurfaceParamsFromPreset = () => {
    const idx = selectedBackgroundIndex.value
    const preset = surfacePresets[idx]
    if (preset) {
      // Convert GenericSurfaceParams to CustomBackgroundSurfaceParams format
      // Cast needed since preset.params is GenericSurfaceParams (string) but toCustomBackgroundSurfaceParams expects SurfaceConfig union
      const params = toCustomBackgroundSurfaceParams(preset.params as Parameters<typeof toCustomBackgroundSurfaceParams>[0])
      if (params.id === 'solid') {
        setBaseSurface({ id: 'solid', params: {} })
      } else if (params.id === 'stripe') {
        setBaseSurface({ id: 'stripe', params: toPropertyValueParams({ width1: params.width1 as number, width2: params.width2 as number, angle: params.angle as number }) })
      } else if (params.id === 'grid') {
        setBaseSurface({ id: 'grid', params: toPropertyValueParams({ lineWidth: params.lineWidth as number, cellSize: params.cellSize as number }) })
      } else if (params.id === 'polkaDot') {
        setBaseSurface({ id: 'polkaDot', params: toPropertyValueParams({ dotRadius: params.dotRadius as number, spacing: params.spacing as number, rowOffset: params.rowOffset as number }) })
      } else if (params.id === 'checker') {
        setBaseSurface({ id: 'checker', params: toPropertyValueParams({ cellSize: params.cellSize as number, angle: params.angle as number }) })
      } else if (params.id === 'linearGradient') {
        setBaseSurface({ id: 'linearGradient', params: toPropertyValueParams({ angle: params.angle as number, centerX: params.centerX as number, centerY: params.centerY as number }) })
      } else {
        // For all other surface types, use params directly
        customBackgroundSurfaceParams.value = params
      }
    } else {
      customBackgroundSurfaceParams.value = null
    }
  }

  const updateMaskShapeParams = (updates: Record<string, unknown>) => {
    if (!customMaskShapeParams.value) return
    const maskShapeId = customMaskShapeParams.value.id
    const procId = processorLayerId.value
    if (!procId) return
    // Delegate to SurfaceUsecase - it handles PropertyValue preservation
    surfaceUsecase.updateMaskShapeParams(procId, { id: maskShapeId, ...updates } as MaskShapeParamsUpdate)
  }

  const updateSurfaceParams = (updates: Record<string, unknown>) => {
    if (!customSurfaceParams.value) return
    const surfaceId = customSurfaceParams.value.id
    const targetLayerId = selectedLayerId.value || 'surface-mask'
    // Delegate to SurfaceUsecase - it handles layer type check and PropertyValue preservation
    surfaceUsecase.updateSurfaceParamsForLayer(targetLayerId, { id: surfaceId, ...updates } as SurfaceParamsUpdate)
  }

  const updateBackgroundSurfaceParams = (updates: Record<string, unknown>) => {
    if (!customBackgroundSurfaceParams.value) return
    const surfaceId = customBackgroundSurfaceParams.value.id
    // Delegate to SurfaceUsecase - it handles layer type check and PropertyValue preservation
    surfaceUsecase.updateSurfaceParamsForLayer(BASE_LAYER_ID, { id: surfaceId, ...updates } as SurfaceParamsUpdate)
  }

  return {
    surfacePresets,
    setBaseSurface,
    initMaskShapeParamsFromPreset,
    initSurfaceParamsFromPreset,
    initBackgroundSurfaceParamsFromPreset,
    updateMaskShapeParams,
    updateSurfaceParams,
    updateBackgroundSurfaceParams,
  }
}
