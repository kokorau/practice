import { computed, type Ref, type ComputedRef, type WritableComputedRef } from 'vue'
import type {
  FilterType,
  LayerFilterConfig,
  VignetteFilterConfig,
  ChromaticAberrationFilterConfig,
  DotHalftoneFilterConfig,
  LineHalftoneFilterConfig,
} from '../modules/HeroScene'

// ============================================================
// Types
// ============================================================

/**
 * Options for useFilterEditor composable
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
  /** Update vignette parameters */
  updateVignetteParams: (layerId: string, params: Partial<Omit<VignetteFilterConfig, 'enabled'>>) => void
  /** Update chromatic aberration parameters */
  updateChromaticAberrationParams: (layerId: string, params: Partial<Omit<ChromaticAberrationFilterConfig, 'enabled'>>) => void
  /** Update dot halftone parameters */
  updateDotHalftoneParams: (layerId: string, params: Partial<Omit<DotHalftoneFilterConfig, 'enabled'>>) => void
  /** Update line halftone parameters */
  updateLineHalftoneParams: (layerId: string, params: Partial<Omit<LineHalftoneFilterConfig, 'enabled'>>) => void
}

/**
 * Filter config types for SchemaFields binding (excludes 'enabled' field)
 */
export type VignetteConfigParams = Partial<Omit<VignetteFilterConfig, 'enabled'>>
export type ChromaticConfigParams = Partial<Omit<ChromaticAberrationFilterConfig, 'enabled'>>
export type DotHalftoneConfigParams = Partial<Omit<DotHalftoneFilterConfig, 'enabled'>>
export type LineHalftoneConfigParams = Partial<Omit<LineHalftoneFilterConfig, 'enabled'>>

/**
 * Return type for useFilterEditor composable
 */
export interface UseFilterEditorReturn {
  /** Currently selected filter type (writable computed for v-model binding) */
  selectedFilterType: WritableComputedRef<FilterType>
  /** Current vignette config (writable computed for v-model binding) */
  currentVignetteConfig: WritableComputedRef<VignetteConfigParams>
  /** Current chromatic aberration config (writable computed for v-model binding) */
  currentChromaticConfig: WritableComputedRef<ChromaticConfigParams>
  /** Current dot halftone config (writable computed for v-model binding) */
  currentDotHalftoneConfig: WritableComputedRef<DotHalftoneConfigParams>
  /** Current line halftone config (writable computed for v-model binding) */
  currentLineHalftoneConfig: WritableComputedRef<LineHalftoneConfigParams>
}

// ============================================================
// Composable
// ============================================================

/**
 * Composable for managing filter/effect editor state
 *
 * Handles:
 * - Filter type selection (exclusive: void, vignette, chromaticAberration, dotHalftone, lineHalftone)
 * - Filter parameter updates via writable computed properties
 * - Binding helpers for SchemaFields components
 */
export function useFilterEditor(
  options: UseFilterEditorOptions
): UseFilterEditorReturn {
  const {
    selectedFilterLayerId,
    selectedLayerFilters,
    getFilterType,
    selectFilterType,
    updateVignetteParams,
    updateChromaticAberrationParams,
    updateDotHalftoneParams,
    updateLineHalftoneParams,
  } = options

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
  // Filter Parameter Configs
  // ============================================================

  /**
   * Writable computed for vignette config
   * Used for SchemaFields binding
   */
  const currentVignetteConfig = computed({
    get: () => selectedLayerFilters.value?.vignette ?? {},
    set: (value) => {
      const layerId = selectedFilterLayerId.value
      if (!layerId) return
      updateVignetteParams(layerId, value)
    },
  })

  /**
   * Writable computed for chromatic aberration config
   * Used for SchemaFields binding
   */
  const currentChromaticConfig = computed({
    get: () => selectedLayerFilters.value?.chromaticAberration ?? {},
    set: (value) => {
      const layerId = selectedFilterLayerId.value
      if (!layerId) return
      updateChromaticAberrationParams(layerId, value)
    },
  })

  /**
   * Writable computed for dot halftone config
   * Used for SchemaFields binding
   */
  const currentDotHalftoneConfig = computed({
    get: () => selectedLayerFilters.value?.dotHalftone ?? {},
    set: (value) => {
      const layerId = selectedFilterLayerId.value
      if (!layerId) return
      updateDotHalftoneParams(layerId, value)
    },
  })

  /**
   * Writable computed for line halftone config
   * Used for SchemaFields binding
   */
  const currentLineHalftoneConfig = computed({
    get: () => selectedLayerFilters.value?.lineHalftone ?? {},
    set: (value) => {
      const layerId = selectedFilterLayerId.value
      if (!layerId) return
      updateLineHalftoneParams(layerId, value)
    },
  })

  return {
    selectedFilterType: selectedFilterTypeComputed,
    currentVignetteConfig,
    currentChromaticConfig,
    currentDotHalftoneConfig,
    currentLineHalftoneConfig,
  }
}
