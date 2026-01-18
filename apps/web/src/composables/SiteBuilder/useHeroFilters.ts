/**
 * useHeroFilters
 *
 * Filter and effect management for HeroScene layers
 * Wraps useEffectManager and provides layer-specific filter operations
 */

import { computed, watch, type ComputedRef, type Ref } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import {
  type LayerEffectConfig,
  type SingleEffectConfig,
  type EffectType,
  type FilterType,
  type HeroViewRepository,
} from '@practice/hero-scene'
import { useEffectManager, type UseEffectManagerReturn } from '../useEffectManager'

// ============================================================
// Types
// ============================================================

/**
 * Deep partial type for filter updates
 */
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

/**
 * Options for useHeroFilters composable
 */
export interface UseHeroFiltersOptions {
  /** Layer IDs to initialize */
  layerIds: { BASE: string; MASK: string }
  /** Repository for syncing effect configs */
  heroViewRepository: HeroViewRepository
  /** Flag to skip sync during config loading */
  isLoadingFromConfig: Ref<boolean>
}

/**
 * Return type for useHeroFilters composable
 */
export interface UseHeroFiltersReturn {
  /** Underlying effect manager */
  effectManager: UseEffectManagerReturn
  /** Currently selected filter layer ID */
  selectedFilterLayerId: Ref<string | null>
  /** Selected layer's filter config */
  selectedLayerFilters: ComputedRef<LayerEffectConfig | null>
  /** All layer filter configs */
  layerFilterConfigs: ComputedRef<Map<string, LayerEffectConfig>>
  /** Update layer filters with deep partial merge */
  updateLayerFilters: (layerId: string, updates: DeepPartial<LayerEffectConfig>) => void
  /** Select filter type (exclusive selection) */
  selectFilterType: (layerId: string, type: FilterType) => void
  /** Get current filter type for a layer */
  getFilterType: (layerId: string) => FilterType
  /** Update vignette parameters */
  updateVignetteParams: (layerId: string, params: Partial<{ intensity: number; radius: number; softness: number }>) => void
  /** Update chromatic aberration parameters */
  updateChromaticAberrationParams: (layerId: string, params: Partial<{ intensity: number }>) => void
  /** Update dot halftone parameters */
  updateDotHalftoneParams: (layerId: string, params: Partial<{ dotSize: number; spacing: number; angle: number }>) => void
  /** Update line halftone parameters */
  updateLineHalftoneParams: (layerId: string, params: Partial<{ lineWidth: number; spacing: number; angle: number }>) => void
  /** Update blur parameters */
  updateBlurParams: (layerId: string, params: Partial<{
    radius: number
    shapeType: string
    invert: boolean
    centerX: number
    centerY: number
    feather: number
    angle: number
    focusWidth: number
    innerRadius: number
    outerRadius: number
    aspectRatio: number
    rectWidth: number
    rectHeight: number
  }>) => void
}

// ============================================================
// Composable
// ============================================================

/**
 * Composable for filter and effect management in HeroScene
 */
