import { computed, type Ref, type ComputedRef, type WritableComputedRef } from 'vue'
import type {
  FilterType,
  EffectType,
  LayerFilterConfig,
  LayerEffectConfig,
  VignetteFilterConfig,
  ChromaticAberrationFilterConfig,
  DotHalftoneFilterConfig,
  LineHalftoneFilterConfig,
  BlurEffectConfig,
} from '../modules/HeroScene'

// ============================================================
// Types
// ============================================================

/**
 * Options for useFilterEditor composable (new API)
 */
export interface UseFilterEditorOptions {
  /** Currently selected filter layer ID */
  selectedFilterLayerId: Ref<string | null>
  /** Filter config for the selected layer */
  selectedLayerFilters: ComputedRef<LayerFilterConfig | null>
  /** Get filter type for a layer */
  getFilterType: (layerId: string) => FilterType
  /** Select filter type for a layer (exclusive selection) */
  selectFilterType: (layerId: string, type: FilterType) => void
  /** Generic effect params update function */
  updateEffectParams: <T extends EffectType>(
    layerId: string,
    effectType: T,
    params: Partial<Omit<LayerEffectConfig[T], 'enabled'>>
  ) => void
}

/**
 * Legacy options interface for backward compatibility
 */
export interface UseFilterEditorLegacyOptions {
  selectedFilterLayerId: Ref<string | null>
  selectedLayerFilters: ComputedRef<LayerFilterConfig | null>
  getFilterType: (layerId: string) => FilterType
  selectFilterType: (layerId: string, type: FilterType) => void
  updateVignetteParams: (layerId: string, params: Partial<Omit<VignetteFilterConfig, 'enabled'>>) => void
  updateChromaticAberrationParams: (layerId: string, params: Partial<Omit<ChromaticAberrationFilterConfig, 'enabled'>>) => void
  updateDotHalftoneParams: (layerId: string, params: Partial<Omit<DotHalftoneFilterConfig, 'enabled'>>) => void
  updateLineHalftoneParams: (layerId: string, params: Partial<Omit<LineHalftoneFilterConfig, 'enabled'>>) => void
  updateBlurParams: (layerId: string, params: Partial<Omit<BlurEffectConfig, 'enabled'>>) => void
}

/**
 * Filter config types for SchemaFields binding (excludes 'enabled' field)
 */
export type VignetteConfigParams = Partial<Omit<VignetteFilterConfig, 'enabled'>>
export type ChromaticConfigParams = Partial<Omit<ChromaticAberrationFilterConfig, 'enabled'>>
export type DotHalftoneConfigParams = Partial<Omit<DotHalftoneFilterConfig, 'enabled'>>
export type LineHalftoneConfigParams = Partial<Omit<LineHalftoneFilterConfig, 'enabled'>>
export type BlurConfigParams = Partial<Omit<BlurEffectConfig, 'enabled'>>

/**
 * Dynamic effect configs map type
 */
export type EffectConfigsMap = {
  [K in EffectType]: WritableComputedRef<Partial<Omit<LayerEffectConfig[K], 'enabled'>>>
}

/**
 * Return type for useFilterEditor composable
 */
export interface UseFilterEditorReturn {
  /** Currently selected filter type (writable computed for v-model binding) */
  selectedFilterType: WritableComputedRef<FilterType>
  /** Dynamic effect configs map (new API) */
  effectConfigs: EffectConfigsMap
  // Legacy individual configs (deprecated, for backward compatibility)
  /** @deprecated Use effectConfigs.vignette instead */
  currentVignetteConfig: WritableComputedRef<VignetteConfigParams>
  /** @deprecated Use effectConfigs.chromaticAberration instead */
  currentChromaticConfig: WritableComputedRef<ChromaticConfigParams>
  /** @deprecated Use effectConfigs.dotHalftone instead */
  currentDotHalftoneConfig: WritableComputedRef<DotHalftoneConfigParams>
  /** @deprecated Use effectConfigs.lineHalftone instead */
  currentLineHalftoneConfig: WritableComputedRef<LineHalftoneConfigParams>
  /** @deprecated Use effectConfigs.blur instead */
  currentBlurConfig: WritableComputedRef<BlurConfigParams>
}

