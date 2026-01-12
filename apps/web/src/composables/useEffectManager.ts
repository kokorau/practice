import { ref, shallowRef, computed, type Ref, type ComputedRef } from 'vue'
import {
  type EffectType,
  type LayerEffectConfig,
  createDefaultEffectConfig,
} from '../modules/HeroScene'

// ============================================================
// Types
// ============================================================

/**
 * Return type for useEffectManager composable
 */
export interface UseEffectManagerReturn {
  /** All layer effect configs (reactive Map) */
  effects: ComputedRef<Map<string, LayerEffectConfig>>
  /** Currently selected layer ID */
  selectedLayerId: Ref<string | null>
  /** Effect config for the currently selected layer */
  selectedEffect: ComputedRef<LayerEffectConfig | null>
  /** Select a layer by ID */
  selectLayer: (id: string) => void
  /** Set effect type for a layer (null to disable all effects) */
  setEffectType: (layerId: string, type: EffectType | null) => void
  /** Update effect params for a layer */
  updateEffectParams: <T extends EffectType>(
    layerId: string,
    type: T,
    params: Partial<Omit<LayerEffectConfig[T], 'enabled'>>
  ) => void
}

// ============================================================
// Composable
// ============================================================

/**
 * Composable for centralized effect state management
 *
 * Provides a single source of truth for all layer effect configurations.
 * Uses EffectRegistry for type-safe operations and supports:
 * - Layer selection tracking
 * - Exclusive effect type selection (only one effect enabled per layer)
 * - Effect parameter updates
 *
 * @example
 * ```ts
 * const {
 *   effects,
 *   selectedLayerId,
 *   selectedEffect,
 *   selectLayer,
 *   setEffectType,
 *   updateEffectParams,
 * } = useEffectManager()
 *
 * // Select a layer
 * selectLayer('layer-1')
 *
 * // Enable blur effect
 * setEffectType('layer-1', 'blur')
 *
 * // Update blur params
 * updateEffectParams('layer-1', 'blur', { radius: 15 })
 * ```
 */
export function useEffectManager(): UseEffectManagerReturn {
  // ============================================================
  // State
  // ============================================================

  /** Internal Map storing all layer effect configs */
  const effectsMap = shallowRef<Map<string, LayerEffectConfig>>(new Map())

  /** Currently selected layer ID */
  const selectedLayerId = ref<string | null>(null)

  // ============================================================
  // Computed
  // ============================================================

  /** Exposed readonly computed for effect configs */
  const effects = computed(() => effectsMap.value)

  /** Effect config for the currently selected layer */
  const selectedEffect = computed<LayerEffectConfig | null>(() => {
    const layerId = selectedLayerId.value
    if (!layerId) return null
    return effectsMap.value.get(layerId) ?? null
  })

  // ============================================================
  // Operations
  // ============================================================

  /**
   * Select a layer by ID
   * Initializes effect config for the layer if it doesn't exist
   */
  function selectLayer(id: string): void {
    selectedLayerId.value = id

    // Initialize effect config if not exists
    if (!effectsMap.value.has(id)) {
      const newMap = new Map(effectsMap.value)
      newMap.set(id, createDefaultEffectConfig())
      effectsMap.value = newMap
    }
  }

  /**
   * Set effect type for a layer (exclusive selection)
   * Pass null to disable all effects
   */
  function setEffectType(layerId: string, type: EffectType | null): void {
    const current = effectsMap.value.get(layerId) ?? createDefaultEffectConfig()

    // Build new config with exclusive selection
    // Update each effect type individually to maintain type safety
    const updated: LayerEffectConfig = {
      vignette: { ...current.vignette, enabled: type === 'vignette' },
      chromaticAberration: { ...current.chromaticAberration, enabled: type === 'chromaticAberration' },
      dotHalftone: { ...current.dotHalftone, enabled: type === 'dotHalftone' },
      lineHalftone: { ...current.lineHalftone, enabled: type === 'lineHalftone' },
      blur: { ...current.blur, enabled: type === 'blur' },
    }

    // Update map (trigger reactivity)
    const newMap = new Map(effectsMap.value)
    newMap.set(layerId, updated)
    effectsMap.value = newMap
  }

  /**
   * Update effect params for a layer
   * Does not change the enabled state
   */
  function updateEffectParams<T extends EffectType>(
    layerId: string,
    type: T,
    params: Partial<Omit<LayerEffectConfig[T], 'enabled'>>
  ): void {
    const current = effectsMap.value.get(layerId) ?? createDefaultEffectConfig()

    // Merge params into the effect config
    const updated: LayerEffectConfig = {
      ...current,
      [type]: {
        ...current[type],
        ...params,
      },
    }

    // Update map (trigger reactivity)
    const newMap = new Map(effectsMap.value)
    newMap.set(layerId, updated)
    effectsMap.value = newMap
  }

  // ============================================================
  // Return
  // ============================================================

  return {
    effects,
    selectedLayerId,
    selectedEffect,
    selectLayer,
    setEffectType,
    updateEffectParams,
  }
}
