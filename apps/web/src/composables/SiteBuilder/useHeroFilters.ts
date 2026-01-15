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
  type EffectFilterConfig,
  type EffectType,
  type FilterType,
  type HeroViewRepository,
} from '../../modules/HeroScene'
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
  isLoadingFromConfig: () => boolean
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
   * Convert LayerEffectConfig to EffectFilterConfig for repository storage
   */
  const toEffectFilterConfig = (config: LayerEffectConfig): EffectFilterConfig => ({
    type: 'effect',
    enabled: true,
    config,
  })

  /**
   * Sync a single layer's effect config to repository
   */
  const syncLayerEffectToRepository = (layerId: string, effectConfig: LayerEffectConfig) => {
    const layer = heroViewRepository.findLayer(layerId)
    if (!layer) return

    // Skip processor nodes (they use modifiers, not filters)
    if (layer.type === 'processor') return

    // Convert and update
    const filters: EffectFilterConfig[] = [toEffectFilterConfig(effectConfig)]
    heroViewRepository.updateLayer(layerId, { filters })
  }

  /**
   * Debounced sync function to avoid excessive repository updates
   */
  const debouncedSyncEffects = useDebounceFn((effects: Map<string, LayerEffectConfig>) => {
    for (const [layerId, effectConfig] of effects) {
      syncLayerEffectToRepository(layerId, effectConfig)
    }
  }, 100)

  // Watch effectManager.effects and sync to repository
  watch(
    () => effectManager.effects.value,
    (effects) => {
      if (isLoadingFromConfig()) return
      debouncedSyncEffects(effects)
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
   */
  const getFilterType = (layerId: string): FilterType => {
    const filters = effectManager.effects.value.get(layerId)
    if (!filters) return 'void'
    if (filters.vignette?.enabled) return 'vignette'
    if (filters.chromaticAberration?.enabled) return 'chromaticAberration'
    if (filters.dotHalftone?.enabled) return 'dotHalftone'
    if (filters.lineHalftone?.enabled) return 'lineHalftone'
    if (filters.blur?.enabled) return 'blur'
    return 'void'
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
