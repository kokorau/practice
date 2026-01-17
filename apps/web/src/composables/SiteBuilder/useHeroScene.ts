/**
 * useHeroScene
 *
 * HeroSceneモジュールをVueのリアクティブシステムと連携するcomposable
 * 現在は2レイヤー固定（base, mask）
 *
 * This composable has been refactored to delegate to smaller, focused composables:
 * - useHeroColors: Color and theme management
 * - useHeroFilters: Filter and effect management
 * - useHeroRenderer: Scene rendering logic
 * - useHeroThumbnails: Thumbnail rendering for UI
 * - useHeroImages: Image upload and management
 */

import { ref, shallowRef, computed, watch, onUnmounted, type ComputedRef, type Ref } from 'vue'
import {
  getSurfacePresets,
  MaskShapeSchemas,
  SurfaceSchemas,
  type RGBA,
  type SurfacePreset,
  type SurfacePresetParams,
  type StripePresetParams,
  type GridPresetParams,
  type PolkaDotPresetParams,
  type CheckerPresetParams,
  type CircleMaskShapeParams,
  type RectMaskShapeParams,
  type BlobMaskShapeParams,
  type PerlinMaskShapeParams,
  type LinearGradientMaskShapeParams,
  type RadialGradientMaskShapeParams,
  type BoxGradientMaskShapeParams,
  type WavyLineMaskShapeParams,
  type StripeSurfaceParams,
  type GridSurfaceParams,
  type PolkaDotSurfaceParams,
  type CheckerSurfaceParams,
  type SolidSurfaceParams,
  type TriangleSurfaceParams,
  type HexagonSurfaceParams,
  type DepthMapType,
} from '@practice/texture'
import type { ObjectSchema } from '@practice/schema'
import type { PrimitivePalette, ContextName, PrimitiveKey } from '../../modules/SemanticColorPalette/Domain'
import {
  type LayerEffectConfig,
  type HeroSceneConfig,
  type HtmlLayer,
  type HeroViewConfig,
  type HeroPrimitiveKey,
  type HeroSurfaceConfig,
  type MaskShapeConfig as HeroMaskShapeConfig,
  type LayerNodeConfig,
  type BaseLayerNodeConfig,
  type SurfaceLayerNodeConfig,
  type SurfaceColorsConfig,
  type GroupLayerNodeConfig,
  type TextLayerNodeConfigType,
  type Model3DLayerNodeConfig,
  type MaskProcessorConfig,
  type ProcessorNodeConfig,
  type ForegroundLayerConfig,
  type HeroViewPreset,
  type TextLayerConfig,
  type HeroViewRepository,
  createDefaultEffectConfig,
  createDefaultForegroundConfig,
  createDefaultColorsConfig,
  DEFAULT_LAYER_BACKGROUND_COLORS,
  DEFAULT_LAYER_MASK_COLORS,
  createInMemoryHeroViewPresetRepository,
  createBrowserPresetExporter,
  type ExportPresetOptions,
  createPresetManager,
  type MergeMode,
  findSurfacePresetIndex,
  findMaskPatternIndex,
  updateTextLayerText,
  updateTextLayerFont,
  updateTextLayerColor,
  updateTextLayerPosition,
  updateTextLayerRotation,
  createHeroViewInMemoryRepository,
  createSurfaceUsecase,
  updateBrandColor,
  updateAccentColor,
  updateFoundationColor,
  applyColorPreset,
  addLayer as addLayerUsecase,
  removeLayer as removeLayerUsecase,
  toggleExpand as toggleExpandUsecase,
  toggleVisibility as toggleVisibilityUsecase,
  updateLayer as updateLayerUsecase,
  createForegroundElementUsecase,
  type ForegroundConfigPort,
  type SelectionPort,
  HERO_CANVAS_DIMENSIONS,
  toCustomMaskShapeParams,
  fromCustomMaskShapeParams,
  toCustomSurfaceParams,
  toCustomBackgroundSurfaceParams,
  fromCustomSurfaceParams,
  type HeroEditorUIState,
  createDefaultHeroEditorUIState,
  syncBackgroundSurfaceParams,
  syncMaskSurfaceParams,
  type PatternState,
  type BackgroundState,
  type MaskState,
  type FilterState,
  type ForegroundState,
  type PresetState,
  type LayerOperations,
  type InkColorHelpers,
  type CanvasState,
  type SerializationState,
  type UsecaseState,
  type EditorStateRef,
  type RendererActions,
  renderHeroConfig,
  migrateHeroViewConfig,
} from '../../modules/HeroScene'
import { createLayerSelection, type LayerSelectionReturn } from '../useLayerSelection'

// Import extracted composables
import { useHeroColors } from './useHeroColors'
import { useHeroFilters } from './useHeroFilters'
import { useHeroThumbnails } from './useHeroThumbnails'
import { useHeroImages } from './useHeroImages'

// Layer IDs for template layers
const BASE_LAYER_ID = 'background'

// Re-export types from extracted composables
export type { SectionType } from './useHeroThumbnails'
export type { ElementBounds } from './useHeroColors'

// ============================================================
// Internal Legacy Types (minimal, kept for viewport config)
// ============================================================

/** @internal Editor state for viewport and html layer config */
interface HeroSceneEditorState {
  config: HeroSceneConfig
  htmlLayer: HtmlLayer
}

/** @internal Create default editor state */
const createHeroSceneEditorState = (
  config?: Partial<HeroSceneConfig>
): HeroSceneEditorState => ({
  config: {
    width: 1280,
    height: 720,
    devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
    ...config,
  },
  htmlLayer: {
    id: 'html-layer',
    name: 'HTML Layer',
    visible: true,
    opacity: 1.0,
    layoutId: 'row-top-between',
    items: [],
  },
})

// ============================================================
// Types
// ============================================================

/**
 * Type alias for MidgroundSurfacePreset (now uses SurfacePreset from @practice/texture)
 * @deprecated Use SurfacePreset directly
 */
export type MidgroundSurfacePreset = SurfacePreset

/**
 * Pattern-based surface preset params (excludes solid and gradientGrain)
 */
export type PatternPresetParams = StripePresetParams | GridPresetParams | PolkaDotPresetParams | CheckerPresetParams

/**
 * Type guard to check if preset params is a pattern type
 */
export const isPatternPresetParams = (
  params: SurfacePresetParams
): params is PatternPresetParams => {
  return params.type !== 'solid' && params.type !== 'gradientGrain'
}

