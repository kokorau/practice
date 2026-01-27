import { ref, computed, type Ref, type ComputedRef, type WritableComputedRef } from 'vue'
import { getGoogleFontPresets, type FontPreset } from '@practice/font'
import {
  createForegroundElementUsecase,
  type ForegroundLayerConfig,
  type ForegroundElementConfig,
  type GridPosition,
  type HeroPrimitiveKey,
  type HeroViewRepository,
} from '@practice/section-visual'
import type { LayerSelectionReturn } from './useLayerSelection'

// ============================================================
// Types
// ============================================================

/**
 * Options for useForegroundElement composable
 */
export interface UseForegroundElementOptions {
  /** Foreground config ref from useHeroScene */
  foregroundConfig: Ref<ForegroundLayerConfig>
  /** Layer selection state from useLayerSelection */
  layerSelection: LayerSelectionReturn
  /** Optional: HeroViewRepository for direct access (ensures proper reactivity) */
  heroViewRepository?: HeroViewRepository
}

/**
 * Return type for useForegroundElement composable
 */
export interface UseForegroundElementReturn {
  // Selection state (from layerSelection)
  /** Currently selected foreground element ID (readonly) */
  selectedForegroundElementId: ComputedRef<string | null>
  /** Currently selected foreground element config */
  selectedForegroundElement: ComputedRef<ForegroundElementConfig | null>

  // Handler functions
  /** Select a foreground element by ID */
  handleSelectForegroundElement: (elementId: string) => void
  /** Add a new foreground element */
  handleAddForegroundElement: (type: 'title' | 'description') => void
  /** Remove a foreground element */
  handleRemoveForegroundElement: (elementId: string) => void

  // Selected element computed properties
  /** Position of selected element (writable) */
  selectedElementPosition: WritableComputedRef<GridPosition>
  /** Font ID of selected element (writable) */
  selectedElementFont: WritableComputedRef<string | undefined>
  /** Font size of selected element (writable) */
  selectedElementFontSize: WritableComputedRef<number>
  /** Font weight of selected element (writable, 100-900) */
  selectedElementFontWeight: WritableComputedRef<number>
  /** Letter spacing of selected element (writable, em units) */
  selectedElementLetterSpacing: WritableComputedRef<number>
  /** Line height of selected element (writable, unitless multiplier) */
  selectedElementLineHeight: WritableComputedRef<number>
  /** Content of selected element (writable) */
  selectedElementContent: WritableComputedRef<string>
  /** Color key of selected element (writable) */
  selectedElementColorKey: WritableComputedRef<HeroPrimitiveKey | 'auto'>

  // Font panel state
  /** Whether the font panel is open */
  isFontPanelOpen: Ref<boolean>
  /** All available font presets */
  allFontPresets: ComputedRef<FontPreset[]>
  /** Currently selected font preset */
  selectedFontPreset: ComputedRef<FontPreset | null>
  /** Display name of selected font */
  selectedFontDisplayName: ComputedRef<string>
  /** Open the font panel */
  openFontPanel: () => void
  /** Close the font panel */
  closeFontPanel: () => void
}

// ============================================================
// Composable
// ============================================================

/**
 * Composable for managing foreground element state and operations
 *
 * Handles:
 * - Selection state for foreground elements
 * - CRUD operations via ForegroundElementUsecase
 * - Selected element property bindings
 * - Font panel state management
 */
