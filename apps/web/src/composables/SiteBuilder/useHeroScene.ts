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
  type TriangleSurfaceParams,
  type HexagonSurfaceParams,
  type DepthMapType,
} from '@practice/texture'
import type { PrimitivePalette } from '../../modules/SemanticColorPalette/Domain'
import {
  type HeroSceneConfig,
  type HtmlLayer,
  type HeroViewConfig,
  type LayerNodeConfig,
  type TextLayerNodeConfigType,
  type Model3DLayerNodeConfig,
  type ForegroundLayerConfig,
  type TextLayerConfig,
  type HeroViewRepository,
  createDefaultEffectConfig,
  createDefaultForegroundConfig,
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
  type HeroEditorUIState,
  createDefaultHeroEditorUIState,
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
} from '../../modules/HeroScene'
import { createLayerSelection, type LayerSelectionReturn } from '../useLayerSelection'

// Import extracted composables
import { useHeroColors } from './useHeroColors'
import { useHeroFilters } from './useHeroFilters'
import { useHeroThumbnails } from './useHeroThumbnails'
import { useHeroImages } from './useHeroImages'
import { useHeroSceneRenderer } from './useHeroSceneRenderer'
import { useHeroSurfaceParams } from './useHeroSurfaceParams'
import { useHeroPatternPresets } from './useHeroPatternPresets'
import { useHeroColorSync } from './useHeroColorSync'
import { useHeroConfigLoader, LAYER_IDS } from './useHeroConfigLoader'
import { useHeroPresets } from './useHeroPresets'

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
  // Initialize Renderer Composable
  // ============================================================
  const editorConfig = computed(() => editorState.value.config)
  const heroRenderer = useHeroSceneRenderer({
    primitivePalette,
    heroViewRepository,
    canvasImageData,
    editorConfig,
    onDestroyPreview: () => heroThumbnails.destroyThumbnailRenderers(),
  })

  // Alias for backward compatibility and shorter access
  const { render, renderSceneFromConfig, initPreview, destroyPreview } = heroRenderer

  // ============================================================
  // Initialize Surface Params Composable
  // ============================================================
  const heroSurfaceParams = useHeroSurfaceParams({
    repoConfig,
    heroViewRepository,
    selectedLayerId,
    textureColor1: heroColors.textureColor1,
    textureColor2: heroColors.textureColor2,
    midgroundTextureColor1: heroColors.midgroundTextureColor1,
    midgroundTextureColor2: heroColors.midgroundTextureColor2,
  })

  // Destructure for backward compatibility
  const {
    customMaskShapeParams,
    customSurfaceParams,
    customBackgroundSurfaceParams,
    currentMaskShapeSchema,
    currentSurfaceSchema,
    currentBackgroundSurfaceSchema,
  } = heroSurfaceParams

  // ============================================================
  // Initialize Pattern Presets Composable
  // ============================================================
  const heroPatternPresets = useHeroPatternPresets({
    heroViewRepository,
    midgroundTexturePatterns: heroThumbnails.midgroundTexturePatterns,
    maskPatterns: heroThumbnails.maskPatterns,
    surfaceParams: heroSurfaceParams,
    selectedBackgroundIndex,
    selectedMaskIndex,
    selectedMidgroundTextureIndex,
    textureColor1: heroColors.textureColor1,
    textureColor2: heroColors.textureColor2,
    midgroundTextureColor1: heroColors.midgroundTextureColor1,
    midgroundTextureColor2: heroColors.midgroundTextureColor2,
  })

  // Destructure for backward compatibility
  const {
    surfacePresets,
    initMaskShapeParamsFromPreset,
    initSurfaceParamsFromPreset,
    initBackgroundSurfaceParamsFromPreset,
    updateMaskShapeParams,
    updateSurfaceParams,
    updateBackgroundSurfaceParams,
  } = heroPatternPresets

  // ============================================================
  // Initialize Color Sync Composable
  // ============================================================
  useHeroColorSync({
    heroViewRepository,
    heroColors,
    heroThumbnails,
    isLoadingFromConfig,
    selectCanvasLayer,
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
  // Initialize Images Composable
  // ============================================================
  const heroImages = useHeroImages({
    repoConfig,
    heroViewRepository,
    render,
  })

  // ============================================================
  // Initialize Config Loader Composable
  // ============================================================
  const { fromHeroViewConfig } = useHeroConfigLoader({
    heroViewRepository,
    editorState,
    heroColors,
    heroFilters,
    heroImages,
    heroThumbnails,
    selectedBackgroundIndex,
    selectedMaskIndex,
    selectedMidgroundTextureIndex,
    foregroundConfig,
    surfacePresets,
    render,
    isLoadingFromConfig,
  })

  // ============================================================
  // Initialize Presets Composable
  // ============================================================
  const heroPresets = useHeroPresets({
    heroViewRepository,
    editorUIState,
    fromHeroViewConfig,
  })

  // Destructure for backward compatibility
  const {
    presets,
    selectedPresetId,
    loadPresets,
    applyPreset,
    exportPreset,
    presetUsecase,
  } = heroPresets

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
