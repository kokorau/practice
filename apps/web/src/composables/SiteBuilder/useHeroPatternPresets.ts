/**
 * useHeroPatternPresets
 *
 * パターンプリセットの初期化・更新ロジックを管理するcomposable
 * - initMaskShapeParamsFromPreset: マスク形状パラメータの初期化
 * - initSurfaceParamsFromPreset: マスクサーフェスパラメータの初期化
 * - initBackgroundSurfaceParamsFromPreset: 背景サーフェスパラメータの初期化
 * - updateMaskShapeParams, updateSurfaceParams, updateBackgroundSurfaceParams: パラメータ更新
 */

import { ref, type ComputedRef, type Ref } from 'vue'
import {
  surfacePresetRepository,
  type SurfacePreset,
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
  type NormalizedSurfaceConfig,
  type PropertyValue,
  type SurfaceUsecase,
  type SurfaceParamsUpdate,
  type MaskShapeParamsUpdate,
  type SurfaceLayerNodeConfig,
  type ProcessorNodeConfig,
  flattenLayersInTree,
  isProcessorLayerConfig,
  isMaskProcessorConfig,
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
  midgroundTexturePatterns: Ref<MidgroundSurfacePreset[]>
  maskPatterns: Ref<MaskPattern[]>
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
  surfacePresets: Ref<SurfacePreset[]>
  initPresets: () => Promise<void>
  setBaseSurface: (surface: NormalizedSurfaceConfig) => void
  initMaskShapeParamsFromPreset: () => void
  initSurfaceParamsFromPreset: () => void
  initBackgroundSurfaceParamsFromPreset: () => void
  updateMaskShapeParams: (updates: Partial<CircleMaskShapeParams | RectMaskShapeParams | BlobMaskShapeParams>) => void
  updateSurfaceParams: (updates: Partial<StripeSurfaceParams | GridSurfaceParams | PolkaDotSurfaceParams>) => void
  updateBackgroundSurfaceParams: (updates: Partial<StripeSurfaceParams | GridSurfaceParams | PolkaDotSurfaceParams | CheckerSurfaceParams | SolidSurfaceParams>) => void
  /** 背景サーフェスの単一パラメータを更新（既存のPropertyValue型を保持、DSL/range対応） */
  updateSingleBackgroundSurfaceParam: (paramName: string, value: unknown) => void
  /** マスクサーフェスの単一パラメータを更新（既存のPropertyValue型を保持、DSL/range対応） */
  updateSingleSurfaceParam: (paramName: string, value: unknown) => void
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

  const surfacePresets = ref<SurfacePreset[]>([])

  // Initialize presets asynchronously
  const initPresets = async () => {
    surfacePresets.value = await surfacePresetRepository.getAll()
  }

  const setBaseSurface = (surface: NormalizedSurfaceConfig) => {
    heroViewRepository.updateLayer(BASE_LAYER_ID, { surface })
  }

  /**
   * Find the first mask processor in the layer tree
   */
  const findFirstMaskProcessor = (): { processorId: string; modifierIndex: number } | null => {
    const config = heroViewRepository.get()
    for (const layer of flattenLayersInTree(config.layers)) {
      if (isProcessorLayerConfig(layer)) {
        const processorLayer = layer as ProcessorNodeConfig
        const modifierIndex = processorLayer.modifiers.findIndex(isMaskProcessorConfig)
        if (modifierIndex !== -1) {
          return { processorId: layer.id, modifierIndex }
        }
      }
    }
    return null
  }

  /**
   * Convert MaskPattern children to SurfaceLayerNodeConfig array
   */
  const convertPatternChildrenToLayers = (
    children: MaskPattern['children']
  ): SurfaceLayerNodeConfig[] => {
    if (!children) return []
    return children.map((child, index) => ({
      type: 'surface' as const,
      id: `mask-child-${Date.now()}-${index}`,
      name: child.name,
      visible: child.visible,
      surface: {
        id: child.surface.id as SurfaceLayerNodeConfig['surface']['id'],
        params: child.surface.params as SurfaceLayerNodeConfig['surface']['params'],
      },
    }))
  }

  const initMaskShapeParamsFromPreset = () => {
    const idx = selectedMaskIndex.value
    if (idx === null) return
    const pattern = maskPatterns.value[idx]
    if (pattern && pattern.children && pattern.children.length > 0) {
      // Find the processor with mask modifier and replace children
      const maskProcessor = findFirstMaskProcessor()
      if (maskProcessor) {
        const newChildren = convertPatternChildrenToLayers(pattern.children)
        heroViewRepository.replaceMaskChildren(
          maskProcessor.processorId,
          maskProcessor.modifierIndex,
          newChildren
        )
      }

      // Children-based mask pattern: use first child's surface config for UI params
      const firstChild = pattern.children[0]
      if (firstChild) {
        const surfaceId = firstChild.surface.id
        const params = firstChild.surface.params

        // Extract static values from params
        const extractValue = <T,>(v: { value: T } | undefined, def: T): T =>
          v?.value ?? def

        // Map surface type to mask shape params
        switch (surfaceId) {
          case 'circle':
            customMaskShapeParams.value = {
              id: 'circle',
              centerX: extractValue(params.centerX as { value: number }, 0.5),
              centerY: extractValue(params.centerY as { value: number }, 0.5),
              radius: extractValue(params.radius as { value: number }, 0.3),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any
            break
          case 'rect':
            customMaskShapeParams.value = {
              id: 'rect',
              left: extractValue(params.left as { value: number }, 0),
              right: extractValue(params.right as { value: number }, 1),
              top: extractValue(params.top as { value: number }, 0),
              bottom: extractValue(params.bottom as { value: number }, 1),
              radiusTopLeft: extractValue(params.radiusTopLeft as { value: number }, 0),
              radiusTopRight: extractValue(params.radiusTopRight as { value: number }, 0),
              radiusBottomLeft: extractValue(params.radiusBottomLeft as { value: number }, 0),
              radiusBottomRight: extractValue(params.radiusBottomRight as { value: number }, 0),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any
            break
          case 'blob':
            customMaskShapeParams.value = {
              id: 'blob',
              centerX: extractValue(params.centerX as { value: number }, 0.5),
              centerY: extractValue(params.centerY as { value: number }, 0.5),
              baseRadius: extractValue(params.baseRadius as { value: number }, 0.4),
              amplitude: extractValue(params.amplitude as { value: number }, 0.08),
              octaves: extractValue(params.octaves as { value: number }, 2),
              seed: extractValue(params.seed as { value: number }, 1),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any
            break
          default:
            // For other types, just clear the params
            customMaskShapeParams.value = null
        }
      }
    }
  }

  const initSurfaceParamsFromPreset = () => {
    const idx = selectedMidgroundTextureIndex.value
    const preset = midgroundTexturePatterns.value[idx]
    if (preset) {
      // Type assertion needed - preset.params is GenericSurfaceParams, toCustomSurfaceParams expects SurfaceConfig
      // Both have { type: string; [key: string]: unknown } structure at runtime
      customSurfaceParams.value = toCustomSurfaceParams(preset.params as Parameters<typeof toCustomSurfaceParams>[0])
    }
  }

  const initBackgroundSurfaceParamsFromPreset = () => {
    const idx = selectedBackgroundIndex.value
    const preset = surfacePresets.value[idx]
    if (preset) {
      // Type assertion needed - preset.params is GenericSurfaceParams
      const params = toCustomBackgroundSurfaceParams(preset.params as Parameters<typeof toCustomBackgroundSurfaceParams>[0])
      // Extract id and remaining params for schema-based surface initialization
      const { id, ...rest } = params
      // Convert params to PropertyValue format and set base surface
      // Filter out 'id' key and cast values to expected types
      const surfaceParams = Object.fromEntries(
        Object.entries(rest).map(([key, value]) => [key, value as string | number | boolean | undefined])
      )
      // Type assertion for id - GenericParams.id is string, but setBaseSurface expects SurfaceType
      setBaseSurface({ id: id as Parameters<typeof setBaseSurface>[0]['id'], params: toPropertyValueParams(surfaceParams) })
    } else {
      customBackgroundSurfaceParams.value = null
    }
  }

  const updateMaskShapeParams = (updates: Partial<CircleMaskShapeParams | RectMaskShapeParams | BlobMaskShapeParams>) => {
    if (!customMaskShapeParams.value) return
    const maskShapeId = customMaskShapeParams.value.id
    const procId = processorLayerId.value
    if (!procId) return
    // Delegate to SurfaceUsecase - it handles PropertyValue preservation
    surfaceUsecase.updateMaskShapeParams(procId, { id: maskShapeId, ...updates } as MaskShapeParamsUpdate)
  }

  const updateSurfaceParams = (updates: Partial<StripeSurfaceParams | GridSurfaceParams | PolkaDotSurfaceParams>) => {
    if (!customSurfaceParams.value) return
    const surfaceId = customSurfaceParams.value.id
    const targetLayerId = selectedLayerId.value || 'surface-mask'
    // Delegate to SurfaceUsecase - it handles layer type check and PropertyValue preservation
    surfaceUsecase.updateSurfaceParamsForLayer(targetLayerId, { id: surfaceId, ...updates } as SurfaceParamsUpdate)
  }

  const updateBackgroundSurfaceParams = (updates: Partial<StripeSurfaceParams | GridSurfaceParams | PolkaDotSurfaceParams | CheckerSurfaceParams | SolidSurfaceParams>) => {
    if (!customBackgroundSurfaceParams.value) return
    const surfaceId = customBackgroundSurfaceParams.value.id
    // Delegate to SurfaceUsecase - it handles layer type check and PropertyValue preservation
    surfaceUsecase.updateSurfaceParamsForLayer(BASE_LAYER_ID, { id: surfaceId, ...updates } as SurfaceParamsUpdate)
  }

  const updateSingleBackgroundSurfaceParam = (paramName: string, value: unknown) => {
    // Delegate to SurfaceUsecase - preserves existing PropertyValue types for other params
    // Accepts PropertyValue (range, dsl) or primitive values
    surfaceUsecase.updateSingleSurfaceParam(BASE_LAYER_ID, paramName, value as string | number | boolean)
  }

  const updateSingleSurfaceParam = (paramName: string, value: unknown) => {
    const targetLayerId = selectedLayerId.value || 'surface-mask'
    // Delegate to SurfaceUsecase - preserves existing PropertyValue types for other params
    // Accepts PropertyValue (range, dsl) or primitive values
    surfaceUsecase.updateSingleSurfaceParam(targetLayerId, paramName, value as string | number | boolean)
  }

  return {
    surfacePresets,
    initPresets,
    setBaseSurface,
    initMaskShapeParamsFromPreset,
    initSurfaceParamsFromPreset,
    initBackgroundSurfaceParamsFromPreset,
    updateMaskShapeParams,
    updateSurfaceParams,
    updateBackgroundSurfaceParams,
    updateSingleBackgroundSurfaceParam,
    updateSingleSurfaceParam,
  }
}
