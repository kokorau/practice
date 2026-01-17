import { ref, shallowRef, computed, type Ref, type ComputedRef } from 'vue'
import {
  type EffectType,
  type LayerEffectConfig,
  type SingleEffectConfig,
  createSingleEffectConfig,
  extractEnabledEffects,
  denormalizeToLayerEffectConfig,
} from '../modules/HeroScene'

// ============================================================
// Types
// ============================================================

/**
 * Return type for useEffectManager composable
 */
export interface UseEffectManagerReturn {
  /** All layer effect configs as SingleEffectConfig[][] (reactive Map) */
  effectPipelines: ComputedRef<Map<string, SingleEffectConfig[]>>
  /** Currently selected layer ID */
  selectedLayerId: Ref<string | null>
  /** Effect pipeline for the currently selected layer */
  selectedPipeline: ComputedRef<SingleEffectConfig[]>
  /** Select a layer by ID */
  selectLayer: (id: string) => void

  // === New Multi-Effect API ===
  /** Add an effect to a layer's pipeline */
  addEffect: (layerId: string, effectType: EffectType, params?: Record<string, unknown>) => void
  /** Remove an effect from a layer's pipeline by index */
  removeEffect: (layerId: string, index: number) => void
  /** Update effect params at a specific index */
  updateEffectAt: (layerId: string, index: number, params: Record<string, unknown>) => void
  /** Reorder effects in the pipeline */
  reorderEffects: (layerId: string, fromIndex: number, toIndex: number) => void
  /** Clear all effects from a layer */
  clearEffects: (layerId: string) => void
  /** Set entire effect pipeline for a layer */
  setEffectPipeline: (layerId: string, effects: SingleEffectConfig[]) => void
  /** Delete effect pipeline for a layer */
  deleteEffectPipeline: (layerId: string) => void

  // === Legacy API (deprecated, for backward compatibility) ===
  /**
   * All layer effect configs in legacy format
   * @deprecated Use effectPipelines instead
   */
  effects: ComputedRef<Map<string, LayerEffectConfig>>
  /**
   * Effect config for the currently selected layer in legacy format
   * @deprecated Use selectedPipeline instead
   */
  selectedEffect: ComputedRef<LayerEffectConfig | null>
  /**
   * Set effect type for a layer (exclusive selection, clears other effects)
   * @deprecated Use addEffect/removeEffect for multi-effect support
   */
  setEffectType: (layerId: string, type: EffectType | null) => void
  /**
   * Update effect params for a layer (legacy API)
   * @deprecated Use updateEffectAt instead
   */
  updateEffectParams: <T extends EffectType>(
    layerId: string,
    type: T,
    params: Partial<Omit<LayerEffectConfig[T], 'enabled'>>
  ) => void
  /**
   * Set entire effect config for a layer (accepts both formats)
   * @deprecated Use setEffectPipeline instead
   */
  setEffectConfig: (layerId: string, config: LayerEffectConfig | SingleEffectConfig[]) => void
  /**
   * Delete effect config for a layer
   * @deprecated Use deleteEffectPipeline instead
   */
  deleteEffectConfig: (layerId: string) => void
}

// ============================================================
// Composable
// ============================================================

/**
 * Composable for centralized effect state management
 *
 * Provides a single source of truth for all layer effect configurations.
 * Supports multiple effects per layer with pipeline-based management.
 *
 * @example
 * ```ts
 * const {
 *   effectPipelines,
 *   selectedLayerId,
 *   selectedPipeline,
 *   selectLayer,
 *   addEffect,
 *   removeEffect,
 *   updateEffectAt,
 * } = useEffectManager()
 *
 * // Select a layer
 * selectLayer('layer-1')
 *
 * // Add blur effect
 * addEffect('layer-1', 'blur', { radius: 8 })
 *
 * // Add vignette effect (multiple effects now supported)
 * addEffect('layer-1', 'vignette', { intensity: 0.5 })
 *
 * // Update blur params at index 0
 * updateEffectAt('layer-1', 0, { radius: 15 })
 * ```
 */