export function useForegroundElement(
  options: UseForegroundElementOptions
): UseForegroundElementReturn {
  const { foregroundConfig, layerSelection, heroViewRepository } = options

  // ============================================================
  // Config Access (use repository if available for proper reactivity)
  // ============================================================

  // When heroViewRepository is provided, use it directly to ensure Vue's reactivity
  // system properly tracks changes. The repository.get() call inside a computed
  // triggers proper dependency tracking.
  const getForegroundConfig = (): ForegroundLayerConfig => {
    if (heroViewRepository) {
      return heroViewRepository.get().foreground
    }
    return foregroundConfig.value
  }

  const setForegroundConfig = (config: ForegroundLayerConfig): void => {
    if (heroViewRepository) {
      heroViewRepository.updateForeground(config)
    } else {
      foregroundConfig.value = config
    }
  }

  // ============================================================
  // Selection State (derived from layerSelection)
  // ============================================================

  const selectedForegroundElementId = computed(() => layerSelection.foregroundElementId.value)

  // ============================================================
  // Usecase Setup
  // ============================================================

  const foregroundUsecase = createForegroundElementUsecase({
    foregroundConfig: {
      get: getForegroundConfig,
      set: setForegroundConfig,
    },
    selection: {
      getSelectedId: () => layerSelection.foregroundElementId.value,
      setSelectedId: (id) => {
        if (id !== null) {
          layerSelection.selectForegroundElement(id)
        } else {
          layerSelection.clearSelection()
        }
      },
      clearCanvasSelection: () => { /* Not needed: selectForegroundElement already clears canvas selection */ },
    },
  })

  // ============================================================
  // Selected Element
  // ============================================================

  // Direct computed access to ensure Vue's reactivity system properly tracks dependencies
  // When repository is available, use it directly to get the latest foreground config
  const selectedForegroundElement = computed(() => {
    const selectedId = layerSelection.foregroundElementId.value
    if (!selectedId) return null
    const config = getForegroundConfig()
    return config.elements.find((el) => el.id === selectedId) ?? null
  })

  // ============================================================
  // Handler Functions
  // ============================================================

  const handleSelectForegroundElement = (elementId: string): void => {
    foregroundUsecase.selectElement(elementId)
  }

  const handleAddForegroundElement = (type: 'title' | 'description'): void => {
    foregroundUsecase.addElement(type)
  }

  const handleRemoveForegroundElement = (elementId: string): void => {
    foregroundUsecase.removeElement(elementId)
  }

  // ============================================================
  // Selected Element Computed Properties
  // ============================================================

  // Factory for creating writable computed properties that update via usecase
  const createElementProp = <T>(getter: () => T, key: string) =>
    computed<T>({
      get: getter,
      set: (value) => foregroundUsecase.updateSelectedElement({ [key]: value }),
    })

  const el = selectedForegroundElement

  const selectedElementPosition = createElementProp<GridPosition>(
    () => el.value?.position ?? 'middle-center', 'position')
  const selectedElementFont = createElementProp<string | undefined>(
    () => el.value?.fontId, 'fontId')
  const selectedElementFontSize = createElementProp<number>(
    () => el.value?.fontSize ?? (el.value?.type === 'title' ? 3 : 1), 'fontSize')
  const selectedElementFontWeight = createElementProp<number>(
    () => el.value?.fontWeight ?? 400, 'fontWeight')
  const selectedElementLetterSpacing = createElementProp<number>(
    () => el.value?.letterSpacing ?? 0, 'letterSpacing')
  const selectedElementLineHeight = createElementProp<number>(
    () => el.value?.lineHeight ?? (el.value?.type === 'title' ? 1.2 : 1.5), 'lineHeight')
  const selectedElementContent = createElementProp<string>(
    () => el.value?.content ?? '', 'content')
  const selectedElementColorKey = createElementProp<HeroPrimitiveKey | 'auto'>(
    () => (el.value?.colorKey ?? 'auto') as HeroPrimitiveKey | 'auto', 'colorKey')

  // ============================================================
  // Font Panel State
  // ============================================================

  const isFontPanelOpen = ref(false)

  const allFontPresets = computed(() => getGoogleFontPresets({ excludeIconFonts: true }))

  const selectedFontPreset = computed(() => {
    const fontId = selectedElementFont.value
    if (!fontId) return null
    return allFontPresets.value.find(p => p.id === fontId) ?? null
  })

  const selectedFontDisplayName = computed(() => {
    return selectedFontPreset.value?.name ?? 'System Default'
  })

  const openFontPanel = (): void => {
    isFontPanelOpen.value = true
  }

  const closeFontPanel = (): void => {
    isFontPanelOpen.value = false
  }

  // ============================================================
  // Return
  // ============================================================

  return {
    // Selection state
    selectedForegroundElementId,
    selectedForegroundElement,

    // Handler functions
    handleSelectForegroundElement,
    handleAddForegroundElement,
    handleRemoveForegroundElement,

    // Selected element computed properties
    selectedElementPosition,
    selectedElementFont,
    selectedElementFontSize,
    selectedElementFontWeight,
    selectedElementLetterSpacing,
    selectedElementLineHeight,
    selectedElementContent,
    selectedElementColorKey,

    // Font panel state
    isFontPanelOpen,
    allFontPresets,
    selectedFontPreset,
    selectedFontDisplayName,
    openFontPanel,
    closeFontPanel,
  }
}