/**
 * Custom mask shape params union type
 */
export type CustomMaskShapeParams =
  | ({ type: 'circle' } & CircleMaskShapeParams)
  | ({ type: 'rect' } & RectMaskShapeParams)
  | ({ type: 'blob' } & BlobMaskShapeParams)
  | ({ type: 'perlin' } & PerlinMaskShapeParams)
  | ({ type: 'linearGradient' } & LinearGradientMaskShapeParams)
  | ({ type: 'radialGradient' } & RadialGradientMaskShapeParams)
  | ({ type: 'boxGradient' } & BoxGradientMaskShapeParams)
  | ({ type: 'wavyLine' } & WavyLineMaskShapeParams)

/**
 * Textile pattern surface params
 */
export interface AsanohaSurfaceParams {
  size: number
  lineWidth: number
}

export interface SeigaihaSurfaceParams {
  radius: number
  rings: number
  lineWidth: number
}

export interface WaveSurfaceParams {
  amplitude: number
  wavelength: number
  thickness: number
  angle: number
}

export interface ScalesSurfaceParams {
  size: number
  overlap: number
  angle: number
}

export interface OgeeSurfaceParams {
  width: number
  height: number
  lineWidth: number
}

export interface SunburstSurfaceParams {
  rays: number
  centerX: number
  centerY: number
  twist: number
}

/**
 * Custom surface params union type
 */
export type CustomSurfaceParams =
  | { type: 'solid' }
  | ({ type: 'stripe' } & StripeSurfaceParams)
  | ({ type: 'grid' } & GridSurfaceParams)
  | ({ type: 'polkaDot' } & PolkaDotSurfaceParams)
  | ({ type: 'checker' } & CheckerSurfaceParams)
  | ({ type: 'gradientGrain' } & GradientGrainSurfaceParams)
  | ({ type: 'triangle' } & TriangleSurfaceParams)
  | ({ type: 'hexagon' } & HexagonSurfaceParams)
  | ({ type: 'asanoha' } & AsanohaSurfaceParams)
  | ({ type: 'seigaiha' } & SeigaihaSurfaceParams)
  | ({ type: 'wave' } & WaveSurfaceParams)
  | ({ type: 'scales' } & ScalesSurfaceParams)
  | ({ type: 'ogee' } & OgeeSurfaceParams)
  | ({ type: 'sunburst' } & SunburstSurfaceParams)

/**
 * Gradient grain surface params
 */
export interface GradientGrainSurfaceParams {
  depthMapType: DepthMapType
  angle: number
  centerX: number
  centerY: number
  radialStartAngle: number
  radialSweepAngle: number
  perlinScale: number
  perlinOctaves: number
  perlinContrast: number
  perlinOffset: number
  colorA: RGBA
  colorB: RGBA
  seed: number
  sparsity: number
  curvePoints: number[]
}

/**
 * Custom background surface params union type
 */
export type CustomBackgroundSurfaceParams =
  | ({ type: 'stripe' } & StripeSurfaceParams)
  | ({ type: 'grid' } & GridSurfaceParams)
  | ({ type: 'polkaDot' } & PolkaDotSurfaceParams)
  | ({ type: 'checker' } & CheckerSurfaceParams)
  | ({ type: 'gradientGrain' } & GradientGrainSurfaceParams)
  | ({ type: 'triangle' } & TriangleSurfaceParams)
  | ({ type: 'hexagon' } & HexagonSurfaceParams)
  | ({ type: 'asanoha' } & AsanohaSurfaceParams)
  | ({ type: 'seigaiha' } & SeigaihaSurfaceParams)
  | ({ type: 'wave' } & WaveSurfaceParams)
  | ({ type: 'scales' } & ScalesSurfaceParams)
  | ({ type: 'ogee' } & OgeeSurfaceParams)
  | ({ type: 'sunburst' } & SunburstSurfaceParams)
  | { type: 'solid' }

export interface UseHeroSceneOptions {
  primitivePalette: ComputedRef<PrimitivePalette>
  isDark: Ref<boolean> | ComputedRef<boolean>
  repository?: HeroViewRepository
  layerSelection?: LayerSelectionReturn
}

// ============================================================
// Constants
// ============================================================

const LAYER_IDS = {
  BASE: 'background',
  MASK: 'surface-mask',
} as const

// ============================================================
// Composable
// ============================================================