export function useHeroFilters(options: UseHeroFiltersOptions): UseHeroFiltersReturn {
  const { layerIds, heroViewRepository, isLoadingFromConfig } = options

  // ============================================================
  // Initialize Effect Manager
  // ============================================================
  const effectManager = useEffectManager()

  // Initialize default layers
  effectManager.selectLayer(layerIds.BASE)
  effectManager.selectLayer(layerIds.MASK)
  // Select BASE layer as default
  effectManager.selectLayer(layerIds.BASE)

  // ============================================================
  // Backward Compatible Aliases
  // ============================================================
  const selectedFilterLayerId = effectManager.selectedLayerId
  const layerFilterConfigs = computed(() => effectManager.effects.value)
  const selectedLayerFilters = effectManager.selectedEffect

  // ============================================================
  // Effect Sync to Repository
  // ============================================================

  /**
   * Find processor ID for a given layer ID
   * Maps surface layer IDs to their corresponding processor
   */
  const findProcessorIdForLayer = (layerId: string): string | null => {
    // Map layer IDs to their processor IDs
    if (layerId === layerIds.BASE) {
      return 'bg-processor'
    }
    if (layerId === layerIds.MASK) {
      return 'processor-mask'
    }
    return null
  }

  /**
   * Sync a single layer's effect pipeline to repository
   * Effects are stored in processor.modifiers
   */
  const syncLayerEffectToRepository = (layerId: string, pipeline: SingleEffectConfig[]) => {
    const processorId = findProcessorIdForLayer(layerId)
    if (!processorId) return

    const processor = heroViewRepository.findLayer(processorId)
    if (!processor || processor.type !== 'processor') return

    // Get existing modifiers, keeping non-effect modifiers (like masks)
    const existingModifiers = processor.modifiers.filter(m => m.type !== 'effect')

    // Merge effects with existing modifiers
    const newModifiers = [...pipeline, ...existingModifiers]
    heroViewRepository.updateLayer(processorId, { modifiers: newModifiers })
  }

  /**
   * Debounced sync function to avoid excessive repository updates
   */
  const debouncedSyncEffects = useDebounceFn((pipelines: Map<string, SingleEffectConfig[]>) => {
    for (const [layerId, pipeline] of pipelines) {
      syncLayerEffectToRepository(layerId, pipeline)
    }
  }, 100)

  // Watch effectManager.effectPipelines and sync to repository
  watch(
    () => effectManager.effectPipelines.value,
    (pipelines) => {
      if (isLoadingFromConfig.value) return
      debouncedSyncEffects(pipelines)
    },
    { deep: true }
  )

  // ============================================================
  // Filter Update Functions
  // ============================================================

  /**
   * Update layer filters with deep partial merge
   */
  const updateLayerFilters = (layerId: string, updates: DeepPartial<LayerEffectConfig>) => {
    const effectTypes: EffectType[] = ['vignette', 'chromaticAberration', 'dotHalftone', 'lineHalftone', 'blur']
    for (const effectType of effectTypes) {
      const effectUpdate = updates[effectType]
      if (effectUpdate) {
        const { enabled, ...params } = effectUpdate as { enabled?: boolean; [key: string]: unknown }
        if (Object.keys(params).length > 0) {
          effectManager.updateEffectParams(layerId, effectType, params as Parameters<typeof effectManager.updateEffectParams>[2])
        }
        if (enabled !== undefined) {
          if (enabled) {
            effectManager.setEffectType(layerId, effectType)
          }
        }
      }
    }
  }

  /**
   * Select filter type (exclusive selection)
   */
  const selectFilterType = (layerId: string, type: FilterType) => {
    const effectType: EffectType | null = type === 'void' ? null : type
    effectManager.setEffectType(layerId, effectType)
  }

  /**
   * Get current filter type for a layer
   * Returns the first effect type in the pipeline, or 'void' if empty
   */
  const getFilterType = (layerId: string): FilterType => {
    const pipeline = effectManager.effectPipelines.value.get(layerId)
    if (!pipeline || pipeline.length === 0) return 'void'
    // Return the first effect type (for exclusive selection mode)
    return pipeline[0]!.id as FilterType
  }

  /**
   * Update vignette parameters
   */
  const updateVignetteParams = (layerId: string, params: Partial<{ intensity: number; radius: number; softness: number }>) => {
    effectManager.updateEffectParams(layerId, 'vignette', params)
  }

  /**
   * Update chromatic aberration parameters
   */
  const updateChromaticAberrationParams = (layerId: string, params: Partial<{ intensity: number }>) => {
    effectManager.updateEffectParams(layerId, 'chromaticAberration', params)
  }

  /**
   * Update dot halftone parameters
   */
  const updateDotHalftoneParams = (layerId: string, params: Partial<{ dotSize: number; spacing: number; angle: number }>) => {
    effectManager.updateEffectParams(layerId, 'dotHalftone', params)
  }

  /**
   * Update line halftone parameters
   */
  const updateLineHalftoneParams = (layerId: string, params: Partial<{ lineWidth: number; spacing: number; angle: number }>) => {
    effectManager.updateEffectParams(layerId, 'lineHalftone', params)
  }

  /**
   * Update blur parameters
   */
  const updateBlurParams = (layerId: string, params: Partial<{
    radius: number
    shapeType: string
    invert: boolean
    centerX: number
    centerY: number
    feather: number
    angle: number
    focusWidth: number
    innerRadius: number
    outerRadius: number
    aspectRatio: number
    rectWidth: number
    rectHeight: number
  }>) => {
    effectManager.updateEffectParams(layerId, 'blur', params)
  }

  // ============================================================
  // Return
  // ============================================================
  return {
    effectManager,
    selectedFilterLayerId,
    selectedLayerFilters,
    layerFilterConfigs,
    updateLayerFilters,
    selectFilterType,
    getFilterType,
    updateVignetteParams,
    updateChromaticAberrationParams,
    updateDotHalftoneParams,
    updateLineHalftoneParams,
    updateBlurParams,
  }
}
