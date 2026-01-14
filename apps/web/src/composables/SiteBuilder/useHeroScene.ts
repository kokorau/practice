/**
 * useHeroScene
 *
 * HeroSceneモジュールをVueのリアクティブシステムと連携するcomposable
 * 現在は2レイヤー固定（base, mask）
 */

import { ref, shallowRef, computed, watch, nextTick, onUnmounted, type ComputedRef, type Ref } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import {
  TextureRenderer,
  getDefaultTexturePatterns,
  getDefaultMaskPatterns,
  getSurfacePresets,
  // Simple texture specs (no mask) for thumbnails
  createSolidSpec,
  createStripeSpec,
  createGridSpec,
  createPolkaDotSpec,
  createCheckerSpec,
  createTriangleSpec,
  createHexagonSpec,
  // Textile pattern specs
  createAsanohaSpec,
  createSeigaihaSpec,
  createWaveSpec,
  createScalesSpec,
  createOgeeSpec,
  createSunburstSpec,
  // Gradient specs
  createGradientGrainSpec,
  // Schemas and types
  MaskShapeSchemas,
  SurfaceSchemas,
  DEFAULT_GRADIENT_GRAIN_CURVE_POINTS,
  type TexturePattern,
  type MaskPattern,
  type RGBA,
  type Viewport,
  type TextureRenderSpec,
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
import { $Oklch } from '@practice/color'
import type { Oklch } from '@practice/color'
import type { PrimitivePalette, ContextName, PrimitiveKey, NeutralKey } from '../../modules/SemanticColorPalette/Domain'
import { NEUTRAL_KEYS, selectNeutralByHistogram, APCA_INK_TARGETS, type NeutralEntry } from '../../modules/SemanticColorPalette/Domain'
import { selectInkForSurface } from '../../modules/SemanticColorPalette/Infra'
import type { InkRole } from '../../modules/SemanticColorPalette/Domain'
import { generateLuminanceMap } from '../../modules/ContrastChecker'
import {
  type LayerFilterConfig,
  type HeroSceneConfig,
  type HtmlLayer,
  type HeroViewConfig,
  type HeroColorsConfig,
  type HeroPrimitiveKey,
  type HeroContextName,
  type HeroSurfaceConfig,
  type MaskShapeConfig as HeroMaskShapeConfig,
  type LayerNodeConfig,
  type BaseLayerNodeConfig,
  type SurfaceLayerNodeConfig,
  type TextLayerNodeConfigType,
  type Model3DLayerNodeConfig,
  type MaskProcessorConfig,
  type ForegroundLayerConfig,
  type HeroViewPreset,
  type TextLayerConfig,
  type Object3DRendererPort,
  type HeroViewRepository,
  type FilterType,
  type EffectFilterConfig,
  type LayerEffectConfig,
  createDefaultFilterConfig,
  createDefaultForegroundConfig,
  createDefaultColorsConfig,
  createGetHeroViewPresetsUseCase,
  createInMemoryHeroViewPresetRepository,
  // Preset UseCases
  applyPresetUsecase,
  exportPresetUsecase,
  createBrowserPresetExporter,
  type ExportPresetOptions,
  findSurfacePresetIndex,
  findMaskPatternIndex,
  // TextLayer UseCases
  updateTextLayerText,
  updateTextLayerFont,
  updateTextLayerColor,
  updateTextLayerPosition,
  updateTextLayerRotation,
  createHeroViewInMemoryRepository,
  createSurfaceUsecase,
  SCENE_LAYER_IDS,
  createUnsplashImageUploadAdapter,
  // Color UseCases
  updateBrandColor,
  updateAccentColor,
  updateFoundationColor,
  applyColorPreset,
  // Layer UseCases
  addLayer as addLayerUsecase,
  removeLayer as removeLayerUsecase,
  toggleExpand as toggleExpandUsecase,
  toggleVisibility as toggleVisibilityUsecase,
  updateLayer as updateLayerUsecase,
  // Preset UseCases
  exportPreset as exportPresetFn,
  createPreset as createPresetFn,
  type PresetExportPort,
  // ForegroundElement Usecase
  createForegroundElementUsecase,
  type ForegroundConfigPort,
  type SelectionPort,
  // Constants
  HERO_CANVAS_DIMENSIONS,
  // Domain Mappers
  toCustomMaskShapeParams,
  toCustomSurfaceParams,
  toCustomBackgroundSurfaceParams,
  // Application Syncer
  syncBackgroundSurfaceParams,
  syncMaskSurfaceParams,
  // Grouped state types
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
  // Effect types
  type EffectType,
  // Config-based rendering
  renderHeroConfig,
} from '../../modules/HeroScene'
import { useEffectManager } from '../useEffectManager'
import { useLayerSelection } from '../useLayerSelection'

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
 * Used for type-safe narrowing in buildSurfaceParams
 */
export type PatternPresetParams = StripePresetParams | GridPresetParams | PolkaDotPresetParams | CheckerPresetParams

/**
 * Type guard to check if preset params is a pattern type (not solid or gradientGrain)
 * Enables TypeScript to narrow the type after the check
 */
export const isPatternPresetParams = (
  params: SurfacePresetParams
): params is PatternPresetParams => {
  return params.type !== 'solid' && params.type !== 'gradientGrain'
}

export type SectionType = 'background' | 'clip-group-surface' | 'clip-group-shape' | 'foreground-title' | 'foreground-description' | 'filter' | 'effect' | 'text-content'

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
 * Custom surface params union type (for midground - includes solid, checker, and gradientGrain)
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
 * Gradient grain surface params (from GradientLab)
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
 * Custom background surface params union type (includes checker, solid has no params)
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
  /**
   * Optional repository for persisting HeroViewConfig
   * When provided:
   * - Initial state is loaded from repository.get()
   * - Changes are synced via repository.set()
   * - External changes are subscribed via repository.subscribe()
   */
  repository?: HeroViewRepository
}

// ============================================================
// Constants
// ============================================================

const LAYER_IDS = {
  BASE: 'base-layer',
  MASK: 'mask-layer',
} as const

/**
 * Semantic context to primitive surface key mapping
 * Derived from SemanticPaletteFromPrimitive.ts
 */
const CONTEXT_SURFACE_KEYS: Record<'light' | 'dark', Record<ContextName, PrimitiveKey>> = {
  light: {
    canvas: 'F1',
    sectionNeutral: 'F2',
    sectionTint: 'Bt',
    sectionContrast: 'Bf',
  },
  dark: {
    canvas: 'F8',
    sectionNeutral: 'F7',
    sectionTint: 'Bs',
    sectionContrast: 'Bf',
  },
}

/**
 * Get all SurfacePresets (now includes solid)
 * @deprecated Use getSurfacePresets() directly
 */
const getMidgroundPresets = (): SurfacePreset[] => {
  return getSurfacePresets()
}

// ============================================================
// Helpers
// ============================================================

const paletteToRgba = (oklch: Oklch, alpha: number = 1.0): RGBA => {
  const srgb = $Oklch.toSrgb(oklch)
  return [
    Math.max(0, Math.min(1, srgb.r)),
    Math.max(0, Math.min(1, srgb.g)),
    Math.max(0, Math.min(1, srgb.b)),
    alpha,
  ]
}

// ============================================================
// Composable
// ============================================================