export function useEffectManager(): UseEffectManagerReturn {
  // ============================================================
  // State (Internal: SingleEffectConfig[] per layer)
  // ============================================================

  /** Internal Map storing effect pipelines */
  const pipelinesMap = shallowRef<Map<string, SingleEffectConfig[]>>(new Map())

  /** Currently selected layer ID */
  const selectedLayerId = ref<string | null>(null)

  /**
   * Legacy params cache for backward compatibility
   * Stores effect params even when effects are removed from pipeline
   * Key: layerId, Value: Map<EffectType, params>
   */
  const legacyParamsCache = new Map<string, Map<EffectType, Record<string, unknown>>>()

  // ============================================================
  // Computed
  // ============================================================

  /** Exposed readonly computed for effect pipelines */
  const effectPipelines = computed(() => pipelinesMap.value)

  /** Effect pipeline for the currently selected layer */
  const selectedPipeline = computed<SingleEffectConfig[]>(() => {
    const layerId = selectedLayerId.value
    if (!layerId) return []
    return pipelinesMap.value.get(layerId) ?? []
  })

  /** Legacy: Convert to LayerEffectConfig format */
  const effects = computed<Map<string, LayerEffectConfig>>(() => {
    const result = new Map<string, LayerEffectConfig>()
    for (const [layerId, pipeline] of pipelinesMap.value) {
      result.set(layerId, denormalizeToLayerEffectConfig(pipeline))
    }
    return result
  })

  /** Legacy: Effect config for selected layer */
  const selectedEffect = computed<LayerEffectConfig | null>(() => {
    const layerId = selectedLayerId.value
    if (!layerId) return null
    const pipeline = pipelinesMap.value.get(layerId)
    if (!pipeline) return null
    return denormalizeToLayerEffectConfig(pipeline)
  })

  // ============================================================
  // Internal Helpers
  // ============================================================

  function updatePipeline(layerId: string, updater: (current: SingleEffectConfig[]) => SingleEffectConfig[]): void {
    const current = pipelinesMap.value.get(layerId) ?? []
    const updated = updater(current)
    const newMap = new Map(pipelinesMap.value)
    newMap.set(layerId, updated)
    pipelinesMap.value = newMap
  }

  // ============================================================
  // New Multi-Effect Operations
  // ============================================================

  /**
   * Select a layer by ID
   * Initializes empty pipeline for the layer if it doesn't exist
   */
  function selectLayer(id: string): void {
    selectedLayerId.value = id

    // Initialize empty pipeline if not exists
    if (!pipelinesMap.value.has(id)) {
      const newMap = new Map(pipelinesMap.value)
      newMap.set(id, [])
      pipelinesMap.value = newMap
    }
  }

  /**
   * Add an effect to a layer's pipeline
   */
  function addEffect(layerId: string, effectType: EffectType, params?: Record<string, unknown>): void {
    const effect = createSingleEffectConfig(effectType, params)
    updatePipeline(layerId, (current) => [...current, effect])
  }

  /**
   * Remove an effect from a layer's pipeline by index
   */
  function removeEffect(layerId: string, index: number): void {
    updatePipeline(layerId, (current) => {
      if (index < 0 || index >= current.length) return current
      return [...current.slice(0, index), ...current.slice(index + 1)]
    })
  }

  /**
   * Update effect params at a specific index
   */
  function updateEffectAt(layerId: string, index: number, params: Record<string, unknown>): void {
    updatePipeline(layerId, (current) => {
      if (index < 0 || index >= current.length) return current
      const effect = current[index]!
      return [
        ...current.slice(0, index),
        { ...effect, params: { ...effect.params, ...params } },
        ...current.slice(index + 1),
      ]
    })
  }

  /**
   * Reorder effects in the pipeline
   */
  function reorderEffects(layerId: string, fromIndex: number, toIndex: number): void {
    updatePipeline(layerId, (current) => {
      if (fromIndex < 0 || fromIndex >= current.length) return current
      if (toIndex < 0 || toIndex >= current.length) return current
      if (fromIndex === toIndex) return current

      const result = [...current]
      const [effect] = result.splice(fromIndex, 1)
      result.splice(toIndex, 0, effect!)
      return result
    })
  }

  /**
   * Clear all effects from a layer
   */
  function clearEffects(layerId: string): void {
    updatePipeline(layerId, () => [])
  }

  /**
   * Set entire effect pipeline for a layer
   */
  function setEffectPipeline(layerId: string, effects: SingleEffectConfig[]): void {
    const newMap = new Map(pipelinesMap.value)
    newMap.set(layerId, effects)
    pipelinesMap.value = newMap
  }

  /**
   * Delete effect pipeline for a layer
   */
  function deleteEffectPipeline(layerId: string): void {
    const newMap = new Map(pipelinesMap.value)
    newMap.delete(layerId)
    pipelinesMap.value = newMap
  }

  // ============================================================
  // Legacy API (Backward Compatibility)
  // ============================================================

  /**
   * Set effect type for a layer (exclusive selection)
   * Preserves existing params if the effect was previously configured
   * @deprecated Use addEffect/removeEffect for multi-effect support
   */
  function setEffectType(layerId: string, type: EffectType | null): void {
    if (type === null) {
      clearEffects(layerId)
    } else {
      // Check current pipeline first
      const currentPipeline = pipelinesMap.value.get(layerId) ?? []
      const existingEffect = currentPipeline.find((e) => e.id === type)

      // If not in current pipeline, check legacy cache
      const layerCache = legacyParamsCache.get(layerId)
      const cachedParams = layerCache?.get(type)

      // Preserve existing params from pipeline or cache, or use defaults
      let effect: SingleEffectConfig
      if (existingEffect) {
        effect = { ...existingEffect }
      } else if (cachedParams) {
        effect = createSingleEffectConfig(type, cachedParams)
      } else {
        effect = createSingleEffectConfig(type)
      }

      // Exclusive selection: replace entire pipeline with single effect
      setEffectPipeline(layerId, [effect])
    }
  }

  /**
   * Update effect params for a layer (legacy API)
   * @deprecated Use updateEffectAt instead
   */
  function updateEffectParams<T extends EffectType>(
    layerId: string,
    type: T,
    params: Partial<Omit<LayerEffectConfig[T], 'enabled'>>
  ): void {
    // Update legacy cache for backward compatibility
    let layerCache = legacyParamsCache.get(layerId)
    if (!layerCache) {
      layerCache = new Map()
      legacyParamsCache.set(layerId, layerCache)
    }
    const existingCachedParams = layerCache.get(type) ?? {}
    layerCache.set(type, { ...existingCachedParams, ...params })

    // Update pipeline
    const pipeline = pipelinesMap.value.get(layerId) ?? []
    const index = pipeline.findIndex((e) => e.id === type)

    if (index >= 0) {
      // Update existing effect
      updateEffectAt(layerId, index, params as Record<string, unknown>)
    } else {
      // Add new effect with params
      addEffect(layerId, type, params as Record<string, unknown>)
    }
  }

  /**
   * Set entire effect config for a layer (accepts both formats)
   * @deprecated Use setEffectPipeline instead
   */
  function setEffectConfig(layerId: string, config: LayerEffectConfig | SingleEffectConfig[]): void {
    if (Array.isArray(config)) {
      setEffectPipeline(layerId, config)
    } else {
      // Convert LayerEffectConfig to SingleEffectConfig[]
      const pipeline = extractEnabledEffects(config)
      setEffectPipeline(layerId, pipeline)
    }
  }

  /**
   * Delete effect config for a layer
   * @deprecated Use deleteEffectPipeline instead
   */
  function deleteEffectConfig(layerId: string): void {
    deleteEffectPipeline(layerId)
  }

  // ============================================================
  // Return
  // ============================================================

  return {
    // New API
    effectPipelines,
    selectedLayerId,
    selectedPipeline,
    selectLayer,
    addEffect,
    removeEffect,
    updateEffectAt,
    reorderEffects,
    clearEffects,
    setEffectPipeline,
    deleteEffectPipeline,

    // Legacy API (deprecated)
    effects,
    selectedEffect,
    setEffectType,
    updateEffectParams,
    setEffectConfig,
    deleteEffectConfig,
  }
}
