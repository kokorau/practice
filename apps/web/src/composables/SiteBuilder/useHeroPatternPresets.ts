/**
 * useHeroPatternPresets
 *
 * パターンプリセットの初期化・更新ロジックを管理するcomposable
 * - initMaskShapeParamsFromPreset: マスク形状パラメータの初期化
 * - initSurfaceParamsFromPreset: マスクサーフェスパラメータの初期化
 * - initBackgroundSurfaceParamsFromPreset: 背景サーフェスパラメータの初期化
 * - updateMaskShapeParams, updateSurfaceParams, updateBackgroundSurfaceParams: パラメータ更新
 */

import type { ComputedRef } from 'vue'
import {
  getSurfacePresets,
  type RGBA,
  type MaskPattern,
  type CircleMaskShapeParams,
  type RectMaskShapeParams,
  type BlobMaskShapeParams,
  type StripeSurfaceParams,
  type GridSurfaceParams,
  type PolkaDotSurfaceParams,
  type CheckerSurfaceParams,
  type SolidSurfaceParams,
} from '@practice/texture'
import {
  type HeroViewRepository,
  type HeroSurfaceConfig,
  toCustomMaskShapeParams,
} from '../../modules/HeroScene'
import type {
  CustomMaskShapeParams,
  CustomSurfaceParams,
  GradientGrainSurfaceParams,
  MidgroundSurfacePreset,
} from './useHeroScene'
import type { UseHeroSurfaceParamsReturn } from './useHeroSurfaceParams'

// Layer ID for background
const BASE_LAYER_ID = 'background'

export interface UseHeroPatternPresetsOptions {
  heroViewRepository: HeroViewRepository
  midgroundTexturePatterns: MidgroundSurfacePreset[]
  maskPatterns: MaskPattern[]
  surfaceParams: UseHeroSurfaceParamsReturn
  selectedBackgroundIndex: ComputedRef<number> & { value: number }
  selectedMaskIndex: ComputedRef<number | null> & { value: number | null }
  selectedMidgroundTextureIndex: ComputedRef<number> & { value: number }
  textureColor1: ComputedRef<RGBA>
  textureColor2: ComputedRef<RGBA>
  midgroundTextureColor1: ComputedRef<RGBA>
  midgroundTextureColor2: ComputedRef<RGBA>
}

export interface UseHeroPatternPresetsReturn {
  surfacePresets: ReturnType<typeof getSurfacePresets>
  setBaseSurface: (surface: HeroSurfaceConfig) => void
  initMaskShapeParamsFromPreset: () => void
  initSurfaceParamsFromPreset: () => void
  initBackgroundSurfaceParamsFromPreset: () => void
  updateMaskShapeParams: (updates: Partial<CircleMaskShapeParams | RectMaskShapeParams | BlobMaskShapeParams>) => void
  updateSurfaceParams: (updates: Partial<StripeSurfaceParams | GridSurfaceParams | PolkaDotSurfaceParams>) => void
  updateBackgroundSurfaceParams: (updates: Partial<StripeSurfaceParams | GridSurfaceParams | PolkaDotSurfaceParams | CheckerSurfaceParams | SolidSurfaceParams | GradientGrainSurfaceParams>) => void
}

