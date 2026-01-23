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
  type SurfaceLayerNodeConfig,
  type BaseLayerNodeConfig,
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
  isBaseLayerConfig,
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
 * Type guard to check if a value is a PropertyValue object (has type field)
 */
function isPropertyValueObject(value: unknown): value is { type: string } {
  return value !== null && typeof value === 'object' && 'type' in value
}

/**
 * Extract static values from normalized config params.
 * For PropertyValue types (static/range), extract the static value or current evaluated value.
 * For primitive values, return as-is.
 */
function extractStaticValue(prop: unknown): unknown {
  if (!isPropertyValueObject(prop)) {
    // Primitive value (number, string, etc.)
    return prop
  }
  if ($PropertyValue.isStatic(prop as unknown as Parameters<typeof $PropertyValue.isStatic>[0])) {
    return (prop as unknown as { value: unknown }).value
  }
  if ($PropertyValue.isRange(prop as unknown as Parameters<typeof $PropertyValue.isRange>[0])) {
    // For range expressions, return the 'min' value as the current static representation
    return (prop as unknown as { min: number }).min
  }
  // Unknown type, return null
  return null
}

/**
 * Convert normalized params to static params for UI display.
 * Returns both the static values and a flag indicating if any params have DSL expressions.
 */
function toStaticParams<T extends Record<string, unknown>>(
  params: Record<string, unknown>
): { staticParams: T; hasDSL: boolean } {
  const staticParams: Record<string, unknown> = {}
  let hasDSL = false

  for (const [key, value] of Object.entries(params)) {
    if (isPropertyValueObject(value) && $PropertyValue.isRange(value as Parameters<typeof $PropertyValue.isRange>[0])) {
      hasDSL = true
    }
    staticParams[key] = extractStaticValue(value)
  }

  return { staticParams: staticParams as T, hasDSL }
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
      // Extract static values from params (handles RangeExpr by using 'min' value)
      const { staticParams } = toStaticParams<Record<string, unknown>>(normalizedMask.params)
      // Build static mask config for conversion (toCustomMaskShapeParams expects { type, ...params })
      const staticMaskConfig = { type: normalizedMask.id, ...staticParams }
      return toCustomMaskShapeParams(staticMaskConfig as ReturnType<typeof denormalizeMaskConfig>)
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
          // Normalize and extract params
          const normalizedSurface = getSurfaceAsNormalized(surfaceLayer.surface)
          // Extract static values from params (handles RangeExpr by using 'min' value)
          const { staticParams } = toStaticParams<Record<string, unknown>>(normalizedSurface.params)
          // Build static surface config for conversion (toCustomSurfaceParams expects { type, ...params })
          const staticSurfaceConfig = { type: normalizedSurface.id, ...staticParams }
          return toCustomSurfaceParams(
            staticSurfaceConfig as ReturnType<typeof denormalizeSurfaceConfig>,
            midgroundTextureColor1.value,
            midgroundTextureColor2.value
          )
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

  // Processor layer ID (for mask shape updates)
  const processorLayerId = computed((): string | null => {
    const config = repoConfig.value
    if (!config) return null
    const processor = findProcessorWithMask(config.layers)
    return processor?.id ?? null
  })

  // Raw params with PropertyValue preserved (for DSL display/edit)
  const rawMaskShapeParams = computed((): RawParams => {
    const config = repoConfig.value
    if (!config) return null
    const processor = findProcessorWithMask(config.layers)
    if (!processor) return null
    const maskModifier = processor.modifiers.find((m): m is MaskProcessorConfig => m.type === 'mask')
    if (!maskModifier) return null
    const normalizedMask = getMaskAsNormalized(maskModifier.shape)
    return normalizedMask.params as RawParams
  })

  const rawSurfaceParams = computed((): RawParams => {
    const config = repoConfig.value
    if (!config) return null

    if (selectedLayerId.value) {
      const selectedLayer = findLayerInTree(config.layers, selectedLayerId.value)
      if (selectedLayer && isSurfaceLayerConfig(selectedLayer)) {
        const surfaceLayer = selectedLayer as SurfaceLayerNodeConfig
        const normalizedSurface = getSurfaceAsNormalized(surfaceLayer.surface)
        return normalizedSurface.params as RawParams
      }
    }
    return null
  })

  const rawBackgroundSurfaceParams = computed((): RawParams => {
    const config = repoConfig.value
    if (!config) return null
    const baseLayer = config.layers.find((l) => l.id === BASE_LAYER_ID)
    if (!baseLayer || !isBaseLayerConfig(baseLayer)) return null
    const normalizedSurface = getSurfaceAsNormalized((baseLayer as BaseLayerNodeConfig).surface)
    return normalizedSurface.params as RawParams
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
    extractSurfaceParams,
    extractBackgroundSurfaceParams,
  }
}
