import { ref, computed, type Ref, type ComputedRef, type WritableComputedRef } from 'vue'
import { getGoogleFontPresets, type FontPreset } from '@practice/font'
import {
  createForegroundElementUsecase,
  type ForegroundLayerConfig,
  type ForegroundElementConfig,
  type GridPosition,
  type HeroPrimitiveKey,
} from '../modules/HeroScene'

// ============================================================
// Types
// ============================================================

/**
 * Options for useForegroundElement composable
 */
export interface UseForegroundElementOptions {
  /** Foreground config ref from useHeroScene */
  foregroundConfig: Ref<ForegroundLayerConfig>
  /** Callback to clear canvas layer selection */
  clearCanvasSelection: () => void
}

/**
 * Return type for useForegroundElement composable
 */
export interface UseForegroundElementReturn {
  // Selection state
  /** Currently selected foreground element ID */
  selectedForegroundElementId: Ref<string | null>
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
  const { foregroundConfig, clearCanvasSelection } = options

  // ============================================================
  // Selection State
  // ============================================================

  const selectedForegroundElementId = ref<string | null>(null)

  // ============================================================
  // Usecase Setup
  // ============================================================

  const foregroundUsecase = createForegroundElementUsecase({
    foregroundConfig: {
      get: () => foregroundConfig.value,
      set: (config) => { foregroundConfig.value = config },
    },
    selection: {
      getSelectedId: () => selectedForegroundElementId.value,
      setSelectedId: (id) => { selectedForegroundElementId.value = id },
      clearCanvasSelection,
    },
  })

  // ============================================================
  // Selected Element
  // ============================================================

  const selectedForegroundElement = computed(() => foregroundUsecase.getSelectedElement())

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

  const selectedElementPosition = computed<GridPosition>({
    get: () => selectedForegroundElement.value?.position ?? 'middle-center',
    set: (pos) => {
      foregroundUsecase.updateSelectedElement({ position: pos })
    },
  })

  const selectedElementFont = computed<string | undefined>({
    get: () => selectedForegroundElement.value?.fontId,
    set: (fontId) => {
      foregroundUsecase.updateSelectedElement({ fontId })
    },
  })

  const selectedElementFontSize = computed<number>({
    get: () => selectedForegroundElement.value?.fontSize ?? (selectedForegroundElement.value?.type === 'title' ? 3 : 1),
    set: (fontSize) => {
      foregroundUsecase.updateSelectedElement({ fontSize })
    },
  })

  const selectedElementFontWeight = computed<number>({
    get: () => selectedForegroundElement.value?.fontWeight ?? 400,
    set: (fontWeight) => {
      foregroundUsecase.updateSelectedElement({ fontWeight })
    },
  })

  const selectedElementLetterSpacing = computed<number>({
    get: () => selectedForegroundElement.value?.letterSpacing ?? 0,
    set: (letterSpacing) => {
      foregroundUsecase.updateSelectedElement({ letterSpacing })
    },
  })

  const selectedElementLineHeight = computed<number>({
    get: () => selectedForegroundElement.value?.lineHeight ?? (selectedForegroundElement.value?.type === 'title' ? 1.2 : 1.5),
    set: (lineHeight) => {
      foregroundUsecase.updateSelectedElement({ lineHeight })
    },
  })

  const selectedElementContent = computed<string>({
    get: () => selectedForegroundElement.value?.content ?? '',
    set: (content) => {
      foregroundUsecase.updateSelectedElement({ content })
    },
  })

  const selectedElementColorKey = computed<HeroPrimitiveKey | 'auto'>({
    get: () => (selectedForegroundElement.value?.colorKey ?? 'auto') as HeroPrimitiveKey | 'auto',
    set: (colorKey) => {
      foregroundUsecase.updateSelectedElement({ colorKey })
    },
  })

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