// ============================================================
// Type Guards
// ============================================================

function isNewAPI(options: UseFilterEditorOptions | UseFilterEditorLegacyOptions): options is UseFilterEditorOptions {
  return 'updateEffectParams' in options
}

// ============================================================
// Composable
// ============================================================

/**
 * Composable for managing filter/effect editor state
 *
 * Handles:
 * - Filter type selection (exclusive: void, vignette, chromaticAberration, dotHalftone, lineHalftone, blur)
 * - Filter parameter updates via writable computed properties
 * - Binding helpers for SchemaFields components
 *
 * Supports both new generic API and legacy individual update functions
 */
export function useFilterEditor(
  options: UseFilterEditorOptions | UseFilterEditorLegacyOptions
): UseFilterEditorReturn {
  const {
    selectedFilterLayerId,
    selectedLayerFilters,
    getFilterType,
    selectFilterType,
  } = options

  // Create generic update function from options
  const updateEffectParams = isNewAPI(options)
    ? options.updateEffectParams
    : <T extends EffectType>(
        layerId: string,
        effectType: T,
        params: Partial<Omit<LayerEffectConfig[T], 'enabled'>>
      ) => {
        switch (effectType) {
          case 'vignette':
            options.updateVignetteParams(layerId, params as VignetteConfigParams)
            break
          case 'chromaticAberration':
            options.updateChromaticAberrationParams(layerId, params as ChromaticConfigParams)
            break
          case 'dotHalftone':
            options.updateDotHalftoneParams(layerId, params as DotHalftoneConfigParams)
            break
          case 'lineHalftone':
            options.updateLineHalftoneParams(layerId, params as LineHalftoneConfigParams)
            break
          case 'blur':
            options.updateBlurParams(layerId, params as BlurConfigParams)
            break
        }
      }

  // ============================================================
  // Filter Type Selection
  // ============================================================

  /**
   * Writable computed for filter type selection
   * Enables exclusive filter selection (only one filter active at a time)
   */
  const selectedFilterTypeComputed = computed<FilterType>({
    get: () => {
      const layerId = selectedFilterLayerId.value
      if (!layerId) return 'void'
      return getFilterType(layerId)
    },
    set: (type) => {
      const layerId = selectedFilterLayerId.value
      if (!layerId) return
      selectFilterType(layerId, type)
    },
  })

  // ============================================================
  // Dynamic Effect Configs (Registry-based)
  // ============================================================

  /**
   * Create writable computed for an effect type
   */
  function createEffectConfig<T extends EffectType>(effectType: T) {
    return computed({
      get: () => (selectedLayerFilters.value?.[effectType] ?? {}) as Partial<Omit<LayerEffectConfig[T], 'enabled'>>,
      set: (value: Partial<Omit<LayerEffectConfig[T], 'enabled'>>) => {
        const layerId = selectedFilterLayerId.value
        if (!layerId) return
        updateEffectParams(layerId, effectType, value)
      },
    })
  }

  // Generate effect configs for each type
  const vignetteConfig = createEffectConfig('vignette')
  const chromaticAberrationConfig = createEffectConfig('chromaticAberration')
  const dotHalftoneConfig = createEffectConfig('dotHalftone')
  const lineHalftoneConfig = createEffectConfig('lineHalftone')
  const blurConfig = createEffectConfig('blur')

  const effectConfigs: EffectConfigsMap = {
    vignette: vignetteConfig,
    chromaticAberration: chromaticAberrationConfig,
    dotHalftone: dotHalftoneConfig,
    lineHalftone: lineHalftoneConfig,
    blur: blurConfig,
  }

  // ============================================================
  // Legacy Individual Configs (for backward compatibility)
  // ============================================================

  return {
    selectedFilterType: selectedFilterTypeComputed,
    effectConfigs,
    // Legacy individual configs (point to effectConfigs for compatibility)
    currentVignetteConfig: vignetteConfig,
    currentChromaticConfig: chromaticAberrationConfig,
    currentDotHalftoneConfig: dotHalftoneConfig,
    currentLineHalftoneConfig: lineHalftoneConfig,
    currentBlurConfig: blurConfig,
  }
}