export const useHeroScene = (options: UseHeroSceneOptions) => {
  const { primitivePalette, isDark, repository } = options

  // ============================================================
  // Pattern Definitions
  // ============================================================
  const texturePatterns = getDefaultTexturePatterns()
  const maskPatterns = getDefaultMaskPatterns()
  const midgroundTexturePatterns = getMidgroundPresets()

  // ============================================================
  // Editor State (index-based for UI management)
  // ============================================================
  const editorState = ref<HeroSceneEditorState>(createHeroSceneEditorState(HERO_CANVAS_DIMENSIONS))

  // Selection state (UI bindings)
  const selectedBackgroundIndex = ref(3)
  const selectedMaskIndex = ref<number | null>(null)
  const selectedMidgroundTextureIndex = ref<number>(0) // 0 = Solid
  const activeSection = ref<SectionType | null>(null)

  // Custom background image
  const customBackgroundImage = ref<string | null>(null)
  const customBackgroundFile = ref<File | null>(null)
  let customBackgroundBitmap: ImageBitmap | null = null

  // Custom mask image
  const customMaskImage = ref<string | null>(null)
  const customMaskFile = ref<File | null>(null)
  let customMaskBitmap: ImageBitmap | null = null

  // ============================================================
  // HeroViewRepository & Usecases
  // ============================================================
  const heroViewRepository = createHeroViewInMemoryRepository()
  const imageUploadAdapter = createUnsplashImageUploadAdapter()

  // Layer selection for unified surface usecase
  const { layerId: selectedLayerId } = useLayerSelection()
  const selectionPort = {
    getSelectedLayerId: () => selectedLayerId.value,
  }
  const surfaceUsecase = createSurfaceUsecase({
    repository: heroViewRepository,
    selection: selectionPort,
    imageUpload: imageUploadAdapter,
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
  // Preset Usecase wrappers
  // ============================================================
  const presetExportPort: PresetExportPort = {
    downloadAsJson: (preset: HeroViewPreset) => {
      const blob = new Blob([JSON.stringify(preset, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${preset.name || 'preset'}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    },
  }

  const presetUsecase = {
    exportPreset: (options?: { id?: string; name?: string }) => {
      return exportPresetFn(heroViewRepository, presetExportPort, options)
    },
    createPreset: (options?: { id?: string; name?: string }) => {
      return createPresetFn(heroViewRepository, options)
    },
  }

  // ============================================================
  // ForegroundElement Usecase
  // ============================================================
  // Selection state for foreground elements
  const selectedForegroundElementId = ref<string | null>(null)

  // ForegroundElement usecase will be initialized after foregroundConfig is available
  // We'll create a lazy initialization pattern
  let _foregroundElementUsecase: ReturnType<typeof createForegroundElementUsecase> | null = null

  const getForegroundElementUsecase = () => {
    if (!_foregroundElementUsecase) {
      // Lazy initialization - foregroundConfig is defined later in the file
      // This will be properly initialized when first accessed
      const foregroundConfigPort: ForegroundConfigPort = {
        get: () => foregroundConfig.value,
        set: (config: ForegroundLayerConfig) => {
          foregroundConfig.value = config
        },
      }

      const selectionPort: SelectionPort = {
        getSelectedId: () => selectedForegroundElementId.value,
        setSelectedId: (id: string | null) => {
          selectedForegroundElementId.value = id
        },
        clearCanvasSelection: () => {
          // Clear canvas layer selection when foreground element is selected
          selectedFilterLayerId.value = null
        },
      }

      _foregroundElementUsecase = createForegroundElementUsecase({
        foregroundConfig: foregroundConfigPort,
        selection: selectionPort,
      })
    }
    return _foregroundElementUsecase
  }

  // Expose foreground element usecase methods
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


  // extractMaskShapeParams is now imported from Domain/MaskShapeMapper as toCustomMaskShapeParams

  /**
   * Extract surface params from a MidgroundSurfacePreset
   * Now delegates to toCustomSurfaceParams from Domain/SurfaceMapper
   */
  const extractSurfaceParams = (preset: MidgroundSurfacePreset, colorA: RGBA, colorB: RGBA): CustomSurfaceParams => {
    return toCustomSurfaceParams(preset.params, colorA, colorB)
  }

  /**
   * Extract background surface params from a SurfacePreset
   * Now delegates to toCustomBackgroundSurfaceParams from Domain/SurfaceMapper
   */
  const extractBackgroundSurfaceParams = (params: SurfacePresetParams, colorA: RGBA, colorB: RGBA): CustomBackgroundSurfaceParams => {
    return toCustomBackgroundSurfaceParams(params, colorA, colorB)
  }

  // Current custom params (initialized from selected preset)
  const customMaskShapeParams = ref<CustomMaskShapeParams | null>(null)
  const customSurfaceParams = ref<CustomSurfaceParams | null>(null)
  const customBackgroundSurfaceParams = ref<CustomBackgroundSurfaceParams | null>(null)

  // Flag to skip watcher updates during fromHeroViewConfig execution
  let isLoadingFromConfig = false

  // Current schema for UI rendering
  const currentMaskShapeSchema = computed(() => {
    if (!customMaskShapeParams.value) return null
    return MaskShapeSchemas[customMaskShapeParams.value.type] as ObjectSchema
  })

  const currentSurfaceSchema = computed(() => {
    if (!customSurfaceParams.value) return null
    const type = customSurfaceParams.value.type
    return SurfaceSchemas[type] as ObjectSchema
  })

  const currentBackgroundSurfaceSchema = computed(() => {
    if (!customBackgroundSurfaceParams.value) return null
    const type = customBackgroundSurfaceParams.value.type
    return SurfaceSchemas[type] as ObjectSchema
  })

  // Initialize custom params from preset when selection changes
  const initMaskShapeParamsFromPreset = () => {
    const idx = selectedMaskIndex.value
    if (idx === null) {
      // Keep existing customMaskShapeParams (loaded from preset with custom values)
      return
    }
    const pattern = maskPatterns[idx]
    if (pattern) {
      customMaskShapeParams.value = toCustomMaskShapeParams(pattern.maskConfig)
    }
  }

  const initSurfaceParamsFromPreset = () => {
    const idx = selectedMidgroundTextureIndex.value
    const preset = midgroundTexturePatterns[idx]
    if (preset) {
      customSurfaceParams.value = extractSurfaceParams(preset, midgroundTextureColor1.value, midgroundTextureColor2.value)
    }
  }

  const surfacePresets = getSurfacePresets()

  /**
   * Helper to update base layer surface in repository
   */
  const setBaseSurface = (surface: HeroSurfaceConfig) => {
    heroViewRepository.updateLayer(SCENE_LAYER_IDS.BASE, { surface })
  }

  /**
   * Initialize background surface params from preset
   * Uses unidirectional flow: Repository -> View (via subscribe)
   * Note: gradientGrain and textile patterns are handled directly in View layer
   */
  const initBackgroundSurfaceParamsFromPreset = () => {
    const idx = selectedBackgroundIndex.value
    const preset = surfacePresets[idx]
    if (preset) {
      const params = extractBackgroundSurfaceParams(preset.params, textureColor1.value, textureColor2.value)
      // Repositoryを更新（View層はsubscribeで自動同期）
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
        // gradientGrain is not supported by Repository, handle directly in View layer
        customBackgroundSurfaceParams.value = params
      } else if (params.type === 'asanoha') {
        // Textile patterns - handle directly in View layer
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

  /**
   * Update custom mask shape params
   */
  const updateMaskShapeParams = (updates: Partial<CircleMaskShapeParams | RectMaskShapeParams | BlobMaskShapeParams>) => {
    if (!customMaskShapeParams.value) return
    customMaskShapeParams.value = { ...customMaskShapeParams.value, ...updates } as CustomMaskShapeParams
  }

  /**
   * Update custom surface params
   */
  const updateSurfaceParams = (updates: Partial<StripeSurfaceParams | GridSurfaceParams | PolkaDotSurfaceParams>) => {
    if (!customSurfaceParams.value) return
    customSurfaceParams.value = { ...customSurfaceParams.value, ...updates } as CustomSurfaceParams
  }

  /**
   * Update custom background surface params
   * Uses unidirectional flow: Repository -> View (via subscribe)
   */
  const updateBackgroundSurfaceParams = (updates: Partial<StripeSurfaceParams | GridSurfaceParams | PolkaDotSurfaceParams | CheckerSurfaceParams | SolidSurfaceParams | GradientGrainSurfaceParams>) => {
    if (!customBackgroundSurfaceParams.value) return
    const type = customBackgroundSurfaceParams.value.type

    // Repositoryを直接更新（View層はsubscribeで自動同期）
    const layer = heroViewRepository.findLayer(SCENE_LAYER_IDS.BASE)
    if (!layer || layer.type !== 'base') return
    const currentSurface = layer.surface
    if (currentSurface.type !== type) return
    const newSurface = { ...currentSurface, ...updates } as HeroSurfaceConfig
    heroViewRepository.updateLayer(SCENE_LAYER_IDS.BASE, { surface: newSurface })
  }

  // ============================================================
  // Per-Layer Filter State (delegated to useEffectManager)
  // ============================================================

  // Initialize effect manager and setup default layers
  const effectManager = useEffectManager()

  // Initialize default layers (BASE and MASK)
  effectManager.selectLayer(LAYER_IDS.BASE)
  effectManager.selectLayer(LAYER_IDS.MASK)
  // Select BASE layer as default
  effectManager.selectLayer(LAYER_IDS.BASE)

  // Expose selectedLayerId as selectedFilterLayerId (backward compatible alias)
  const selectedFilterLayerId = effectManager.selectedLayerId

  // Expose effects as layerFilterConfigs (backward compatible alias)
  const layerFilterConfigs = computed(() => effectManager.effects.value)

  // Expose selectedEffect as selectedLayerFilters (backward compatible alias)
  const selectedLayerFilters = effectManager.selectedEffect

  // ============================================================
  // Effect Sync to Repository (auto-sync on effectManager changes)
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
  }, 100) // 100ms debounce


  // Watch effectManager.effects and sync to repository
  watch(
    () => effectManager.effects.value,
    (effects) => {
      if (isLoadingFromConfig) return // Skip sync when loading from config
      debouncedSyncEffects(effects)
    },
    { deep: true }
  )

  // フィルター設定を更新（部分更新をサポート）
  // DeepPartial型を定義（FilterState型との互換性のため）
  type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
  }

  /**
   * Update layer filters with deep partial merge
   * Delegates to effectManager (rendering uses effectManager directly)
   */
  const updateLayerFilters = (layerId: string, updates: DeepPartial<LayerFilterConfig>) => {
    // Update each effect type if present in updates
    const effectTypes: EffectType[] = ['vignette', 'chromaticAberration', 'dotHalftone', 'lineHalftone', 'blur']
    for (const effectType of effectTypes) {
      const effectUpdate = updates[effectType]
      if (effectUpdate) {
        // Extract enabled separately if present
        const { enabled, ...params } = effectUpdate as { enabled?: boolean; [key: string]: unknown }
        if (Object.keys(params).length > 0) {
          effectManager.updateEffectParams(layerId, effectType, params as Parameters<typeof effectManager.updateEffectParams>[2])
        }
        // Handle enabled state through setEffectType if explicitly set
        if (enabled !== undefined) {
          if (enabled) {
            effectManager.setEffectType(layerId, effectType)
          }
        }
      }
    }
  }

  // ============================================================
  // Filter Usecase Wrappers
  // Provides Usecase-pattern API for filter operations
  // ============================================================

  /**
   * Select filter type (exclusive selection)
   * Delegates to effectManager.setEffectType (rendering uses effectManager directly)
   */
  const selectFilterType = (layerId: string, type: FilterType) => {
    // Convert FilterType 'void' to null for effectManager
    const effectType: EffectType | null = type === 'void' ? null : type
    effectManager.setEffectType(layerId, effectType)
  }

  /**
   * Get current filter type for a layer
   * Reads from effectManager.effects
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
   * Delegates to effectManager.updateEffectParams (rendering uses effectManager directly)
   */
  const updateVignetteParams = (layerId: string, params: Partial<{ intensity: number; radius: number; softness: number }>) => {
    effectManager.updateEffectParams(layerId, 'vignette', params)
  }

  /**
   * Update chromatic aberration parameters
   * Delegates to effectManager.updateEffectParams (rendering uses effectManager directly)
   */
  const updateChromaticAberrationParams = (layerId: string, params: Partial<{ intensity: number }>) => {
    effectManager.updateEffectParams(layerId, 'chromaticAberration', params)
  }

  /**
   * Update dot halftone parameters
   * Delegates to effectManager.updateEffectParams (rendering uses effectManager directly)
   */
  const updateDotHalftoneParams = (layerId: string, params: Partial<{ dotSize: number; spacing: number; angle: number }>) => {
    effectManager.updateEffectParams(layerId, 'dotHalftone', params)
  }

  /**
   * Update line halftone parameters
   * Delegates to effectManager.updateEffectParams (rendering uses effectManager directly)
   */
  const updateLineHalftoneParams = (layerId: string, params: Partial<{ lineWidth: number; spacing: number; angle: number }>) => {
    effectManager.updateEffectParams(layerId, 'lineHalftone', params)
  }

  /**
   * Update blur parameters
   * Delegates to effectManager.updateEffectParams (rendering uses effectManager directly)
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
  // Renderer State
  // ============================================================

  let previewRenderer: TextureRenderer | null = null
  const thumbnailRenderers: TextureRenderer[] = []

  // 3D Object Renderers (keyed by layer ID)
  const object3DRenderers = new Map<string, Object3DRendererPort>()
  // Track loaded model URLs to avoid reloading
  const loadedModelUrls = new Map<string, string>()

  // Cached canvas ImageData for contrast analysis (updated after each render)
  const canvasImageData = shallowRef<ImageData | null>(null)

  // Element bounds for per-element background analysis (scaled to canvas dimensions)
  type ElementBounds = { x: number; y: number; width: number; height: number }
  const titleElementBounds = shallowRef<ElementBounds | null>(null)
  const descriptionElementBounds = shallowRef<ElementBounds | null>(null)

  /**
   * Update element bounds for background analysis.
   * Bounds should be scaled to match canvasImageData dimensions.
   */
  const setElementBounds = (elementType: 'title' | 'description', bounds: ElementBounds | null) => {
    if (elementType === 'title') {
      titleElementBounds.value = bounds
    } else {
      descriptionElementBounds.value = bounds
    }
  }

  // ============================================================
  // Semantic Context for Mask Layer (fixed to 'canvas' for now)
  // ============================================================
  const maskSemanticContext = ref<ContextName>('canvas')

  // ============================================================
  // PrimitiveKey-based Color Selection
  // ============================================================
  // Background layer colors (two colors for texture patterns)
  const backgroundColorKey1 = ref<PrimitiveKey>('B')      // Primary color (e.g., brand)
  const backgroundColorKey2 = ref<PrimitiveKey | 'auto'>('auto')  // Secondary color ('auto' = canvas surface)

  // Mask layer colors (two colors for masked texture patterns)
  const maskColorKey1 = ref<PrimitiveKey | 'auto'>('auto')  // Primary color ('auto' = surface - deltaL)
  const maskColorKey2 = ref<PrimitiveKey | 'auto'>('auto')  // Secondary color ('auto' = mask surface)

  // ============================================================
  // Computed Colors
  // ============================================================
  const themeMode = computed((): 'light' | 'dark' => (isDark.value ? 'dark' : 'light'))

  // Background: always uses canvas surface
  const canvasSurfaceKey = computed((): PrimitiveKey => CONTEXT_SURFACE_KEYS[themeMode.value].canvas)

  // Mask layer: uses semantic context (currently fixed to 'canvas')
  const maskSurfaceKey = computed((): PrimitiveKey => CONTEXT_SURFACE_KEYS[themeMode.value][maskSemanticContext.value])

  // Resolve 'auto' to actual PrimitiveKey
  const resolvedBackgroundColorKey2 = computed((): PrimitiveKey =>
    backgroundColorKey2.value === 'auto' ? canvasSurfaceKey.value : backgroundColorKey2.value
  )

  const resolvedMaskColorKey2 = computed((): PrimitiveKey =>
    maskColorKey2.value === 'auto' ? maskSurfaceKey.value : maskColorKey2.value
  )

  const textureColor1 = computed((): RGBA => paletteToRgba(primitivePalette.value[backgroundColorKey1.value]))
  const textureColor2 = computed((): RGBA => paletteToRgba(primitivePalette.value[resolvedBackgroundColorKey2.value]))

  // Mask outer color uses semantic context surface (no user override)
  const maskInnerColor = computed((): RGBA => paletteToRgba(primitivePalette.value[maskSurfaceKey.value], 0))
  const maskOuterColor = computed((): RGBA => paletteToRgba(primitivePalette.value[maskSurfaceKey.value]))

  // Mask texture colors: auto calculates shifted lightness
  const midgroundTextureColor1 = computed((): RGBA => {
    if (maskColorKey1.value !== 'auto') {
      return paletteToRgba(primitivePalette.value[maskColorKey1.value])
    }
    // Auto: shift lightness from mask surface
    const surface = primitivePalette.value[maskSurfaceKey.value]
    const deltaL = isDark.value ? 0.05 : -0.05
    const shifted: Oklch = { L: surface.L + deltaL, C: surface.C, H: surface.H }
    return paletteToRgba(shifted)
  })
  const midgroundTextureColor2 = computed((): RGBA => paletteToRgba(primitivePalette.value[resolvedMaskColorKey2.value]))

  // ============================================================
  // Ink Color Selection (for text on surfaces)
  // ============================================================
  /**
   * Get ink color for text on a given surface
   * Uses APCA to ensure proper contrast
   */
  const getInkColorForSurface = (surfaceKey: PrimitiveKey, role: InkRole = 'body'): Oklch => {
    const surface = primitivePalette.value[surfaceKey]
    return selectInkForSurface(primitivePalette.value, surface, role)
  }

  /**
   * Get ink color as RGBA for rendering
   */
  const getInkRgbaForSurface = (surfaceKey: PrimitiveKey, role: InkRole = 'body'): RGBA => {
    return paletteToRgba(getInkColorForSurface(surfaceKey, role))
  }

  // ============================================================
  // Foreground Ink Colors (computed from mask primary color)
  // ============================================================
  /**
   * Mask primary color resolved as Oklch (for ink calculation)
   * This represents the surface color that text will appear on
   */
  const resolvedMaskPrimaryColorOklch = computed((): Oklch => {
    if (maskColorKey1.value !== 'auto') {
      return primitivePalette.value[maskColorKey1.value]
    }
    // Auto: shift lightness from mask surface
    const surface = primitivePalette.value[maskSurfaceKey.value]
    const deltaL = isDark.value ? 0.05 : -0.05
    return { L: surface.L + deltaL, C: surface.C, H: surface.H }
  })

  /**
   * Create neutral entries from the current primitive palette.
   */
  const getNeutralEntries = (): NeutralEntry[] => {
    return NEUTRAL_KEYS.map(key => ({
      key,
      color: primitivePalette.value[key],
    }))
  }

  /**
   * Select ink color using histogram-based worst-case analysis.
   * Ensures readability across all background pixels in the element region.
   */
  const selectInkByHistogram = (
    bounds: ElementBounds | null,
    targetLc: number
  ): Oklch | null => {
    const imageData = canvasImageData.value
    if (!imageData || !bounds) return null

    // Generate luminance map from canvas
    const luminanceMap = generateLuminanceMap(imageData)

    // Create region from bounds
    const region = {
      x: Math.round(bounds.x),
      y: Math.round(bounds.y),
      width: Math.round(bounds.width),
      height: Math.round(bounds.height),
    }

    // Select using histogram analysis
    const result = selectNeutralByHistogram(
      getNeutralEntries(),
      luminanceMap,
      targetLc,
      region,
      2 // 2% threshold (same as contrast histogram)
    )

    return primitivePalette.value[result.key as NeutralKey]
  }

  /**
   * Computed ink colors for foreground text elements.
   * Uses histogram-based worst-case analysis for reliable readability,
   * otherwise falls back to surface-based selection.
   */
  const foregroundTitleInk = computed((): Oklch => {
    const histogramResult = selectInkByHistogram(
      titleElementBounds.value,
      APCA_INK_TARGETS.title
    )
    if (histogramResult) {
      return histogramResult
    }
    // Fallback: surface-based selection
    const surface = resolvedMaskPrimaryColorOklch.value
    return selectInkForSurface(primitivePalette.value, surface, 'title')
  })

  const foregroundBodyInk = computed((): Oklch => {
    const histogramResult = selectInkByHistogram(
      descriptionElementBounds.value,
      APCA_INK_TARGETS.body
    )
    if (histogramResult) {
      return histogramResult
    }
    // Fallback: surface-based selection
    const surface = resolvedMaskPrimaryColorOklch.value
    return selectInkForSurface(primitivePalette.value, surface, 'body')
  })

  /**
   * Get CSS color strings for foreground elements
   */
  const foregroundTitleColor = computed((): string => $Oklch.toCss(foregroundTitleInk.value))
  const foregroundBodyColor = computed((): string => $Oklch.toCss(foregroundBodyInk.value))

  /**
   * Find the neutral key that matches the given Oklch color.
   * Uses simple L value comparison for efficiency.
   */
  const findMatchingNeutralKey = (color: Oklch): NeutralKey | null => {
    let bestKey: NeutralKey | null = null
    let bestDiff = Infinity

    for (const key of NEUTRAL_KEYS) {
      const neutralColor = primitivePalette.value[key]
      const diff = Math.abs(neutralColor.L - color.L)
      if (diff < bestDiff) {
        bestDiff = diff
        bestKey = key
      }
    }

    return bestKey
  }

  /**
   * Get the neutral key that was auto-selected for title text.
   * Returns null if auto is not being used or no match found.
   */
  const foregroundTitleAutoKey = computed((): NeutralKey | null => {
    return findMatchingNeutralKey(foregroundTitleInk.value)
  })

  /**
   * Get the neutral key that was auto-selected for body text.
   * Returns null if auto is not being used or no match found.
   */
  const foregroundBodyAutoKey = computed((): NeutralKey | null => {
    return findMatchingNeutralKey(foregroundBodyInk.value)
  })

  /**
   * Resolve color for a foreground element based on its colorKey.
   * - If colorKey is undefined or 'auto': use automatic contrast-based color
   * - If colorKey is a PrimitiveKey: use that color directly from the palette
   */
  const resolveForegroundElementColor = (
    colorKey: HeroPrimitiveKey | 'auto' | undefined,
    elementType: 'title' | 'description'
  ): string => {
    // If no colorKey or 'auto', use the automatic ink color
    if (colorKey === undefined || colorKey === 'auto') {
      return elementType === 'title' ? foregroundTitleColor.value : foregroundBodyColor.value
    }
    // Use the specified color from the palette
    const color = primitivePalette.value[colorKey as PrimitiveKey]
    return $Oklch.toCss(color)
  }

  /**
   * Computed map of element ID to resolved CSS color string.
   * This allows HeroPreview to look up colors by element ID.
   */
  const foregroundElementColors = computed((): Map<string, string> => {
    const colorMap = new Map<string, string>()
    for (const el of foregroundConfig.value.elements) {
      const color = resolveForegroundElementColor(
        el.colorKey as HeroPrimitiveKey | 'auto' | undefined,
        el.type
      )
      colorMap.set(el.id, color)
    }
    return colorMap
  })

  // ============================================================
  // Layer Management (internal)
  // ============================================================

  // Flag to track if layers have been initialized
  let isLayersInitialized = false

  /**
   * Initialize default layers
   * Called once during initialization to set up heroViewRepository
   */
  const initializeDefaultLayers = () => {
    if (isLayersInitialized) return
    isLayersInitialized = true

    // Initialize heroViewRepository
    // This ensures the repository is set up before any usecases access it
    toHeroViewConfig()
  }

  /**
   * Sync layer configs (no-op after canvasLayers removal)
   *
   * @deprecated This function is no longer needed since canvasLayers has been removed.
   * The rendering config is built via toHeroViewConfig() which uses helper functions.
   * Keeping this as a no-op for backward compatibility during migration.
   */
  const syncLayerConfigs = () => {
    // No-op: canvasLayers has been removed
    // Rendering uses toHeroViewConfig() which builds from current state
  }

  // ============================================================
  // Layer Operations (public API)
  // ============================================================

  /**
   * Add a new clip group layer
   *
   * @returns Layer ID if successful, null if feature not available
   *
   * @remarks
   * Multiple clip groups are not yet supported.
   * Currently, only one surface layer with mask is rendered (built from buildMaskSurface/buildMaskShape).
   * TODO: Support multiple clip groups via heroViewRepository when toHeroViewConfig() is updated.
   */
  const addMaskLayer = (): string | null => {
    // Multiple clip groups not yet supported
    // The current architecture only renders one surface layer from buildMaskSurface/buildMaskShape
    console.warn('addMaskLayer: Multiple clip groups are not yet supported')
    return null
  }

  /**
   * Add a new text layer
   * Returns the layer ID
   */
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

    // Create TextLayerNodeConfig for heroViewRepository
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

    // Add to heroViewRepository (primary source of truth)
    layerUsecase.addLayer(textLayerConfig)

    // Register filter config for new layer
    effectManager.setEffectConfig(id, createDefaultFilterConfig())

    render()
    return id
  }

  /**
   * Add a new object layer (3D object placeholder)
   * Returns the layer ID
   */
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

    // Create Model3DLayerNodeConfig for heroViewRepository
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

    // Add to heroViewRepository (primary source of truth)
    layerUsecase.addLayer(model3DLayerConfig)

    // Register filter config for new layer
    effectManager.setEffectConfig(id, createDefaultFilterConfig())

    render()
    return id
  }

  /**
   * Remove a layer by ID (base layer cannot be removed)
   */
  const removeLayer = (id: string): boolean => {
    if (id === LAYER_IDS.BASE) return false

    // Check if layer exists in repository
    const existingConfig = heroViewRepository.get()
    if (!existingConfig) return false
    const layerExists = existingConfig.layers.some(l => l.id === id)
    if (!layerExists) return false

    // Remove from heroViewRepository (primary source of truth)
    layerUsecase.removeLayer(id)

    // Remove filter config
    effectManager.deleteEffectConfig(id)

    // Cleanup 3D object renderer if exists
    const renderer = object3DRenderers.get(id)
    if (renderer) {
      renderer.dispose()
      object3DRenderers.delete(id)
      loadedModelUrls.delete(id)
    }

    render()
    return true
  }

  /**
   * Update layer visibility
   */
  const updateLayerVisibility = (id: string, visible: boolean) => {
    layerUsecase.updateLayer(id, { visible })
    render()
  }

  /**
   * Toggle layer visibility
   * Uses heroViewRepository as primary source of truth
   */
  const toggleLayerVisibility = (id: string) => {
    // Get current visibility from repository
    const existingConfig = heroViewRepository.get()
    if (!existingConfig) return
    const layer = existingConfig.layers.find(l => l.id === id)
    if (!layer) return

    // Toggle via usecase
    layerUsecase.toggleVisibility(id)
    render()
  }

  /**
   * Update text layer config and re-render
   * Uses heroViewRepository as primary source of truth
   */
  const updateTextLayerConfig = (id: string, updates: Partial<TextLayerConfig>) => {
    // Check if layer exists and is a text layer in repository
    const existingConfig = heroViewRepository.get()
    if (!existingConfig) return
    const layer = existingConfig.layers.find(l => l.id === id)
    if (!layer || layer.type !== 'text') return

    // Update via TextLayerUsecases (uses heroViewRepository internally)
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


  /**
   * Render scene using HeroViewConfig-based pipeline
   *
   * Converts editor state to HeroViewConfig and uses renderHeroConfig()
   * for unified, config-based rendering.
   */
  const renderSceneFromConfig = async () => {
    if (!previewRenderer) return

    const config = toHeroViewConfig()
    await renderHeroConfig(previewRenderer, config, primitivePalette.value)

    // Update cached ImageData for contrast analysis
    try {
      canvasImageData.value = await previewRenderer.readPixels()
    } catch {
      // Ignore errors (e.g., if canvas is not ready)
    }
  }

  /**
   * Render the hero scene using HeroViewConfig-based pipeline
   */
  const render = async () => {
    await renderSceneFromConfig()
  }

  // ============================================================
  // Thumbnail Rendering
  // ============================================================

  /**
   * Create a full-viewport spec for midground texture thumbnail
   * Uses simple (non-masked) texture shaders for proper display
   */
  const createMidgroundThumbnailSpec = (
    preset: MidgroundSurfacePreset,
    color1: RGBA,
    color2: RGBA,
    _viewport: Viewport
  ): TextureRenderSpec | null => {
    const { params } = preset

    switch (params.type) {
      case 'solid':
        return createSolidSpec({ color: color1 })
      case 'stripe':
        return createStripeSpec({
          color1,
          color2,
          width1: params.width1,
          width2: params.width2,
          angle: params.angle,
        })
      case 'grid':
        return createGridSpec({
          lineColor: color1,
          bgColor: color2,
          lineWidth: params.lineWidth,
          cellSize: params.cellSize,
        })
      case 'polkaDot':
        return createPolkaDotSpec({
          dotColor: color1,
          bgColor: color2,
          dotRadius: params.dotRadius,
          spacing: params.spacing,
          rowOffset: params.rowOffset,
        })
      case 'checker':
        return createCheckerSpec({
          color1,
          color2,
          cellSize: params.cellSize,
          angle: params.angle,
        })
      case 'gradientGrain': {
        return createGradientGrainSpec({
          depthMapType: params.depthMapType,
          angle: params.angle,
          centerX: params.centerX,
          centerY: params.centerY,
          radialStartAngle: params.radialStartAngle,
          radialSweepAngle: params.radialSweepAngle,
          perlinScale: params.perlinScale,
          perlinOctaves: params.perlinOctaves,
          perlinContrast: params.perlinContrast,
          perlinOffset: params.perlinOffset,
          colorA: color1,
          colorB: color2,
          seed: params.seed,
          sparsity: params.sparsity,
          curvePoints: [...DEFAULT_GRADIENT_GRAIN_CURVE_POINTS],
        }, _viewport)
      }
      case 'triangle':
        return createTriangleSpec({
          color1,
          color2,
          size: params.size,
          angle: params.angle,
        })
      case 'hexagon':
        return createHexagonSpec({
          color1,
          color2,
          size: params.size,
          angle: params.angle,
        })
      case 'asanoha':
        return createAsanohaSpec({
          lineColor: color1,
          bgColor: color2,
          size: params.size,
          lineWidth: params.lineWidth,
        })
      case 'seigaiha':
        return createSeigaihaSpec({
          lineColor: color1,
          bgColor: color2,
          radius: params.radius,
          rings: params.rings,
          lineWidth: params.lineWidth,
        })
      case 'wave':
        return createWaveSpec({
          color1,
          color2,
          amplitude: params.amplitude,
          wavelength: params.wavelength,
          thickness: params.thickness,
          angle: params.angle,
        })
      case 'scales':
        return createScalesSpec({
          color1,
          color2,
          size: params.size,
          overlap: params.overlap,
          angle: params.angle,
        })
      case 'ogee':
        return createOgeeSpec({
          lineColor: color1,
          bgColor: color2,
          width: params.width,
          height: params.height,
          lineWidth: params.lineWidth,
        })
      case 'sunburst':
        return createSunburstSpec({
          color1,
          color2,
          rays: params.rays,
          centerX: params.centerX,
          centerY: params.centerY,
          twist: params.twist,
          viewportWidth: _viewport.width,
          viewportHeight: _viewport.height,
        })
    }
  }

  const getPatterns = (section: SectionType): (TexturePattern | MaskPattern)[] => {
    if (section === 'background') return texturePatterns
    if (section === 'clip-group-shape') return maskPatterns
    return []
  }

  const destroyThumbnailRenderers = () => {
    for (const r of thumbnailRenderers) {
      r.destroy()
    }
    thumbnailRenderers.length = 0
  }

  const renderThumbnails = async () => {
    const section = activeSection.value
    if (!section) return

    // Handle clip-group-surface section (uses midgroundTexturePatterns which includes gradientGrain)
    if (section === 'clip-group-surface') {
      for (let i = 0; i < thumbnailRenderers.length; i++) {
        const renderer = thumbnailRenderers[i]
        if (!renderer) continue

        const viewport = renderer.getViewport()
        const pattern = midgroundTexturePatterns[i]
        if (pattern) {
          const spec = createMidgroundThumbnailSpec(
            pattern,
            midgroundTextureColor1.value,
            midgroundTextureColor2.value,
            viewport
          )
          if (spec) {
            renderer.render(spec)
          }
        }
      }
      return
    }

    const patterns = getPatterns(section)
    for (let i = 0; i < thumbnailRenderers.length; i++) {
      const renderer = thumbnailRenderers[i]
      const pattern = patterns[i]
      if (renderer && pattern) {
        const viewport = renderer.getViewport()
        const spec = pattern.createSpec(textureColor1.value, textureColor2.value, viewport)
        renderer.render(spec)
      }
    }
  }

  const openSection = (section: SectionType) => {
    destroyThumbnailRenderers()

    if (activeSection.value === section) {
      activeSection.value = null
      return
    }

    activeSection.value = section

    nextTick(async () => {
      const canvases = document.querySelectorAll<HTMLCanvasElement>('[data-thumbnail-canvas]')

      // Handle clip-group-surface section separately (uses midgroundTexturePatterns)
      if (section === 'clip-group-surface') {
        for (let i = 0; i < canvases.length; i++) {
          const canvas = canvases[i]
          if (!canvas) continue
          canvas.width = 256
          canvas.height = 144
          try {
            const renderer = await TextureRenderer.create(canvas)
            thumbnailRenderers.push(renderer)
            const pattern = midgroundTexturePatterns[i]
            if (pattern) {
              const viewport = renderer.getViewport()
              const spec = createMidgroundThumbnailSpec(
                pattern,
                midgroundTextureColor1.value,
                midgroundTextureColor2.value,
                viewport
              )
              if (spec) {
                renderer.render(spec)
              }
            }
          } catch (e) {
            console.error('WebGPU not available:', e)
          }
        }
        return
      }

      // Handle background and clip-group-shape sections
      const patterns = getPatterns(section)
      for (let i = 0; i < canvases.length; i++) {
        const canvas = canvases[i]
        if (!canvas) continue
        canvas.width = 256
        canvas.height = 144
        try {
          const renderer = await TextureRenderer.create(canvas)
          thumbnailRenderers.push(renderer)
          const pattern = patterns[i]
          if (pattern) {
            const viewport = renderer.getViewport()
            const spec = pattern.createSpec(textureColor1.value, textureColor2.value, viewport)
            renderer.render(spec)
          }
        } catch (e) {
          console.error('WebGPU not available:', e)
        }
      }
    })
  }

  // ============================================================
  // Initialization & Cleanup
  // ============================================================

  const initPreview = async (canvas?: HTMLCanvasElement | null) => {
    if (!canvas) return

    canvas.width = editorState.value.config.width
    canvas.height = editorState.value.config.height

    try {
      previewRenderer = await TextureRenderer.create(canvas)

      // Initialize layers (idempotent - only runs once)
      initializeDefaultLayers()

      // Ensure custom params are initialized before first render
      // This handles any edge cases where the immediate watch might not have completed
      if (customBackgroundSurfaceParams.value === null) {
        initBackgroundSurfaceParamsFromPreset()
      }
      if (customMaskShapeParams.value === null && selectedMaskIndex.value !== null) {
        initMaskShapeParamsFromPreset()
      }
      if (customSurfaceParams.value === null) {
        initSurfaceParamsFromPreset()
      }

      await render()
    } catch (e) {
      console.error('WebGPU not available:', e)
    }
  }

  const destroyPreview = () => {
    previewRenderer?.destroy()
    previewRenderer = null
    destroyThumbnailRenderers()

    // Cleanup 3D object renderers
    for (const renderer of object3DRenderers.values()) {
      renderer.dispose()
    }
    object3DRenderers.clear()
    loadedModelUrls.clear()
  }

  // ============================================================
  // Background Image Handling
  // ============================================================

  const setBackgroundImage = async (file: File) => {
    // View層のクリーンアップ
    if (customBackgroundImage.value) {
      URL.revokeObjectURL(customBackgroundImage.value)
    }
    if (customBackgroundBitmap) {
      customBackgroundBitmap.close()
      customBackgroundBitmap = null
    }

    // View層のステート更新
    customBackgroundFile.value = file
    const imageId = URL.createObjectURL(file)
    customBackgroundImage.value = imageId
    customBackgroundBitmap = await createImageBitmap(file)

    // Repositoryを更新
    setBaseSurface({ type: 'image', imageId })

    syncLayerConfigs()
    await render()
  }

  const clearBackgroundImage = () => {
    // View層のクリーンアップ
    if (customBackgroundImage.value) {
      URL.revokeObjectURL(customBackgroundImage.value)
    }
    if (customBackgroundBitmap) {
      customBackgroundBitmap.close()
      customBackgroundBitmap = null
    }
    customBackgroundFile.value = null
    customBackgroundImage.value = null

    // Repositoryを更新
    setBaseSurface({ type: 'solid' })

    syncLayerConfigs()
    render()
  }

  const isLoadingRandomBackground = ref(false)

  const loadRandomBackgroundImage = async (query?: string) => {
    isLoadingRandomBackground.value = true
    try {
      // ImageUploadAdapterでUnsplashからファイル取得
      const file = await imageUploadAdapter.fetchRandom(query)
      await setBackgroundImage(file)
    } finally {
      isLoadingRandomBackground.value = false
    }
  }

  // ============================================================
  // Mask Image Handling
  // ============================================================

  const setMaskImage = async (file: File) => {
    if (customMaskImage.value) {
      URL.revokeObjectURL(customMaskImage.value)
    }
    if (customMaskBitmap) {
      customMaskBitmap.close()
      customMaskBitmap = null
    }

    customMaskFile.value = file
    customMaskImage.value = URL.createObjectURL(file)
    customMaskBitmap = await createImageBitmap(file)

    syncLayerConfigs()
    await render()
  }

  const clearMaskImage = () => {
    if (customMaskImage.value) {
      URL.revokeObjectURL(customMaskImage.value)
    }
    if (customMaskBitmap) {
      customMaskBitmap.close()
      customMaskBitmap = null
    }
    customMaskFile.value = null
    customMaskImage.value = null

    syncLayerConfigs()
    render()
  }

  const isLoadingRandomMask = ref(false)

  const loadRandomMaskImage = async (query?: string) => {
    isLoadingRandomMask.value = true
    try {
      // ImageUploadAdapterでUnsplashからファイル取得
      const file = await imageUploadAdapter.fetchRandom(query)
      await setMaskImage(file)
    } finally {
      isLoadingRandomMask.value = false
    }
  }

  // ============================================================
  // Watchers
  // ============================================================

  // Initialize custom params when selection changes
  // IMPORTANT: These watchers must be registered BEFORE the combined watcher
  // to ensure customParams are updated before syncLayerConfigs/render run
  watch(selectedBackgroundIndex, () => {
    if (isLoadingFromConfig) return
    initBackgroundSurfaceParamsFromPreset()
  }, { immediate: true })

  watch(selectedMaskIndex, () => {
    if (isLoadingFromConfig) return
    initMaskShapeParamsFromPreset()
  }, { immediate: true })

  watch(selectedMidgroundTextureIndex, () => {
    if (isLoadingFromConfig) return
    initSurfaceParamsFromPreset()
  }, { immediate: true })

  // Sync layer configs and re-render when selection changes
  // This watcher runs AFTER the init watchers above
  watch(
    [selectedBackgroundIndex, selectedMaskIndex, selectedMidgroundTextureIndex],
    () => {
      syncLayerConfigs()
      render()
    }
  )

  watch(
    [textureColor1, textureColor2, maskInnerColor, maskOuterColor, midgroundTextureColor1, midgroundTextureColor2],
    () => {
      render()
    }
  )

  watch([textureColor1, textureColor2], renderThumbnails)

  // Filter watchers - watch the Map's changes via deep watch
  watch(
    layerFilterConfigs,
    () => render(),
    { deep: true }
  )

  // Custom params watchers - re-render when params change
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

  // Background color key watchers - sync with Repository when changed
  watch(backgroundColorKey1, (newValue) => {
    if (isLoadingFromConfig) return
    const config = heroViewRepository.get()
    heroViewRepository.set({
      ...config,
      colors: {
        ...config.colors,
        background: { ...config.colors.background, primary: newValue as HeroPrimitiveKey },
      },
    })
  })

  watch(backgroundColorKey2, (newValue) => {
    if (isLoadingFromConfig) return
    const config = heroViewRepository.get()
    heroViewRepository.set({
      ...config,
      colors: {
        ...config.colors,
        background: { ...config.colors.background, secondary: newValue as HeroPrimitiveKey | 'auto' },
      },
    })
  })

  onUnmounted(() => {
    destroyPreview()
    clearBackgroundImage()
    clearMaskImage()
  })

  // ============================================================
  // Foreground Config (HTML Layer)
  // ============================================================
  const foregroundConfig = ref<ForegroundLayerConfig>(createDefaultForegroundConfig())

  // ============================================================
  // HeroViewConfig Serialization
  // ============================================================

  /**
   * Build SurfaceConfig from current background state
   */
  const buildBackgroundSurface = (): HeroSurfaceConfig => {
    // Custom image takes precedence
    if (customBackgroundImage.value) {
      return { type: 'image', imageId: customBackgroundImage.value }
    }

    // Custom params
    const params = customBackgroundSurfaceParams.value
    if (params) {
      if (params.type === 'solid') return { type: 'solid' }
      if (params.type === 'stripe') return { type: 'stripe', width1: params.width1, width2: params.width2, angle: params.angle }
      if (params.type === 'grid') return { type: 'grid', lineWidth: params.lineWidth, cellSize: params.cellSize }
      if (params.type === 'polkaDot') return { type: 'polkaDot', dotRadius: params.dotRadius, spacing: params.spacing, rowOffset: params.rowOffset }
      if (params.type === 'checker') return { type: 'checker', cellSize: params.cellSize, angle: params.angle }
      if (params.type === 'triangle') return { type: 'triangle', size: params.size, angle: params.angle }
      if (params.type === 'hexagon') return { type: 'hexagon', size: params.size, angle: params.angle }
      if (params.type === 'gradientGrain') return {
        type: 'gradientGrain',
        depthMapType: params.depthMapType,
        angle: params.angle,
        centerX: params.centerX,
        centerY: params.centerY,
        radialStartAngle: params.radialStartAngle,
        radialSweepAngle: params.radialSweepAngle,
        perlinScale: params.perlinScale,
        perlinOctaves: params.perlinOctaves,
        perlinContrast: params.perlinContrast,
        perlinOffset: params.perlinOffset,
        seed: params.seed,
        sparsity: params.sparsity,
      }
      if (params.type === 'asanoha') return { type: 'asanoha', size: params.size, lineWidth: params.lineWidth }
      if (params.type === 'seigaiha') return { type: 'seigaiha', radius: params.radius, rings: params.rings, lineWidth: params.lineWidth }
      if (params.type === 'wave') return { type: 'wave', amplitude: params.amplitude, wavelength: params.wavelength, thickness: params.thickness, angle: params.angle }
      if (params.type === 'scales') return { type: 'scales', size: params.size, overlap: params.overlap, angle: params.angle }
      if (params.type === 'ogee') return { type: 'ogee', width: params.width, height: params.height, lineWidth: params.lineWidth }
      if (params.type === 'sunburst') return { type: 'sunburst', rays: params.rays, centerX: params.centerX, centerY: params.centerY, twist: params.twist }
    }

    return { type: 'solid' }
  }

  /**
   * Build SurfaceConfig from current mask state
   */
  const buildMaskSurface = (): HeroSurfaceConfig => {
    // Custom image takes precedence
    if (customMaskImage.value) {
      return { type: 'image', imageId: customMaskImage.value }
    }

    // Custom surface params
    const params = customSurfaceParams.value
    if (params) {
      if (params.type === 'solid') return { type: 'solid' }
      if (params.type === 'stripe') return { type: 'stripe', width1: params.width1, width2: params.width2, angle: params.angle }
      if (params.type === 'grid') return { type: 'grid', lineWidth: params.lineWidth, cellSize: params.cellSize }
      if (params.type === 'polkaDot') return { type: 'polkaDot', dotRadius: params.dotRadius, spacing: params.spacing, rowOffset: params.rowOffset }
      if (params.type === 'checker') return { type: 'checker', cellSize: params.cellSize, angle: params.angle }
      if (params.type === 'triangle') return { type: 'triangle', size: params.size, angle: params.angle }
      if (params.type === 'hexagon') return { type: 'hexagon', size: params.size, angle: params.angle }
      if (params.type === 'gradientGrain') return {
        type: 'gradientGrain',
        depthMapType: params.depthMapType,
        angle: params.angle,
        centerX: params.centerX,
        centerY: params.centerY,
        radialStartAngle: params.radialStartAngle,
        radialSweepAngle: params.radialSweepAngle,
        perlinScale: params.perlinScale,
        perlinOctaves: params.perlinOctaves,
        perlinContrast: params.perlinContrast,
        perlinOffset: params.perlinOffset,
        seed: params.seed,
        sparsity: params.sparsity,
      }
      if (params.type === 'asanoha') return { type: 'asanoha', size: params.size, lineWidth: params.lineWidth }
      if (params.type === 'seigaiha') return { type: 'seigaiha', radius: params.radius, rings: params.rings, lineWidth: params.lineWidth }
      if (params.type === 'wave') return { type: 'wave', amplitude: params.amplitude, wavelength: params.wavelength, thickness: params.thickness, angle: params.angle }
      if (params.type === 'scales') return { type: 'scales', size: params.size, overlap: params.overlap, angle: params.angle }
      if (params.type === 'ogee') return { type: 'ogee', width: params.width, height: params.height, lineWidth: params.lineWidth }
      if (params.type === 'sunburst') return { type: 'sunburst', rays: params.rays, centerX: params.centerX, centerY: params.centerY, twist: params.twist }
    }

    return { type: 'solid' }
  }

  /**
   * Build MaskShapeConfig from current state
   */
  const buildMaskShape = (): HeroMaskShapeConfig | null => {
    const params = customMaskShapeParams.value
    if (!params) return null

    if (params.type === 'circle') {
      return {
        type: 'circle',
        centerX: params.centerX,
        centerY: params.centerY,
        radius: params.radius,
        cutout: params.cutout,
      }
    }
    if (params.type === 'rect') {
      return {
        type: 'rect',
        left: params.left,
        right: params.right,
        top: params.top,
        bottom: params.bottom,
        radiusTopLeft: params.radiusTopLeft,
        radiusTopRight: params.radiusTopRight,
        radiusBottomLeft: params.radiusBottomLeft,
        radiusBottomRight: params.radiusBottomRight,
        rotation: params.rotation,
        perspectiveX: params.perspectiveX,
        perspectiveY: params.perspectiveY,
        cutout: params.cutout,
      }
    }
    if (params.type === 'perlin') {
      return {
        type: 'perlin',
        seed: params.seed,
        threshold: params.threshold,
        scale: params.scale,
        octaves: params.octaves,
        cutout: params.cutout,
      }
    }
    if (params.type === 'linearGradient') {
      return {
        type: 'linearGradient',
        angle: params.angle,
        startOffset: params.startOffset,
        endOffset: params.endOffset,
        cutout: params.cutout,
      }
    }
    if (params.type === 'radialGradient') {
      return {
        type: 'radialGradient',
        centerX: params.centerX,
        centerY: params.centerY,
        innerRadius: params.innerRadius,
        outerRadius: params.outerRadius,
        aspectRatio: params.aspectRatio,
        cutout: params.cutout,
      }
    }
    if (params.type === 'boxGradient') {
      return {
        type: 'boxGradient',
        left: params.left,
        right: params.right,
        top: params.top,
        bottom: params.bottom,
        cornerRadius: params.cornerRadius,
        curve: params.curve as 'linear' | 'smooth' | 'easeIn' | 'easeOut',
        cutout: params.cutout,
      }
    }
    // blob
    return {
      type: 'blob',
      centerX: params.centerX,
      centerY: params.centerY,
      baseRadius: params.baseRadius,
      amplitude: params.amplitude,
      octaves: params.octaves,
      seed: params.seed,
      cutout: params.cutout,
    }
  }

  /**
   * Build colors config from current state
   */
  const buildColorsConfig = (): HeroColorsConfig => ({
    background: {
      primary: backgroundColorKey1.value as HeroPrimitiveKey,
      secondary: backgroundColorKey2.value as HeroPrimitiveKey | 'auto',
    },
    mask: {
      primary: maskColorKey1.value as HeroPrimitiveKey | 'auto',
      secondary: maskColorKey2.value as HeroPrimitiveKey | 'auto',
    },
    semanticContext: maskSemanticContext.value as HeroContextName,
    brand: { hue: 198, saturation: 70, value: 65 },
    accent: { hue: 30, saturation: 80, value: 60 },
    foundation: { hue: 0, saturation: 0, value: 97 },
  })

  /**
   * Convert current editor state to HeroViewConfig
   * Returns a self-contained, JSON-serializable config with LayerNodeConfig[] structure
   */
  const toHeroViewConfig = (): HeroViewConfig => {
    const baseFilters = layerFilterConfigs.value.get(LAYER_IDS.BASE) ?? createDefaultFilterConfig()
    const maskFilters = layerFilterConfigs.value.get(LAYER_IDS.MASK) ?? createDefaultFilterConfig()

    // Build layers array
    const layers: LayerNodeConfig[] = []

    // Base layer (always present)
    const baseLayer: BaseLayerNodeConfig = {
      type: 'base',
      id: 'base',
      name: 'Background',
      visible: true,
      surface: buildBackgroundSurface(),
      filters: [
        {
          type: 'effect',
          enabled: true,
          config: baseFilters,
        },
      ],
    }
    layers.push(baseLayer)

    // Surface layer with mask (if mask is enabled)
    const maskShape = buildMaskShape()
    if (maskShape && selectedMaskIndex.value !== null) {
      const surfaceLayer: SurfaceLayerNodeConfig = {
        type: 'surface',
        id: 'surface-1',
        name: 'Mask Surface',
        visible: true,
        surface: buildMaskSurface(),
        filters: [
          {
            type: 'effect',
            enabled: true,
            config: maskFilters,
          },
        ],
      }
      layers.push(surfaceLayer)

      // Mask processor node
      layers.push({
        type: 'processor',
        id: 'processor-mask',
        name: 'Mask Processor',
        visible: true,
        modifiers: [
          {
            type: 'mask',
            enabled: true,
            shape: maskShape,
            invert: false,
            feather: 0,
          } as MaskProcessorConfig,
        ],
      })
    }

    // Preserve text and model3d layers from heroViewRepository
    // These are managed via layerUsecase.addLayer() and should not be rebuilt from canvasLayers
    const existingConfig = heroViewRepository.get()
    if (existingConfig) {
      for (const existingLayer of existingConfig.layers) {
        if (existingLayer.type === 'text' || existingLayer.type === 'model3d') {
          layers.push(existingLayer)
        }
      }
    }

    const config: HeroViewConfig = {
      viewport: {
        width: editorState.value.config.width,
        height: editorState.value.config.height,
      },
      colors: buildColorsConfig(),
      layers,
      foreground: foregroundConfig.value,
    }

    // Sync to HeroViewRepository for Usecase access
    heroViewRepository.set(config)

    return config
  }

  /**
   * Save current state to repository (if provided)
   */
  const saveToRepository = () => {
    if (repository) {
      repository.set(toHeroViewConfig())
    }
  }

  /**
   * Restore editor state from HeroViewConfig
   * Note: Image restoration requires additional handling (imageId → ImageBitmap)
   */
  const fromHeroViewConfig = async (config: HeroViewConfig) => {
    // Prevent watchers from overwriting custom params during config load
    isLoadingFromConfig = true

    // Sync to HeroViewRepository for Usecase access
    heroViewRepository.set(config)

    // Viewport
    editorState.value = {
      ...editorState.value,
      config: {
        ...editorState.value.config,
        width: config.viewport.width,
        height: config.viewport.height,
      },
    }

    // Colors (restore from config, fallback to defaults if not present)
    const colors = config.colors ?? createDefaultColorsConfig()
    backgroundColorKey1.value = colors.background.primary as PrimitiveKey
    backgroundColorKey2.value = colors.background.secondary as PrimitiveKey | 'auto'
    maskColorKey1.value = colors.mask.primary as PrimitiveKey | 'auto'
    maskColorKey2.value = colors.mask.secondary as PrimitiveKey | 'auto'
    maskSemanticContext.value = colors.semanticContext as ContextName

    // Find base layer and surface layer from config.layers (including nested in groups)
    const baseLayer = config.layers.find((l): l is BaseLayerNodeConfig => l.type === 'base')

    // Surface layer may be nested inside a group
    let surfaceLayer: SurfaceLayerNodeConfig | undefined
    for (const layer of config.layers) {
      if (layer.type === 'surface') {
        surfaceLayer = layer
        break
      }
      if (layer.type === 'group' && layer.children) {
        const nested = layer.children.find((c): c is SurfaceLayerNodeConfig => c.type === 'surface')
        if (nested) {
          surfaceLayer = nested
          break
        }
      }
    }

    // Background surface (from base layer)
    if (baseLayer) {
      const bgSurface = baseLayer.surface

      // Sync customBackgroundSurfaceParams from config (reuse shared function)
      syncBackgroundSurfaceParamsFromRepository(config)

      // Handle image type separately (requires async restore)
      if (bgSurface.type === 'image') {
        await restoreBackgroundImage(bgSurface.imageId)
      }

      // Reverse-lookup background surface preset index
      const bgPresetIndex = findSurfacePresetIndex(bgSurface, surfacePresets)
      selectedBackgroundIndex.value = bgPresetIndex ?? 0

      // Background filters (from effect filter, merged with defaults for backward compatibility)
      const effectFilter = (baseLayer.filters ?? []).find((p) => p.type === 'effect')
      if (effectFilter) {
        const defaults = createDefaultFilterConfig()
        const merged: LayerFilterConfig = {
          vignette: { ...defaults.vignette, ...effectFilter.config.vignette },
          chromaticAberration: { ...defaults.chromaticAberration, ...effectFilter.config.chromaticAberration },
          dotHalftone: { ...defaults.dotHalftone, ...effectFilter.config.dotHalftone },
          lineHalftone: { ...defaults.lineHalftone, ...effectFilter.config.lineHalftone },
          blur: { ...defaults.blur, ...(effectFilter.config.blur ?? {}) },
        }
        effectManager.setEffectConfig(LAYER_IDS.BASE, merged)
      }
    }

    // Find processor node with mask
    let maskShape: HeroMaskShapeConfig | undefined
    for (const layer of config.layers) {
      if (layer.type === 'processor') {
        const maskModifier = layer.modifiers.find((m): m is MaskProcessorConfig => m.type === 'mask')
        if (maskModifier) {
          maskShape = maskModifier.shape
          break
        }
      }
    }

    // Surface layer with mask
    if (surfaceLayer && maskShape) {
      // Mask shape
      const shape = maskShape
        if (shape.type === 'circle') {
          customMaskShapeParams.value = {
            type: 'circle',
            centerX: shape.centerX,
            centerY: shape.centerY,
            radius: shape.radius,
            cutout: shape.cutout,
          }
        } else if (shape.type === 'rect') {
          customMaskShapeParams.value = {
            type: 'rect',
            left: shape.left,
            right: shape.right,
            top: shape.top,
            bottom: shape.bottom,
            radiusTopLeft: shape.radiusTopLeft,
            radiusTopRight: shape.radiusTopRight,
            radiusBottomLeft: shape.radiusBottomLeft,
            radiusBottomRight: shape.radiusBottomRight,
            rotation: shape.rotation,
            perspectiveX: shape.perspectiveX,
            perspectiveY: shape.perspectiveY,
            cutout: shape.cutout,
          }
        } else if (shape.type === 'perlin') {
          customMaskShapeParams.value = {
            type: 'perlin',
            seed: shape.seed,
            threshold: shape.threshold,
            scale: shape.scale,
            octaves: shape.octaves,
            cutout: shape.cutout,
          }
        } else if (shape.type === 'linearGradient') {
          customMaskShapeParams.value = {
            type: 'linearGradient',
            angle: shape.angle,
            startOffset: shape.startOffset,
            endOffset: shape.endOffset,
            cutout: shape.cutout,
          }
        } else if (shape.type === 'radialGradient') {
          customMaskShapeParams.value = {
            type: 'radialGradient',
            centerX: shape.centerX,
            centerY: shape.centerY,
            innerRadius: shape.innerRadius,
            outerRadius: shape.outerRadius,
            aspectRatio: shape.aspectRatio,
            cutout: shape.cutout,
          } as CustomMaskShapeParams
        } else if (shape.type === 'boxGradient') {
          customMaskShapeParams.value = {
            type: 'boxGradient',
            left: shape.left,
            right: shape.right,
            top: shape.top,
            bottom: shape.bottom,
            cornerRadius: shape.cornerRadius,
            curve: shape.curve,
            cutout: shape.cutout,
          } as CustomMaskShapeParams
        } else {
          customMaskShapeParams.value = {
            type: 'blob',
            centerX: shape.centerX,
            centerY: shape.centerY,
            baseRadius: shape.baseRadius,
            amplitude: shape.amplitude,
            octaves: shape.octaves,
            seed: shape.seed,
            cutout: shape.cutout,
          }
        }

        // Reverse-lookup mask shape index (null = custom params, keep as-is)
        selectedMaskIndex.value = findMaskPatternIndex(shape, maskPatterns)
      } else {
        selectedMaskIndex.value = null
        customMaskShapeParams.value = null
      }

      // Mask surface (only if surfaceLayer exists)
      if (surfaceLayer) {
        const maskSurface = surfaceLayer.surface
        if (maskSurface.type === 'solid') {
          customSurfaceParams.value = { type: 'solid' }
        } else if (maskSurface.type === 'stripe') {
          customSurfaceParams.value = { type: 'stripe', width1: maskSurface.width1, width2: maskSurface.width2, angle: maskSurface.angle }
        } else if (maskSurface.type === 'grid') {
          customSurfaceParams.value = { type: 'grid', lineWidth: maskSurface.lineWidth, cellSize: maskSurface.cellSize }
        } else if (maskSurface.type === 'polkaDot') {
          customSurfaceParams.value = { type: 'polkaDot', dotRadius: maskSurface.dotRadius, spacing: maskSurface.spacing, rowOffset: maskSurface.rowOffset }
        } else if (maskSurface.type === 'checker') {
          customSurfaceParams.value = { type: 'checker', cellSize: maskSurface.cellSize, angle: maskSurface.angle }
        } else if (maskSurface.type === 'image') {
          // Restore mask image from imageId (URL)
          await restoreMaskImage(maskSurface.imageId)
        }

        // Reverse-lookup mask surface preset index
        const midgroundPresetIndex = findSurfacePresetIndex(maskSurface, midgroundTexturePatterns)
        selectedMidgroundTextureIndex.value = midgroundPresetIndex ?? 0

        // Mask filters (from effect filter, merged with defaults for backward compatibility)
        const maskEffectFilter = (surfaceLayer.filters ?? []).find((p) => p.type === 'effect')
        if (maskEffectFilter) {
          const defaults = createDefaultFilterConfig()
          const merged: LayerFilterConfig = {
            vignette: { ...defaults.vignette, ...maskEffectFilter.config.vignette },
            chromaticAberration: { ...defaults.chromaticAberration, ...maskEffectFilter.config.chromaticAberration },
            dotHalftone: { ...defaults.dotHalftone, ...maskEffectFilter.config.dotHalftone },
            lineHalftone: { ...defaults.lineHalftone, ...maskEffectFilter.config.lineHalftone },
            blur: { ...defaults.blur, ...(maskEffectFilter.config.blur ?? {}) },
          }
          effectManager.setEffectConfig(LAYER_IDS.MASK, merged)
        }
    } else {
      selectedMaskIndex.value = null
      customMaskShapeParams.value = null
      customSurfaceParams.value = null
    }

    // Foreground
    foregroundConfig.value = config.foreground

    // Sync layer configs and re-render
    syncLayerConfigs()
    await render()

    // Re-enable watchers
    isLoadingFromConfig = false
  }

  /**
   * Restore background image from URL (imageId)
   */
  const restoreBackgroundImage = async (imageId: string) => {
    try {
      const response = await fetch(imageId)
      const blob = await response.blob()
      const file = new File([blob], `restored-bg-${Date.now()}.jpg`, { type: blob.type })
      await setBackgroundImage(file)
    } catch (e) {
      console.error('Failed to restore background image:', e)
    }
  }

  /**
   * Restore mask image from URL (imageId)
   */
  const restoreMaskImage = async (imageId: string) => {
    try {
      const response = await fetch(imageId)
      const blob = await response.blob()
      const file = new File([blob], `restored-mask-${Date.now()}.jpg`, { type: blob.type })
      await setMaskImage(file)
    } catch (e) {
      console.error('Failed to restore mask image:', e)
    }
  }

  // ============================================================
  // Preset Management
  // ============================================================

  const presetRepository = createInMemoryHeroViewPresetRepository()
  const presetUseCase = createGetHeroViewPresetsUseCase(presetRepository)
  const presets = ref<HeroViewPreset[]>([])
  const selectedPresetId = ref<string | null>('corporate-clean')

  /**
   * Load available presets and optionally apply the initial preset
   */
  const loadPresets = async (applyInitial = true) => {
    presets.value = await presetUseCase.execute()
    // Apply initial preset if specified
    if (applyInitial && selectedPresetId.value) {
      const preset = await presetUseCase.findById(selectedPresetId.value)
      if (preset) {
        // Apply preset using Usecase (updates repository with config and colors)
        applyPresetUsecase(preset, heroViewRepository)
        // Update editor state from config
        await fromHeroViewConfig(preset.config)
        return preset.colorPreset ?? null
      }
    }
    return null
  }

  /**
   * Apply a preset by ID
   * Returns the colorPreset if available for the caller to apply
   */
  const applyPreset = async (presetId: string) => {
    const preset = await presetUseCase.findById(presetId)
    if (preset) {
      selectedPresetId.value = presetId
      // Apply preset using Usecase (updates repository with config and colors)
      applyPresetUsecase(preset, heroViewRepository)
      // Update editor state from config
      await fromHeroViewConfig(preset.config)
      return preset.colorPreset ?? null
    }
    return null
  }

  // Preset export adapter (browser file download)
  const presetExportAdapter = createBrowserPresetExporter()

  /**
   * Export current configuration as a preset JSON file
   * @param options - Export options (id, name)
   * @returns The exported preset
   */
  const exportPreset = (options: ExportPresetOptions = {}) => {
    return exportPresetUsecase(heroViewRepository, presetExportAdapter, options)
  }

  // ============================================================
  // Repository Integration
  // ============================================================

  // Track repository subscription for cleanup
  let repositoryUnsubscribe: (() => void) | null = null
  let heroViewRepositoryUnsubscribe: (() => void) | null = null

  /**
   * Sync customBackgroundSurfaceParams from Repository's base layer surface
   * This enables unidirectional data flow: Usecase -> Repository -> View
   * Now delegates to syncBackgroundSurfaceParams from Application/ConfigSyncer
   */
  const syncBackgroundSurfaceParamsFromRepository = (config: HeroViewConfig): void => {
    const result = syncBackgroundSurfaceParams(config, textureColor1.value, textureColor2.value)
    if (result.surfaceParams !== null) {
      customBackgroundSurfaceParams.value = result.surfaceParams
    }
    // Note: 'image' type returns null and is handled separately via customBackgroundImage
  }

  /**
   * Sync customSurfaceParams from Repository's surface layer
   * This enables unidirectional data flow: Usecase -> Repository -> View
   * Now delegates to syncMaskSurfaceParams from Application/ConfigSyncer
   */
  const syncMaskSurfaceParamsFromRepository = (config: HeroViewConfig): void => {
    const result = syncMaskSurfaceParams(config, midgroundTextureColor1.value, midgroundTextureColor2.value)
    if (result.surfaceParams !== null) {
      customSurfaceParams.value = result.surfaceParams
    }
    // Note: 'image' type returns null and is handled separately via customMaskImage
  }

  // Subscribe to internal heroViewRepository changes for unidirectional flow
  heroViewRepositoryUnsubscribe = heroViewRepository.subscribe((config: HeroViewConfig) => {
    // Skip during fromHeroViewConfig to avoid redundant updates
    if (isLoadingFromConfig) return
    syncBackgroundSurfaceParamsFromRepository(config)
    syncMaskSurfaceParamsFromRepository(config)
  })

  // Subscribe to repository changes (if provided)
  if (repository) {
    repositoryUnsubscribe = repository.subscribe(async (config: HeroViewConfig) => {
      // Skip if we're the ones who triggered the update
      if (isLoadingFromConfig) return
      // Load external changes
      await fromHeroViewConfig(config)
    })
  }

  // Cleanup repository subscriptions on unmount
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

  /**
   * Pattern state for texture/mask selection and thumbnails
   */
  const pattern: PatternState = {
    texturePatterns,
    maskPatterns,
    midgroundTexturePatterns,
    textureColor1,
    textureColor2,
    midgroundTextureColor1,
    midgroundTextureColor2,
    maskInnerColor,
    maskOuterColor,
    createMidgroundThumbnailSpec,
    createBackgroundThumbnailSpec: (viewport: { width: number; height: number }) => {
      const bgPattern = texturePatterns[selectedBackgroundIndex.value]
      if (bgPattern) {
        return bgPattern.createSpec(textureColor1.value, textureColor2.value, viewport)
      }
      return null
    },
    selectedBackgroundIndex,
    selectedMaskIndex,
    selectedMidgroundTextureIndex,
    activeSection,
  }

  /**
   * Background layer state and actions
   */
  const background: BackgroundState = {
    backgroundColorKey1,
    backgroundColorKey2,
    customBackgroundImage,
    customBackgroundFile,
    setBackgroundImage,
    clearBackgroundImage,
    loadRandomBackgroundImage,
    isLoadingRandomBackground,
    customBackgroundSurfaceParams,
    currentBackgroundSurfaceSchema,
    updateBackgroundSurfaceParams,
  }

  /**
   * Mask (clip group) state and actions
   */
  const mask: MaskState = {
    maskColorKey1,
    maskColorKey2,
    maskSemanticContext,
    customMaskImage,
    customMaskFile,
    setMaskImage,
    clearMaskImage,
    loadRandomMaskImage,
    isLoadingRandomMask,
    customMaskShapeParams,
    customSurfaceParams,
    currentMaskShapeSchema,
    currentSurfaceSchema,
    updateMaskShapeParams,
    updateSurfaceParams,
  }

  /**
   * Filter/effect state and actions
   */
  const filter: FilterState = {
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

  /**
   * Foreground (HTML layer) state
   */
  const foreground: ForegroundState = {
    foregroundConfig,
    foregroundTitleColor,
    foregroundBodyColor,
    foregroundElementColors,
    foregroundTitleAutoKey,
    foregroundBodyAutoKey,
  }

  /**
   * Preset management state and actions
   */
  const preset: PresetState = {
    presets,
    selectedPresetId,
    loadPresets,
    applyPreset,
    exportPreset,
  }

  /**
   * Layer operation actions
   */
  const layer: LayerOperations = {
    addMaskLayer,
    addTextLayer,
    addObjectLayer,
    removeLayer,
    updateLayerVisibility,
    toggleLayerVisibility,
    updateTextLayerConfig,
  }

  /**
   * Ink color helper functions
   */
  const inkColor: InkColorHelpers = {
    getInkColorForSurface,
    getInkRgbaForSurface,
  }

  /**
   * Canvas and rendering state
   */
  const canvas: CanvasState = {
    canvasImageData,
    setElementBounds,
  }

  /**
   * Serialization and repository operations
   */
  const serialization: SerializationState = {
    toHeroViewConfig,
    fromHeroViewConfig,
    saveToRepository,
  }

  /**
   * Direct access to underlying usecases
   */
  const usecase: UsecaseState = {
    heroViewRepository,
    surfaceUsecase,
    colorUsecase,
    layerUsecase,
    foregroundElementUsecase,
    presetUsecase,
    selectedForegroundElementId,
  }

  /**
   * Current HeroViewConfig computed from toHeroViewConfig()
   * This is the new preferred way to access editor state
   */
  const heroViewConfigComputed = computed(() => toHeroViewConfig())

  /**
   * Editor state for debugging/inspection
   */
  const editor: EditorStateRef = {
    heroViewConfig: heroViewConfigComputed,
  }

  /**
   * Preview renderer control actions
   */
  const renderer: RendererActions = {
    initPreview,
    destroyPreview,
    openSection,
    renderSceneFromConfig,
  }

  // ============================================================
  // Public API
  // ============================================================

  return {
    // ============================================================
    // Grouped State Objects
    // ============================================================
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