export const useHeroPatternPresets = (
  options: UseHeroPatternPresetsOptions
): UseHeroPatternPresetsReturn => {
  const {
    heroViewRepository,
    midgroundTexturePatterns,
    maskPatterns,
    surfaceParams,
    selectedBackgroundIndex,
    selectedMaskIndex,
    selectedMidgroundTextureIndex,
    textureColor1,
    textureColor2,
    midgroundTextureColor1,
    midgroundTextureColor2,
  } = options

  const {
    customMaskShapeParams,
    customSurfaceParams,
    customBackgroundSurfaceParams,
    extractSurfaceParams,
    extractBackgroundSurfaceParams,
  } = surfaceParams

  const surfacePresets = getSurfacePresets()

  const setBaseSurface = (surface: HeroSurfaceConfig) => {
    heroViewRepository.updateLayer(BASE_LAYER_ID, { surface })
  }

  const initMaskShapeParamsFromPreset = () => {
    const idx = selectedMaskIndex.value
    if (idx === null) return
    const pattern = maskPatterns[idx]
    if (pattern) {
      customMaskShapeParams.value = toCustomMaskShapeParams(pattern.maskConfig)
    }
  }

  const initSurfaceParamsFromPreset = () => {
    const idx = selectedMidgroundTextureIndex.value
    const preset = midgroundTexturePatterns[idx]
    if (preset) {
      customSurfaceParams.value = extractSurfaceParams(preset, midgroundTextureColor1.value, midgroundTextureColor2.value)
    }
  }

  const initBackgroundSurfaceParamsFromPreset = () => {
    const idx = selectedBackgroundIndex.value
    const preset = surfacePresets[idx]
    if (preset) {
      const params = extractBackgroundSurfaceParams(preset.params, textureColor1.value, textureColor2.value)
      if (params.type === 'solid') {
        setBaseSurface({ type: 'solid' })
      } else if (params.type === 'stripe') {
        setBaseSurface({ type: 'stripe', width1: params.width1, width2: params.width2, angle: params.angle })
      } else if (params.type === 'grid') {
        setBaseSurface({ type: 'grid', lineWidth: params.lineWidth, cellSize: params.cellSize })
      } else if (params.type === 'polkaDot') {
        setBaseSurface({ type: 'polkaDot', dotRadius: params.dotRadius, spacing: params.spacing, rowOffset: params.rowOffset })
      } else if (params.type === 'checker') {
        setBaseSurface({ type: 'checker', cellSize: params.cellSize, angle: params.angle })
      } else if (params.type === 'gradientGrain') {
        customBackgroundSurfaceParams.value = params
      } else if (params.type === 'asanoha') {
        customBackgroundSurfaceParams.value = params
      } else if (params.type === 'seigaiha') {
        customBackgroundSurfaceParams.value = params
      } else if (params.type === 'wave') {
        customBackgroundSurfaceParams.value = params
      } else if (params.type === 'scales') {
        customBackgroundSurfaceParams.value = params
      } else if (params.type === 'ogee') {
        customBackgroundSurfaceParams.value = params
      } else if (params.type === 'sunburst') {
        customBackgroundSurfaceParams.value = params
      }
    } else {
      customBackgroundSurfaceParams.value = null
    }
  }

  const updateMaskShapeParams = (updates: Partial<CircleMaskShapeParams | RectMaskShapeParams | BlobMaskShapeParams>) => {
    if (!customMaskShapeParams.value) return
    customMaskShapeParams.value = { ...customMaskShapeParams.value, ...updates } as CustomMaskShapeParams
  }

  const updateSurfaceParams = (updates: Partial<StripeSurfaceParams | GridSurfaceParams | PolkaDotSurfaceParams>) => {
    if (!customSurfaceParams.value) return
    customSurfaceParams.value = { ...customSurfaceParams.value, ...updates } as CustomSurfaceParams
  }

  const updateBackgroundSurfaceParams = (updates: Partial<StripeSurfaceParams | GridSurfaceParams | PolkaDotSurfaceParams | CheckerSurfaceParams | SolidSurfaceParams | GradientGrainSurfaceParams>) => {
    if (!customBackgroundSurfaceParams.value) return
    const type = customBackgroundSurfaceParams.value.type
    const layer = heroViewRepository.findLayer(BASE_LAYER_ID)
    if (!layer || layer.type !== 'surface') return
    const currentSurface = layer.surface
    if (currentSurface.type !== type) return
    const newSurface = { ...currentSurface, ...updates } as HeroSurfaceConfig
    heroViewRepository.updateLayer(BASE_LAYER_ID, { surface: newSurface })
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