export const useHeroScene = (options: UseHeroSceneOptions) => {
  const { primitivePalette, isDark, repository, layerSelection = createLayerSelection() } = options

  // ============================================================
  // Editor State (unified UI state management)
  // ============================================================
  const editorState = ref<HeroSceneEditorState>(createHeroSceneEditorState(HERO_CANVAS_DIMENSIONS))
  const editorUIState = ref<HeroEditorUIState>(createDefaultHeroEditorUIState())

  // Computed accessors for backward compatibility
  const selectedBackgroundIndex = computed({
    get: () => editorUIState.value.background.selectedPresetIndex ?? 3,
    set: (val: number) => { editorUIState.value.background.selectedPresetIndex = val },
  })
  const selectedMaskIndex = computed({
    get: () => editorUIState.value.mask.selectedShapePresetIndex,
    set: (val: number | null) => { editorUIState.value.mask.selectedShapePresetIndex = val },
  })
  const selectedMidgroundTextureIndex = computed({
    get: () => editorUIState.value.mask.selectedTexturePresetIndex,
    set: (val: number) => { editorUIState.value.mask.selectedTexturePresetIndex = val },
  })

  // ============================================================
  // HeroViewRepository & Usecases
  // ============================================================
  const heroViewRepository = repository ?? createHeroViewInMemoryRepository()

  // Reactive config derived from Repository
  const repoConfig = shallowRef<HeroViewConfig>(heroViewRepository.get())

  // Layer selection for unified surface usecase
  const { layerId: selectedLayerId, selectCanvasLayer } = layerSelection
  const selectionPort = {
    getSelectedLayerId: () => selectedLayerId.value,
  }
  const surfaceUsecase = createSurfaceUsecase({
    repository: heroViewRepository,
    selection: selectionPort,
    imageUpload: {
      upload: async () => '',
      fetchRandom: async () => new File([], ''),
    },
  })

  // Flag to skip watcher updates during fromHeroViewConfig execution
  const isLoadingFromConfig = ref(false)

  // ============================================================
  // Foreground Config (HTML Layer)
  // ============================================================
  const foregroundConfig = ref<ForegroundLayerConfig>(createDefaultForegroundConfig())

  // ============================================================
  // Canvas ImageData for contrast analysis
  // ============================================================
  const canvasImageData = shallowRef<ImageData | null>(null)

  // ============================================================
  // Initialize Colors Composable
  // ============================================================
  const heroColors = useHeroColors({
    primitivePalette,
    isDark,
    canvasImageData,
    foregroundConfig,
  })

  // ============================================================
  // Initialize Filters Composable
  // ============================================================
  const heroFilters = useHeroFilters({
    layerIds: LAYER_IDS,
    heroViewRepository,
    isLoadingFromConfig,
  })

  // ============================================================
  // Initialize Thumbnails Composable
  // ============================================================
  const heroThumbnails = useHeroThumbnails({
    textureColor1: heroColors.textureColor1,
    textureColor2: heroColors.textureColor2,
    midgroundTextureColor1: heroColors.midgroundTextureColor1,
    midgroundTextureColor2: heroColors.midgroundTextureColor2,
    selectedBackgroundIndex,
  })

  // ============================================================
  // Color Usecase wrappers
  // ============================================================
  const colorUsecase = {
    updateBrandColor: (params: { hue?: number; saturation?: number; value?: number }) => {
      updateBrandColor(params, heroViewRepository)
    },
    updateAccentColor: (params: { hue?: number; saturation?: number; value?: number }) => {
      updateAccentColor(params, heroViewRepository)
    },
    updateFoundationColor: (params: { hue?: number; saturation?: number; value?: number }) => {
      updateFoundationColor(params, heroViewRepository)
    },
    applyColorPreset: (preset: {
      id: string
      name: string
      description: string
      brand: { hue: number; saturation: number; value: number }
      accent: { hue: number; saturation: number; value: number }
      foundation: { hue: number; saturation: number; value: number }
    }) => {
      applyColorPreset(preset, heroViewRepository)
    },
  }

  // ============================================================
  // Layer Usecase wrappers
  // ============================================================
  const layerUsecase = {
    addLayer: (layer: LayerNodeConfig, index?: number) => addLayerUsecase(layer, heroViewRepository, index),
    removeLayer: (layerId: string) => removeLayerUsecase(layerId, heroViewRepository),
    toggleExpand: (layerId: string) => toggleExpandUsecase(layerId, heroViewRepository),
    toggleVisibility: (layerId: string) => toggleVisibilityUsecase(layerId, heroViewRepository),
    updateLayer: (layerId: string, updates: Partial<LayerNodeConfig>) => updateLayerUsecase(layerId, updates, heroViewRepository),
  }

  // ============================================================
  // Preset Manager & Usecase wrappers
  // ============================================================
  const presetRepository = createInMemoryHeroViewPresetRepository()
  const presetExportAdapter = createBrowserPresetExporter()
  const presetManager = createPresetManager({
    presetRepository,
    heroViewRepository,
    presetExportPort: presetExportAdapter,
  })

  const presetUsecase = {
    exportPreset: (options?: { id?: string; name?: string }) => {
      return presetManager.exportAsPreset(options)
    },
    createPreset: (options?: { id?: string; name?: string }) => {
      return presetManager.createPreset(options)
    },
  }

  // ============================================================
  // ForegroundElement Usecase
  // ============================================================
  const selectedForegroundElementId = computed({
    get: () => editorUIState.value.foreground.selectedElementId,
    set: (val: string | null) => { editorUIState.value.foreground.selectedElementId = val },
  })

  let _foregroundElementUsecase: ReturnType<typeof createForegroundElementUsecase> | null = null

  const getForegroundElementUsecase = () => {
    if (!_foregroundElementUsecase) {
      const foregroundConfigPort: ForegroundConfigPort = {
        get: () => foregroundConfig.value,
        set: (config: ForegroundLayerConfig) => {
          foregroundConfig.value = config
        },
      }

      const foregroundSelectionPort: SelectionPort = {
        getSelectedId: () => selectedForegroundElementId.value,
        setSelectedId: (id: string | null) => {
          selectedForegroundElementId.value = id
        },
        clearCanvasSelection: () => {
          heroFilters.selectedFilterLayerId.value = null
        },
      }

      _foregroundElementUsecase = createForegroundElementUsecase({
        foregroundConfig: foregroundConfigPort,
        selection: foregroundSelectionPort,
      })
    }
    return _foregroundElementUsecase
  }

  const foregroundElementUsecase = {
    getSelectedElement: () => getForegroundElementUsecase().getSelectedElement(),
    selectElement: (elementId: string | null) => getForegroundElementUsecase().selectElement(elementId),
    addElement: (type: 'title' | 'description') => getForegroundElementUsecase().addElement(type),
    removeElement: (elementId: string) => getForegroundElementUsecase().removeElement(elementId),
    updateElement: (elementId: string, updates: { position?: string; content?: string; fontId?: string; fontSize?: number; colorKey?: string }) => getForegroundElementUsecase().updateElement(elementId, updates as Parameters<ReturnType<typeof createForegroundElementUsecase>['updateElement']>[1]),
    updateSelectedElement: (updates: { position?: string; content?: string; fontId?: string; fontSize?: number; colorKey?: string }) => getForegroundElementUsecase().updateSelectedElement(updates as Parameters<ReturnType<typeof createForegroundElementUsecase>['updateSelectedElement']>[0]),
  }

  // ============================================================
  // Custom Shape/Surface Params State
  // ============================================================

  const extractSurfaceParams = (preset: MidgroundSurfacePreset, colorA: RGBA, colorB: RGBA): CustomSurfaceParams => {
    return toCustomSurfaceParams(preset.params, colorA, colorB)
  }

  const extractBackgroundSurfaceParams = (params: SurfacePresetParams, colorA: RGBA, colorB: RGBA): CustomBackgroundSurfaceParams => {
    return toCustomBackgroundSurfaceParams(params, colorA, colorB)
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

  // Current custom params (derived from Repository via repoConfig)
  const customMaskShapeParams = computed({
    get: (): CustomMaskShapeParams | null => {
      const config = repoConfig.value
      if (!config) return null
      const processor = findProcessorWithMask(config.layers)
      if (!processor) return null
      const maskModifier = processor.modifiers.find((m): m is MaskProcessorConfig => m.type === 'mask')
      if (!maskModifier) return null
      return toCustomMaskShapeParams(maskModifier.shape)
    },
    set: (val: CustomMaskShapeParams | null) => {
      if (val === null) return
      const config = repoConfig.value
      if (!config) return
      // Find processor layer with mask modifier and update it
      const processor = findProcessorWithMask(config.layers)
      if (!processor) return
      const maskModifierIndex = processor.modifiers.findIndex((m): m is MaskProcessorConfig => m.type === 'mask')
      if (maskModifierIndex === -1) return
      const newModifiers = [...processor.modifiers]
      const existingMask = newModifiers[maskModifierIndex] as MaskProcessorConfig
      newModifiers[maskModifierIndex] = {
        ...existingMask,
        shape: fromCustomMaskShapeParams(val),
      }
      heroViewRepository.updateLayer(processor.id, { modifiers: newModifiers } as Partial<ProcessorNodeConfig>)
    },
  })

  const customSurfaceParams = computed({
    get: (): CustomSurfaceParams | null => {
      const result = syncMaskSurfaceParams(repoConfig.value, heroColors.midgroundTextureColor1.value, heroColors.midgroundTextureColor2.value)
      return result.surfaceParams
    },
    set: (val: CustomSurfaceParams | null) => {
      if (val === null) return
      // Use selected layer ID if available, otherwise fallback to 'surface-mask'
      const targetLayerId = selectedLayerId.value ?? 'surface-mask'
      heroViewRepository.updateLayer(targetLayerId, { surface: fromCustomSurfaceParams(val) })
    },
  })

  const customBackgroundSurfaceParams = computed({
    get: (): CustomBackgroundSurfaceParams | null => {
      const result = syncBackgroundSurfaceParams(repoConfig.value, heroColors.textureColor1.value, heroColors.textureColor2.value)
      return result.surfaceParams
    },
    set: (val: CustomBackgroundSurfaceParams | null) => {
      if (val === null) return
      heroViewRepository.updateLayer(BASE_LAYER_ID, { surface: fromCustomSurfaceParams(val) })
    },
  })

  // Current schema for UI rendering
  const currentMaskShapeSchema = computed(() => {
    if (!customMaskShapeParams.value) return null
    return MaskShapeSchemas[customMaskShapeParams.value.type] as ObjectSchema
  })

  const currentSurfaceSchema = computed(() => {
    if (!customSurfaceParams.value) return null
    return SurfaceSchemas[customSurfaceParams.value.type] as ObjectSchema
  })

  const currentBackgroundSurfaceSchema = computed(() => {
    if (!customBackgroundSurfaceParams.value) return null
    return SurfaceSchemas[customBackgroundSurfaceParams.value.type] as ObjectSchema
  })

  // ============================================================
  // Pattern Preset Initialization
  // ============================================================
  const midgroundTexturePatterns = heroThumbnails.midgroundTexturePatterns
  const maskPatterns = heroThumbnails.maskPatterns
  const surfacePresets = getSurfacePresets()

  const setBaseSurface = (surface: HeroSurfaceConfig) => {
    heroViewRepository.updateLayer(BASE_LAYER_ID, { surface })
  }

  const initMaskShapeParamsFromPreset = () => {
    const idx = selectedMaskIndex.value
    if (idx === null) return
    const pattern = maskPatterns[idx]
    if (pattern) {
      customMaskShapeParams.value = toCustomMaskShapeParams(pattern.maskConfig)
    }
  }

  const initSurfaceParamsFromPreset = () => {
    const idx = selectedMidgroundTextureIndex.value
    const preset = midgroundTexturePatterns[idx]
    if (preset) {
      customSurfaceParams.value = extractSurfaceParams(preset, heroColors.midgroundTextureColor1.value, heroColors.midgroundTextureColor2.value)
    }
  }

  const initBackgroundSurfaceParamsFromPreset = () => {
    const idx = selectedBackgroundIndex.value
    const preset = surfacePresets[idx]
    if (preset) {
      const params = extractBackgroundSurfaceParams(preset.params, heroColors.textureColor1.value, heroColors.textureColor2.value)
      if (params.type === 'solid') {
        setBaseSurface({ type: 'solid' })
      } else if (params.type === 'stripe') {
        setBaseSurface({ type: 'stripe', width1: params.width1, width2: params.width2, angle: params.angle })
      } else if (params.type === 'grid') {
        setBaseSurface({ type: 'grid', lineWidth: params.lineWidth, cellSize: params.cellSize })
      } else if (params.type === 'polkaDot') {
        setBaseSurface({ type: 'polkaDot', dotRadius: params.dotRadius, spacing: params.spacing, rowOffset: params.rowOffset })
      } else if (params.type === 'checker') {
        setBaseSurface({ type: 'checker', cellSize: params.cellSize, angle: params.angle })
      } else if (params.type === 'gradientGrain') {
        customBackgroundSurfaceParams.value = params
      } else if (params.type === 'asanoha') {
        customBackgroundSurfaceParams.value = params
      } else if (params.type === 'seigaiha') {
        customBackgroundSurfaceParams.value = params
      } else if (params.type === 'wave') {
        customBackgroundSurfaceParams.value = params
      } else if (params.type === 'scales') {
        customBackgroundSurfaceParams.value = params
      } else if (params.type === 'ogee') {
        customBackgroundSurfaceParams.value = params
      } else if (params.type === 'sunburst') {
        customBackgroundSurfaceParams.value = params
      }
    } else {
      customBackgroundSurfaceParams.value = null
    }
  }

  const updateMaskShapeParams = (updates: Partial<CircleMaskShapeParams | RectMaskShapeParams | BlobMaskShapeParams>) => {
    if (!customMaskShapeParams.value) return
    customMaskShapeParams.value = { ...customMaskShapeParams.value, ...updates } as CustomMaskShapeParams
  }

  const updateSurfaceParams = (updates: Partial<StripeSurfaceParams | GridSurfaceParams | PolkaDotSurfaceParams>) => {
    if (!customSurfaceParams.value) return
    customSurfaceParams.value = { ...customSurfaceParams.value, ...updates } as CustomSurfaceParams
  }

  const updateBackgroundSurfaceParams = (updates: Partial<StripeSurfaceParams | GridSurfaceParams | PolkaDotSurfaceParams | CheckerSurfaceParams | SolidSurfaceParams | GradientGrainSurfaceParams>) => {
    if (!customBackgroundSurfaceParams.value) return
    const type = customBackgroundSurfaceParams.value.type
    const layer = heroViewRepository.findLayer(BASE_LAYER_ID)
    if (!layer || layer.type !== 'surface') return
    const currentSurface = layer.surface
    if (currentSurface.type !== type) return
    const newSurface = { ...currentSurface, ...updates } as HeroSurfaceConfig
    heroViewRepository.updateLayer(BASE_LAYER_ID, { surface: newSurface })
  }

  // ============================================================
  // Layer Management
  // ============================================================

  const addMaskLayer = (): string | null => {
    console.warn('addMaskLayer: Multiple clip groups are not yet supported')
    return null
  }

  const addTextLayer = (options?: Partial<{
    text: string
    fontFamily: string
    fontSize: number
    fontWeight: number
    letterSpacing: number
    lineHeight: number
    color: string
    x: number
    y: number
    anchor: 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
    rotation: number
  }>): string => {
    const id = `text-${Date.now()}`
    const textLayerConfig: TextLayerNodeConfigType = {
      type: 'text',
      id,
      name: options?.text?.slice(0, 20) || 'Text Layer',
      visible: true,
      text: options?.text ?? 'Text',
      fontFamily: options?.fontFamily ?? 'sans-serif',
      fontSize: options?.fontSize ?? 48,
      fontWeight: options?.fontWeight ?? 400,
      letterSpacing: options?.letterSpacing ?? 0,
      lineHeight: options?.lineHeight ?? 1.2,
      color: options?.color ?? '#000000',
      position: {
        x: options?.x ?? 0.5,
        y: options?.y ?? 0.5,
        anchor: options?.anchor ?? 'center',
      },
      rotation: options?.rotation ?? 0,
    }
    layerUsecase.addLayer(textLayerConfig)
    heroFilters.effectManager.setEffectConfig(id, createDefaultEffectConfig())
    render()
    return id
  }

  const addObjectLayer = (options?: Partial<{
    modelUrl: string
    x: number
    y: number
    z: number
    rotationX: number
    rotationY: number
    rotationZ: number
    scale: number
  }>): string => {
    const id = `object-${Date.now()}`
    const model3DLayerConfig: Model3DLayerNodeConfig = {
      type: 'model3d',
      id,
      name: 'Object Layer',
      visible: true,
      modelUrl: options?.modelUrl ?? '',
      position: {
        x: options?.x ?? 0,
        y: options?.y ?? 0,
        z: options?.z ?? 0,
      },
      rotation: {
        x: options?.rotationX ?? 0,
        y: options?.rotationY ?? 0,
        z: options?.rotationZ ?? 0,
      },
      scale: options?.scale ?? 1,
    }
    layerUsecase.addLayer(model3DLayerConfig)
    heroFilters.effectManager.setEffectConfig(id, createDefaultEffectConfig())
    render()
    return id
  }

  const removeLayer = (id: string): boolean => {
    if (id === LAYER_IDS.BASE) return false
    const existingConfig = heroViewRepository.get()
    if (!existingConfig) return false
    const layerExists = existingConfig.layers.some(l => l.id === id)
    if (!layerExists) return false
    layerUsecase.removeLayer(id)
    heroFilters.effectManager.deleteEffectConfig(id)
    render()
    return true
  }

  const updateLayerVisibility = (id: string, visible: boolean) => {
    layerUsecase.updateLayer(id, { visible })
    render()
  }

  const toggleLayerVisibility = (id: string) => {
    const existingConfig = heroViewRepository.get()
    if (!existingConfig) return
    const layer = existingConfig.layers.find(l => l.id === id)
    if (!layer) return
    layerUsecase.toggleVisibility(id)
    render()
  }

  const updateTextLayerConfig = (id: string, updates: Partial<TextLayerConfig>) => {
    const existingConfig = heroViewRepository.get()
    if (!existingConfig) return
    const layer = existingConfig.layers.find(l => l.id === id)
    if (!layer || layer.type !== 'text') return

    if (updates.text !== undefined) {
      updateTextLayerText(id, updates.text, heroViewRepository)
    }
    if (updates.fontFamily !== undefined || updates.fontSize !== undefined ||
        updates.fontWeight !== undefined || updates.letterSpacing !== undefined ||
        updates.lineHeight !== undefined) {
      updateTextLayerFont(id, {
        fontFamily: updates.fontFamily,
        fontSize: updates.fontSize,
        fontWeight: updates.fontWeight,
        letterSpacing: updates.letterSpacing,
        lineHeight: updates.lineHeight,
      }, heroViewRepository)
    }
    if (updates.color !== undefined) {
      updateTextLayerColor(id, updates.color, heroViewRepository)
    }
    if (updates.position !== undefined) {
      updateTextLayerPosition(id, {
        x: updates.position.x,
        y: updates.position.y,
        anchor: updates.position.anchor as 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right',
      }, heroViewRepository)
    }
    if (updates.rotation !== undefined) {
      updateTextLayerRotation(id, updates.rotation, heroViewRepository)
    }
    render()
  }

  // ============================================================
  // Rendering (inline implementation to avoid circular dependency)
  // ============================================================
  let previewRenderer: import('@practice/texture').TextureRenderer | null = null

  const renderSceneFromConfig = async () => {
    if (!previewRenderer) return
    // Use repository directly as single source of truth
    const config = heroViewRepository.get()
    await renderHeroConfig(previewRenderer, config, primitivePalette.value)
    try {
      canvasImageData.value = await previewRenderer.readPixels()
    } catch {
      // Ignore errors
    }
  }

  const render = async () => {
    await renderSceneFromConfig()
  }

  const initPreview = async (canvas?: HTMLCanvasElement | null) => {
    if (!canvas) return
    canvas.width = editorState.value.config.width
    canvas.height = editorState.value.config.height

    try {
      const { TextureRenderer } = await import('@practice/texture')
      previewRenderer = await TextureRenderer.create(canvas)
      // Repository already has default config from createDefaultHeroViewConfig()
      // No need for additional initialization - just render
      await render()
    } catch (e) {
      console.error('WebGPU not available:', e)
    }
  }

  const destroyPreview = () => {
    previewRenderer?.destroy()
    previewRenderer = null
    heroThumbnails.destroyThumbnailRenderers()
  }

  // ============================================================
  // Initialize Images Composable
  // ============================================================
  const heroImages = useHeroImages({
    repoConfig,
    heroViewRepository,
    render,
  })

  // ============================================================
  // Watchers
  // ============================================================
  watch(selectedBackgroundIndex, () => {
    if (isLoadingFromConfig.value) return
    initBackgroundSurfaceParamsFromPreset()
  }, { immediate: true })

  watch(selectedMaskIndex, () => {
    if (isLoadingFromConfig.value) return
    initMaskShapeParamsFromPreset()
  }, { immediate: true })

  watch(selectedMidgroundTextureIndex, () => {
    if (isLoadingFromConfig.value) return
    initSurfaceParamsFromPreset()
  }, { immediate: true })

  watch(
    [selectedBackgroundIndex, selectedMaskIndex, selectedMidgroundTextureIndex],
    () => {
      render()
    }
  )

  watch(
    [heroColors.textureColor1, heroColors.textureColor2, heroColors.maskInnerColor, heroColors.maskOuterColor, heroColors.midgroundTextureColor1, heroColors.midgroundTextureColor2],
    () => {
      render()
    }
  )

  watch([heroColors.textureColor1, heroColors.textureColor2], heroThumbnails.renderThumbnails)

  watch(
    heroFilters.layerFilterConfigs,
    () => render(),
    { deep: true }
  )

  watch(
    customMaskShapeParams,
    () => render(),
    { deep: true }
  )

  watch(
    customSurfaceParams,
    () => render(),
    { deep: true }
  )

  watch(
    customBackgroundSurfaceParams,
    () => render(),
    { deep: true }
  )

  // Helper to update colors on surface layer within layer tree
  const updateSurfaceLayerColors = (
    layers: LayerNodeConfig[],
    layerId: string,
    colorUpdate: Partial<SurfaceColorsConfig>
  ): LayerNodeConfig[] => {
    return layers.map((layer): LayerNodeConfig => {
      if (layer.type === 'group') {
        return {
          ...layer,
          children: layer.children.map((child): LayerNodeConfig => {
            if ((child.type === 'surface' || child.type === 'base') && child.id === layerId) {
              return {
                ...child,
                colors: { ...(child.colors ?? { primary: 'B', secondary: 'auto' }), ...colorUpdate },
              }
            }
            return child
          }),
        }
      }
      if ((layer.type === 'surface' || layer.type === 'base') && layer.id === layerId) {
        return {
          ...layer,
          colors: { ...(layer.colors ?? { primary: 'B', secondary: 'auto' }), ...colorUpdate },
        }
      }
      return layer
    })
  }

  // Color watchers: per-surface colors (primary/secondary) are written to layer.colors.
  // Global semanticContext is written to config.colors (still used for context-based color resolution).
  watch(heroColors.backgroundColorKey1, (newValue) => {
    if (isLoadingFromConfig.value) return
    const config = heroViewRepository.get()
    const updatedLayers = updateSurfaceLayerColors(config.layers, 'background', { primary: newValue as HeroPrimitiveKey | 'auto' })
    heroViewRepository.set({ ...config, layers: updatedLayers })
  })

  watch(heroColors.backgroundColorKey2, (newValue) => {
    if (isLoadingFromConfig.value) return
    const config = heroViewRepository.get()
    const updatedLayers = updateSurfaceLayerColors(config.layers, 'background', { secondary: newValue as HeroPrimitiveKey | 'auto' })
    heroViewRepository.set({ ...config, layers: updatedLayers })
  })

  watch(heroColors.maskColorKey1, (newValue) => {
    if (isLoadingFromConfig.value) return
    const config = heroViewRepository.get()
    const updatedLayers = updateSurfaceLayerColors(config.layers, 'surface-mask', { primary: newValue as HeroPrimitiveKey | 'auto' })
    heroViewRepository.set({ ...config, layers: updatedLayers })
  })

  watch(heroColors.maskColorKey2, (newValue) => {
    if (isLoadingFromConfig.value) return
    const config = heroViewRepository.get()
    const updatedLayers = updateSurfaceLayerColors(config.layers, 'surface-mask', { secondary: newValue as HeroPrimitiveKey | 'auto' })
    heroViewRepository.set({ ...config, layers: updatedLayers })
  })

  watch(heroColors.maskSemanticContext, (newValue) => {
    if (isLoadingFromConfig.value) return
    const config = heroViewRepository.get()
    heroViewRepository.set({
      ...config,
      colors: {
        ...config.colors,
        semanticContext: newValue,
      },
    })
  })

  // Sync activeSection to layer selection for proper surface targeting
  watch(heroThumbnails.activeSection, (section) => {
    if (!section) return
    // Map section to layer ID
    const sectionToLayerId: Record<string, string> = {
      'background': 'background',
      'clip-group-surface': 'surface-mask',
    }
    const layerId = sectionToLayerId[section]
    if (layerId) {
      selectCanvasLayer(layerId)
    }
  })

  onUnmounted(() => {
    destroyPreview()
  })

  // ============================================================
  // HeroViewConfig Serialization
  // ============================================================

  /**
   * Get current HeroViewConfig from repository
   * @deprecated Use heroViewRepository.get() directly for new code
   */
  const toHeroViewConfig = (): HeroViewConfig => {
    return heroViewRepository.get()
  }

  const saveToRepository = () => {
    if (repository) {
      repository.set(toHeroViewConfig())
    }
  }

  const fromHeroViewConfig = async (config: HeroViewConfig) => {
    isLoadingFromConfig.value = true

    try {
    // Migrate legacy configs before applying
    const migratedConfig = migrateHeroViewConfig(config)
    heroViewRepository.set(migratedConfig)

    editorState.value = {
      ...editorState.value,
      config: {
        ...editorState.value.config,
        width: migratedConfig.viewport.width,
        height: migratedConfig.viewport.height,
      },
    }

    // Find background surface layer (inside background-group or legacy base layer)
    let backgroundSurfaceLayer: SurfaceLayerNodeConfig | BaseLayerNodeConfig | undefined
    const backgroundGroup = migratedConfig.layers.find(l => l.id === 'background-group' && l.type === 'group')
    if (backgroundGroup && backgroundGroup.type === 'group') {
      backgroundSurfaceLayer = backgroundGroup.children.find((c): c is SurfaceLayerNodeConfig => c.id === 'background' && c.type === 'surface')
    }
    // Fallback: check for legacy base layer
    if (!backgroundSurfaceLayer) {
      backgroundSurfaceLayer = migratedConfig.layers.find((l): l is BaseLayerNodeConfig => l.type === 'base')
    }

    // Find mask surface layer (inside clip-group)
    let maskSurfaceLayer: SurfaceLayerNodeConfig | undefined
    const clipGroup = migratedConfig.layers.find(l => l.id === 'clip-group' && l.type === 'group')
    if (clipGroup && clipGroup.type === 'group') {
      maskSurfaceLayer = clipGroup.children.find((c): c is SurfaceLayerNodeConfig => c.id === 'surface-mask' && c.type === 'surface')
    }
    // Fallback: find first surface layer not in background-group
    if (!maskSurfaceLayer) {
      for (const layer of migratedConfig.layers) {
        if (layer.type === 'surface' && layer.id !== 'background') {
          maskSurfaceLayer = layer
          break
        }
        if (layer.type === 'group' && layer.id !== 'background-group' && layer.children) {
          const nested = layer.children.find((c): c is SurfaceLayerNodeConfig => c.type === 'surface')
          if (nested) {
            maskSurfaceLayer = nested
            break
          }
        }
      }
    }

    // Read colors from surface layers (migration ensures colors always exist)
    const configColors = migratedConfig.colors ?? createDefaultColorsConfig()
    // Background colors from layer (use defaults if missing - migration should prevent this)
    const bgColors = backgroundSurfaceLayer?.colors ?? DEFAULT_LAYER_BACKGROUND_COLORS
    heroColors.backgroundColorKey1.value = (bgColors.primary === 'auto' ? DEFAULT_LAYER_BACKGROUND_COLORS.primary : bgColors.primary) as PrimitiveKey
    heroColors.backgroundColorKey2.value = bgColors.secondary as PrimitiveKey | 'auto'
    // Mask colors from layer (use defaults if missing - migration should prevent this)
    const maskColors = maskSurfaceLayer?.colors ?? DEFAULT_LAYER_MASK_COLORS
    heroColors.maskColorKey1.value = maskColors.primary as PrimitiveKey | 'auto'
    heroColors.maskColorKey2.value = maskColors.secondary as PrimitiveKey | 'auto'
    // Semantic context from config.colors (kept at top level)
    heroColors.maskSemanticContext.value = configColors.semanticContext as ContextName

    if (backgroundSurfaceLayer) {
      const bgSurface = backgroundSurfaceLayer.surface
      if (bgSurface.type === 'image') {
        await heroImages.restoreBackgroundImage(bgSurface.imageId)
      }
      const bgPresetIndex = findSurfacePresetIndex(bgSurface, surfacePresets)
      selectedBackgroundIndex.value = bgPresetIndex ?? 0

      const effectFilter = (backgroundSurfaceLayer.filters ?? []).find((p) => p.type === 'effect')
      if (effectFilter) {
        const defaults = createDefaultEffectConfig()
        const merged: LayerEffectConfig = {
          vignette: { ...defaults.vignette, ...effectFilter.config.vignette },
          chromaticAberration: { ...defaults.chromaticAberration, ...effectFilter.config.chromaticAberration },
          dotHalftone: { ...defaults.dotHalftone, ...effectFilter.config.dotHalftone },
          lineHalftone: { ...defaults.lineHalftone, ...effectFilter.config.lineHalftone },
          blur: { ...defaults.blur, ...(effectFilter.config.blur ?? {}) },
        }
        heroFilters.effectManager.setEffectConfig(LAYER_IDS.BASE, merged)
      }
    }

    // Find mask shape from processor layer (inside clip-group or top-level)
    let maskShape: HeroMaskShapeConfig | undefined
    if (clipGroup && clipGroup.type === 'group') {
      for (const child of clipGroup.children) {
        if (child.type === 'processor') {
          const maskModifier = child.modifiers.find((m): m is MaskProcessorConfig => m.type === 'mask')
          if (maskModifier) {
            maskShape = maskModifier.shape
            break
          }
        }
      }
    }
    // Fallback: check top-level processors
    if (!maskShape) {
      for (const layer of migratedConfig.layers) {
        if (layer.type === 'processor') {
          const maskModifier = layer.modifiers.find((m): m is MaskProcessorConfig => m.type === 'mask')
          if (maskModifier) {
            maskShape = maskModifier.shape
            break
          }
        }
      }
    }

    if (maskShape) {
      selectedMaskIndex.value = findMaskPatternIndex(maskShape, maskPatterns)
    } else {
      selectedMaskIndex.value = null
    }

    if (maskSurfaceLayer) {
      const maskSurface = maskSurfaceLayer.surface
      if (maskSurface.type === 'image') {
        await heroImages.restoreMaskImage(maskSurface.imageId)
      }
      const midgroundPresetIndex = findSurfacePresetIndex(maskSurface, midgroundTexturePatterns)
      selectedMidgroundTextureIndex.value = midgroundPresetIndex ?? 0

      const maskEffectFilter = (maskSurfaceLayer.filters ?? []).find((p) => p.type === 'effect')
      if (maskEffectFilter) {
        const defaults = createDefaultEffectConfig()
        const merged: LayerEffectConfig = {
          vignette: { ...defaults.vignette, ...maskEffectFilter.config.vignette },
          chromaticAberration: { ...defaults.chromaticAberration, ...maskEffectFilter.config.chromaticAberration },
          dotHalftone: { ...defaults.dotHalftone, ...maskEffectFilter.config.dotHalftone },
          lineHalftone: { ...defaults.lineHalftone, ...maskEffectFilter.config.lineHalftone },
          blur: { ...defaults.blur, ...(maskEffectFilter.config.blur ?? {}) },
        }
        heroFilters.effectManager.setEffectConfig(LAYER_IDS.MASK, merged)
      }
    }

    foregroundConfig.value = migratedConfig.foreground

    await render()
    } finally {
      isLoadingFromConfig.value = false
    }
  }

  // ============================================================
  // Preset Management (uses presetManager created earlier)
  // ============================================================

  const presets = ref<HeroViewPreset[]>([])
  const selectedPresetId = computed({
    get: () => editorUIState.value.preset.selectedPresetId,
    set: (val: string | null) => { editorUIState.value.preset.selectedPresetId = val },
  })

  const loadPresets = async (applyInitial = true) => {
    presets.value = await presetManager.getPresets()
    if (applyInitial && selectedPresetId.value) {
      const preset = await presetManager.applyPreset(selectedPresetId.value)
      if (preset) {
        await fromHeroViewConfig(preset.config)
        return preset.colorPreset ?? null
      }
    }
    return null
  }

  const applyPreset = async (presetId: string, mergeMode: MergeMode = 'replace') => {
    const preset = await presetManager.applyPreset(presetId, mergeMode)
    if (preset) {
      selectedPresetId.value = presetId
      await fromHeroViewConfig(preset.config)
      return preset.colorPreset ?? null
    }
    return null
  }

  const exportPreset = (exportOptions: ExportPresetOptions = {}) => {
    return presetManager.exportAsPreset(exportOptions)
  }

  // ============================================================
  // Repository Integration
  // ============================================================

  let repositoryUnsubscribe: (() => void) | null = null
  let heroViewRepositoryUnsubscribe: (() => void) | null = null

  heroViewRepositoryUnsubscribe = heroViewRepository.subscribe((config: HeroViewConfig) => {
    repoConfig.value = config
  })

  if (repository) {
    repositoryUnsubscribe = repository.subscribe(async (config: HeroViewConfig) => {
      if (isLoadingFromConfig.value) return
      await fromHeroViewConfig(config)
    })
  }

  onUnmounted(() => {
    if (heroViewRepositoryUnsubscribe) {
      heroViewRepositoryUnsubscribe()
      heroViewRepositoryUnsubscribe = null
    }
    if (repositoryUnsubscribe) {
      repositoryUnsubscribe()
      repositoryUnsubscribe = null
    }
  })

  // ============================================================
  // Grouped State Objects (Phase 2: #131)
  // ============================================================

  const pattern: PatternState = {
    texturePatterns: heroThumbnails.texturePatterns,
    maskPatterns: heroThumbnails.maskPatterns,
    midgroundTexturePatterns: heroThumbnails.midgroundTexturePatterns,
    textureColor1: heroColors.textureColor1,
    textureColor2: heroColors.textureColor2,
    midgroundTextureColor1: heroColors.midgroundTextureColor1,
    midgroundTextureColor2: heroColors.midgroundTextureColor2,
    maskInnerColor: heroColors.maskInnerColor,
    maskOuterColor: heroColors.maskOuterColor,
    createMidgroundThumbnailSpec: heroThumbnails.createMidgroundThumbnailSpec,
    createBackgroundThumbnailSpec: heroThumbnails.createBackgroundThumbnailSpec,
    selectedBackgroundIndex,
    selectedMaskIndex,
    selectedMidgroundTextureIndex,
    activeSection: heroThumbnails.activeSection,
  }

  const background: BackgroundState = {
    backgroundColorKey1: heroColors.backgroundColorKey1,
    backgroundColorKey2: heroColors.backgroundColorKey2,
    customBackgroundImage: heroImages.customBackgroundImage,
    customBackgroundFile: heroImages.customBackgroundFile,
    setBackgroundImage: heroImages.setBackgroundImage,
    clearBackgroundImage: heroImages.clearBackgroundImage,
    loadRandomBackgroundImage: heroImages.loadRandomBackgroundImage,
    isLoadingRandomBackground: heroImages.isLoadingRandomBackground,
    customBackgroundSurfaceParams,
    currentBackgroundSurfaceSchema,
    updateBackgroundSurfaceParams,
  }

  const mask: MaskState = {
    maskColorKey1: heroColors.maskColorKey1,
    maskColorKey2: heroColors.maskColorKey2,
    maskSemanticContext: heroColors.maskSemanticContext,
    customMaskImage: heroImages.customMaskImage,
    customMaskFile: heroImages.customMaskFile,
    setMaskImage: heroImages.setMaskImage,
    clearMaskImage: heroImages.clearMaskImage,
    loadRandomMaskImage: heroImages.loadRandomMaskImage,
    isLoadingRandomMask: heroImages.isLoadingRandomMask,
    customMaskShapeParams,
    customSurfaceParams,
    currentMaskShapeSchema,
    currentSurfaceSchema,
    updateMaskShapeParams,
    updateSurfaceParams,
  }

  const filter: FilterState = {
    effectManager: heroFilters.effectManager,
    selectedFilterLayerId: heroFilters.selectedFilterLayerId,
    selectedLayerFilters: heroFilters.selectedLayerFilters,
    layerFilterConfigs: heroFilters.layerFilterConfigs,
    updateLayerFilters: heroFilters.updateLayerFilters,
    selectFilterType: heroFilters.selectFilterType,
    getFilterType: heroFilters.getFilterType,
    updateVignetteParams: heroFilters.updateVignetteParams,
    updateChromaticAberrationParams: heroFilters.updateChromaticAberrationParams,
    updateDotHalftoneParams: heroFilters.updateDotHalftoneParams,
    updateLineHalftoneParams: heroFilters.updateLineHalftoneParams,
    updateBlurParams: heroFilters.updateBlurParams,
  }

  const foreground: ForegroundState = {
    foregroundConfig,
    foregroundTitleColor: heroColors.foregroundTitleColor,
    foregroundBodyColor: heroColors.foregroundBodyColor,
    foregroundElementColors: heroColors.foregroundElementColors,
    foregroundTitleAutoKey: heroColors.foregroundTitleAutoKey,
    foregroundBodyAutoKey: heroColors.foregroundBodyAutoKey,
  }

  const preset: PresetState = {
    presets,
    selectedPresetId,
    loadPresets,
    applyPreset,
    exportPreset,
  }

  const layer: LayerOperations = {
    addMaskLayer,
    addTextLayer,
    addObjectLayer,
    removeLayer,
    updateLayerVisibility,
    toggleLayerVisibility,
    updateTextLayerConfig,
  }

  const inkColor: InkColorHelpers = {
    getInkColorForSurface: heroColors.getInkColorForSurface,
    getInkRgbaForSurface: heroColors.getInkRgbaForSurface,
  }

  const canvas: CanvasState = {
    canvasImageData,
    setElementBounds: heroColors.setElementBounds,
  }

  const serialization: SerializationState = {
    toHeroViewConfig,
    fromHeroViewConfig,
    saveToRepository,
  }

  const usecase: UsecaseState = {
    heroViewRepository,
    surfaceUsecase,
    colorUsecase,
    layerUsecase,
    foregroundElementUsecase,
    presetUsecase,
    selectedForegroundElementId,
  }

  // Use repository state directly as computed (reactive via repoConfig)
  const heroViewConfigComputed = computed(() => repoConfig.value)

  const editor: EditorStateRef = {
    heroViewConfig: heroViewConfigComputed,
    editorUIState,
  }

  const renderer: RendererActions = {
    initPreview,
    destroyPreview,
    openSection: heroThumbnails.openSection,
    renderSceneFromConfig,
  }

  // ============================================================
  // Public API
  // ============================================================

  return {
    pattern,
    background,
    mask,
    filter,
    foreground,
    preset,
    layer,
    inkColor,
    canvas,
    serialization,
    usecase,
    editor,
    renderer,
  }
}
