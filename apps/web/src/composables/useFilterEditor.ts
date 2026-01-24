import { computed, type WritableComputedRef, type ComputedRef } from 'vue'
import type {
  FilterType,
  EffectType,
  LayerEffectConfig,
  VignetteConfig,
  ChromaticAberrationEffectConfig,
  DotHalftoneEffectConfig,
  LineHalftoneEffectConfig,
  BlurEffectConfig,
  PixelateEffectConfig,
  HexagonMosaicEffectConfig,
  VoronoiMosaicEffectConfig,
} from '@practice/section-visual'
import type { UseEffectManagerReturn } from './useEffectManager'

// ============================================================
// Types
// ============================================================

/**
 * Options for useFilterEditor composable
 * Accepts effectManager directly for simplified integration
 */
export interface UseFilterEditorOptions {
  /** Effect manager composable instance */
  effectManager: UseEffectManagerReturn
}

/**
 * Filter config types for SchemaFields binding (excludes 'enabled' field)
 */
export type VignetteConfigParams = Partial<Omit<VignetteConfig, 'enabled'>>
export type ChromaticConfigParams = Partial<Omit<ChromaticAberrationEffectConfig, 'enabled'>>
export type DotHalftoneConfigParams = Partial<Omit<DotHalftoneEffectConfig, 'enabled'>>
export type LineHalftoneConfigParams = Partial<Omit<LineHalftoneEffectConfig, 'enabled'>>
export type BlurConfigParams = Partial<Omit<BlurEffectConfig, 'enabled'>>
export type PixelateConfigParams = Partial<Omit<PixelateEffectConfig, 'enabled'>>
export type HexagonMosaicConfigParams = Partial<Omit<HexagonMosaicEffectConfig, 'enabled'>>
export type VoronoiMosaicConfigParams = Partial<Omit<VoronoiMosaicEffectConfig, 'enabled'>>

/**
 * Dynamic effect configs map type
 */
export type EffectConfigsMap = {
  [K in EffectType]: WritableComputedRef<Partial<Omit<LayerEffectConfig[K], 'enabled'>>>
}

/**
 * Raw effect params map type (preserves PropertyValue for DSL display)
 */
export type RawEffectParamsMap = {
  [K in EffectType]: ComputedRef<Record<string, unknown> | null>
}

/**
 * Return type for useFilterEditor composable
 */
export interface UseFilterEditorReturn {
  /** Currently selected filter type (writable computed for v-model binding) */
  selectedFilterType: WritableComputedRef<FilterType>
  /** Dynamic effect configs map */
  effectConfigs: EffectConfigsMap
  /** Raw effect params map (preserves PropertyValue for DSL display) */
  rawEffectParams: RawEffectParamsMap
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Get current filter type from effect config
 * Returns the first enabled effect type, or 'void' if none enabled
 */
function getFilterTypeFromConfig(config: LayerEffectConfig | null): FilterType {
  if (!config) return 'void'
  if (config.vignette?.enabled) return 'vignette'
  if (config.chromaticAberration?.enabled) return 'chromaticAberration'
  if (config.dotHalftone?.enabled) return 'dotHalftone'
  if (config.lineHalftone?.enabled) return 'lineHalftone'
  if (config.blur?.enabled) return 'blur'
  if (config.pixelate?.enabled) return 'pixelate'
  if (config.hexagonMosaic?.enabled) return 'hexagonMosaic'
  if (config.voronoiMosaic?.enabled) return 'voronoiMosaic'
  return 'void'
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
 * @example
 * ```ts
 * const { effectManager } = heroScene.filter
 * const {
 *   selectedFilterType,
 *   effectConfigs,
 * } = useFilterEditor({ effectManager })
 *
 * // Use with v-model
 * <select v-model="selectedFilterType">
 * <SchemaFields v-model="effectConfigs.vignette" />
 * ```
 */
export function useFilterEditor(
  options: UseFilterEditorOptions
): UseFilterEditorReturn {
  const { effectManager } = options

  // ============================================================
  // Filter Type Selection
  // ============================================================

  /**
   * Writable computed for filter type selection
   * Enables exclusive filter selection (only one filter active at a time)
   */
  const selectedFilterType = computed<FilterType>({
    get: () => {
      return getFilterTypeFromConfig(effectManager.selectedEffect.value)
    },
    set: (type) => {
      const layerId = effectManager.selectedLayerId.value
      if (!layerId) return
      // Convert FilterType to EffectType (void -> null)
      const effectType: EffectType | null = type === 'void' ? null : type
      effectManager.setEffectType(layerId, effectType)
    },
  })

  // ============================================================
  // Dynamic Effect Configs
  // ============================================================

  /**
   * Create writable computed for an effect type
   */
  function createEffectConfig<T extends EffectType>(effectType: T) {
    return computed({
      get: () => (effectManager.selectedEffect.value?.[effectType] ?? {}) as Partial<Omit<LayerEffectConfig[T], 'enabled'>>,
      set: (value: Partial<Omit<LayerEffectConfig[T], 'enabled'>>) => {
        const layerId = effectManager.selectedLayerId.value
        if (!layerId) return
        effectManager.updateEffectParams(layerId, effectType, value)
      },
    })
  }

  // Generate effect configs for each type
  const vignetteConfig = createEffectConfig('vignette')
  const chromaticAberrationConfig = createEffectConfig('chromaticAberration')
  const dotHalftoneConfig = createEffectConfig('dotHalftone')
  const lineHalftoneConfig = createEffectConfig('lineHalftone')
  const blurConfig = createEffectConfig('blur')
  const pixelateConfig = createEffectConfig('pixelate')
  const hexagonMosaicConfig = createEffectConfig('hexagonMosaic')
  const voronoiMosaicConfig = createEffectConfig('voronoiMosaic')

  const effectConfigs: EffectConfigsMap = {
    vignette: vignetteConfig,
    chromaticAberration: chromaticAberrationConfig,
    dotHalftone: dotHalftoneConfig,
    lineHalftone: lineHalftoneConfig,
    blur: blurConfig,
    pixelate: pixelateConfig,
    hexagonMosaic: hexagonMosaicConfig,
    voronoiMosaic: voronoiMosaicConfig,
  }

  // ============================================================
  // Raw Effect Params (for DSL display)
  // ============================================================

  /**
   * Create computed for raw effect params (preserves PropertyValue)
   */
  function createRawEffectParams(effectType: EffectType) {
    return computed<Record<string, unknown> | null>(() => {
      return effectManager.selectedRawEffectParams.value.get(effectType) ?? null
    })
  }

  const rawEffectParams: RawEffectParamsMap = {
    vignette: createRawEffectParams('vignette'),
    chromaticAberration: createRawEffectParams('chromaticAberration'),
    dotHalftone: createRawEffectParams('dotHalftone'),
    lineHalftone: createRawEffectParams('lineHalftone'),
    blur: createRawEffectParams('blur'),
    pixelate: createRawEffectParams('pixelate'),
    hexagonMosaic: createRawEffectParams('hexagonMosaic'),
    voronoiMosaic: createRawEffectParams('voronoiMosaic'),
  }

  // ============================================================
  // Return
  // ============================================================

  return {
    selectedFilterType,
    effectConfigs,
    rawEffectParams,
  }
}
