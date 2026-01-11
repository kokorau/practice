/**
 * useHeroScene
 *
 * HeroSceneモジュールをVueのリアクティブシステムと連携するcomposable
 * 現在は2レイヤー固定（base, mask）
 */

import { ref, shallowRef, computed, watch, nextTick, onUnmounted, type ComputedRef, type Ref } from 'vue'
import {
  TextureRenderer,
  getDefaultTexturePatterns,
  getDefaultMaskPatterns,
  getSurfacePresets,
  createCircleStripeSpec,
  createCircleGridSpec,
  createCirclePolkaDotSpec,
  createCircleCheckerSpec,
  createRectStripeSpec,
  createRectGridSpec,
  createRectPolkaDotSpec,
  createRectCheckerSpec,
  createBlobStripeSpec,
  createBlobGridSpec,
  createBlobPolkaDotSpec,
  createBlobCheckerSpec,
  createPerlinStripeSpec,
  createPerlinGridSpec,
  createPerlinPolkaDotSpec,
  createPerlinCheckerSpec,
  // Masked GradientGrain specs
  createCircleGradientGrainSpec,
  createRectGradientGrainSpec,
  createBlobGradientGrainSpec,
  type GradientGrainTextureConfig,
  // Simple texture specs (no mask) for thumbnails
  createSolidSpec,
  createStripeSpec,
  createGridSpec,
  createPolkaDotSpec,
  createCheckerSpec,
  // Gradient specs
  createGradientGrainSpec,
  // Mask specs (for solid fallback with custom cutout)
  createCircleMaskSpec,
  createRectMaskSpec,
  createBlobMaskSpec,
  createPerlinMaskSpec,
  // Clip mask specs (for ClipGroup rendering)
  createCircleClipSpec,
  createRectClipSpec,
  createBlobClipSpec,
  createPerlinClipSpec,
  // Schemas and types
  MaskShapeSchemas,
  SurfaceSchemas,
  type TexturePattern,
  type MaskPattern,
  type MaskShapeConfig,
  type RGBA,
  type CircleMaskShapeConfig,
  type RectMaskShapeConfig,
  type BlobMaskShapeConfig,
  type PerlinMaskShapeConfig,
  type Viewport,
  type TextureRenderSpec,
  type SurfacePresetParams,
  type SolidPresetParams,
  type StripePresetParams,
  type GridPresetParams,
  type PolkaDotPresetParams,
  type CheckerPresetParams,
  type CircleMaskShapeParams,
  type RectMaskShapeParams,
  type BlobMaskShapeParams,
  type PerlinMaskShapeParams,
  type StripeSurfaceParams,
  type GridSurfaceParams,
  type PolkaDotSurfaceParams,
  type CheckerSurfaceParams,
  type DepthMapType,
  // Text rendering
  renderTextToBitmap,
  anchorToNumbers,
} from '@practice/texture'
import type { ObjectSchema } from '@practice/schema'
// Filters (separate subpath for tree-shaking)
import {
  createVignetteSpec,
  chromaticAberrationShader,
  createChromaticAberrationUniforms,
  CHROMATIC_ABERRATION_BUFFER_SIZE,
  dotHalftoneShader,
  createDotHalftoneUniforms,
  DOT_HALFTONE_BUFFER_SIZE,
  lineHalftoneShader,
  createLineHalftoneUniforms,
  LINE_HALFTONE_BUFFER_SIZE,
} from '@practice/texture/filters'
import { $Oklch } from '@practice/color'
import type { Oklch } from '@practice/color'
import type { PrimitivePalette, ContextName, PrimitiveKey, NeutralKey } from '../../modules/SemanticColorPalette/Domain'
import { NEUTRAL_KEYS, selectNeutralByHistogram, APCA_INK_TARGETS, type NeutralEntry } from '../../modules/SemanticColorPalette/Domain'
import { selectInkForSurface } from '../../modules/SemanticColorPalette/Infra'
import type { InkRole } from '../../modules/SemanticColorPalette/Domain'
import { generateLuminanceMap } from '../../modules/ContrastChecker'
import { fetchUnsplashPhotoUrl } from '../../modules/PhotoUnsplash/Infra/fetchUnsplashPhoto'
import {
  type LayerFilterConfig,
  type HeroSceneEditorState,
  type EditorCanvasLayer,
  type HeroViewConfig,
  type HeroColorsConfig,
  type HeroPrimitiveKey,
  type HeroContextName,
  type HeroSurfaceConfig,
  type MaskShapeConfig as HeroMaskShapeConfig,
  type LayerNodeConfig,
  type BaseLayerNodeConfig,
  type SurfaceLayerNodeConfig,
  type EffectProcessorConfig,
  type MaskProcessorConfig,
  type ForegroundLayerConfig,
  type HeroViewPreset,
  type TextLayerConfig,
  type Object3DRendererPort,
  type HeroViewRepository,
  type FilterType,
  createHeroSceneEditorState,
  createDefaultFilterConfig,
  createDefaultForegroundConfig,
  createDefaultColorsConfig,
  createGetHeroViewPresetsUseCase,
  createInMemoryHeroViewPresetRepository,
  findSurfacePresetIndex,
  findMaskPatternIndex,
  createObject3DRenderer,
  // TextLayer UseCases
  updateTextLayerText,
  updateTextLayerFont,
  updateTextLayerColor,
  updateTextLayerPosition,
  updateTextLayerRotation,
  createHeroViewInMemoryRepository,
  createMaskUsecase,
} from '../../modules/HeroScene'

// ============================================================
// Types
// ============================================================

/**
 * Midground texture preset - same as SurfacePresetParams
 * Now includes solid for consistency with background
 */
export type MidgroundPresetParams = SolidPresetParams | StripePresetParams | GridPresetParams | PolkaDotPresetParams | CheckerPresetParams

export interface MidgroundSurfacePreset {
  label: string
  params: MidgroundPresetParams
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
 * Get all SurfacePresets as MidgroundSurfacePreset (now includes solid)
 */
const getMidgroundPresets = (): MidgroundSurfacePreset[] => {
  return getSurfacePresets() as MidgroundSurfacePreset[]
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
  const editorState = ref<HeroSceneEditorState>(createHeroSceneEditorState({ width: 1920, height: 1080 }))

  // Selection state (UI bindings)
  const selectedBackgroundIndex = ref(3)
  const selectedMaskIndex = ref<number | null>(0)
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
  // HeroViewRepository & MaskUsecase
  // ============================================================
  const heroViewRepository = createHeroViewInMemoryRepository()
  const maskUsecase = createMaskUsecase({ repository: heroViewRepository })

  // ============================================================
  // Custom Shape/Surface Params State
  // ============================================================


  /**
   * Extract custom shape params from a MaskPattern's maskConfig
   */
  const extractMaskShapeParams = (maskConfig: MaskShapeConfig): CustomMaskShapeParams => {
    if (maskConfig.type === 'circle') {
      return {
        type: 'circle',
        centerX: maskConfig.centerX,
        centerY: maskConfig.centerY,
        radius: maskConfig.radius,
        cutout: maskConfig.cutout ?? true,
      }
    }
    if (maskConfig.type === 'rect') {
      return {
        type: 'rect',
        left: maskConfig.left,
        right: maskConfig.right,
        top: maskConfig.top,
        bottom: maskConfig.bottom,
        radiusTopLeft: maskConfig.radiusTopLeft ?? 0,
        radiusTopRight: maskConfig.radiusTopRight ?? 0,
        radiusBottomLeft: maskConfig.radiusBottomLeft ?? 0,
        radiusBottomRight: maskConfig.radiusBottomRight ?? 0,
        cutout: maskConfig.cutout ?? true,
      }
    }
    if (maskConfig.type === 'perlin') {
      return {
        type: 'perlin',
        seed: maskConfig.seed,
        threshold: maskConfig.threshold,
        scale: maskConfig.scale,
        octaves: maskConfig.octaves,
        cutout: maskConfig.cutout ?? true,
      }
    }
    // blob
    return {
      type: 'blob',
      centerX: maskConfig.centerX,
      centerY: maskConfig.centerY,
      baseRadius: maskConfig.baseRadius,
      amplitude: maskConfig.amplitude,
      octaves: maskConfig.octaves,
      seed: maskConfig.seed,
      cutout: maskConfig.cutout ?? true,
    }
  }

  /**
   * Extract surface params from a MidgroundSurfacePreset
   */
  const extractSurfaceParams = (preset: MidgroundSurfacePreset): CustomSurfaceParams => {
    const { params } = preset
    if (params.type === 'solid') {
      return { type: 'solid' }
    }
    if (params.type === 'stripe') {
      return { type: 'stripe', width1: params.width1, width2: params.width2, angle: params.angle }
    }
    if (params.type === 'grid') {
      return { type: 'grid', lineWidth: params.lineWidth, cellSize: params.cellSize }
    }
    if (params.type === 'polkaDot') {
      return { type: 'polkaDot', dotRadius: params.dotRadius, spacing: params.spacing, rowOffset: params.rowOffset }
    }
    // checker
    return { type: 'checker', cellSize: params.cellSize, angle: params.angle }
  }

  /**
   * Extract background surface params from a SurfacePreset
   */
  const extractBackgroundSurfaceParams = (params: SurfacePresetParams): CustomBackgroundSurfaceParams => {
    if (params.type === 'solid') {
      return { type: 'solid' }
    }
    if (params.type === 'stripe') {
      return { type: 'stripe', width1: params.width1, width2: params.width2, angle: params.angle }
    }
    if (params.type === 'grid') {
      return { type: 'grid', lineWidth: params.lineWidth, cellSize: params.cellSize }
    }
    if (params.type === 'polkaDot') {
      return { type: 'polkaDot', dotRadius: params.dotRadius, spacing: params.spacing, rowOffset: params.rowOffset }
    }
    // checker
    return { type: 'checker', cellSize: params.cellSize, angle: params.angle }
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
    if (type === 'solid') return null // solid has no params
    return SurfaceSchemas[type] as ObjectSchema
  })

  const currentBackgroundSurfaceSchema = computed(() => {
    if (!customBackgroundSurfaceParams.value) return null
    const type = customBackgroundSurfaceParams.value.type
    if (type === 'solid') return null // solid has no params
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
      customMaskShapeParams.value = extractMaskShapeParams(pattern.maskConfig)
    }
  }

  const initSurfaceParamsFromPreset = () => {
    const idx = selectedMidgroundTextureIndex.value
    // gradientGrain is added after midgroundTexturePatterns, so check if idx is beyond length
    const gradientGrainIndex = midgroundTexturePatterns.length
    if (idx === gradientGrainIndex) {
      // GradientGrain selected - initialize with defaults
      const defaults: GradientGrainSurfaceParams = {
        depthMapType: 'linear' as const,
        angle: 90,
        centerX: 0.5,
        centerY: 0.5,
        radialStartAngle: 0,
        radialSweepAngle: 360,
        perlinScale: 4,
        perlinOctaves: 4,
        perlinContrast: 1,
        perlinOffset: 0,
        colorA: [0, 0, 0, 1],
        colorB: [1, 1, 1, 1],
        seed: Math.floor(Math.random() * 10000),
        sparsity: 0.75,
        curvePoints: [0, 1/36, 4/36, 9/36, 16/36, 25/36, 1],
      }
      customSurfaceParams.value = { type: 'gradientGrain', ...defaults }
      return
    }
    const preset = midgroundTexturePatterns[idx]
    if (preset) {
      customSurfaceParams.value = extractSurfaceParams(preset)
    }
  }

  const surfacePresets = getSurfacePresets()

  const initBackgroundSurfaceParamsFromPreset = () => {
    const idx = selectedBackgroundIndex.value
    // gradientGrain is added after texturePatterns, so check if idx is beyond texturePatterns length
    const gradientGrainIndex = texturePatterns.length
    if (idx === gradientGrainIndex) {
      // GradientGrain selected - initialize with defaults
      const defaults = {
        depthMapType: 'linear' as const,
        angle: 90,
        centerX: 0.5,
        centerY: 0.5,
        radialStartAngle: 0,
        radialSweepAngle: 360,
        perlinScale: 4,
        perlinOctaves: 4,
        perlinContrast: 1,
        perlinOffset: 0,
        colorA: textureColor1.value,
        colorB: textureColor2.value,
        seed: 12345,
        sparsity: 0.75,
        curvePoints: [0, 1/36, 4/36, 9/36, 16/36, 25/36, 1],
      }
      customBackgroundSurfaceParams.value = { type: 'gradientGrain', ...defaults }
      return
    }
    const preset = surfacePresets[idx]
    if (preset) {
      customBackgroundSurfaceParams.value = extractBackgroundSurfaceParams(preset.params)
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
   */
  const updateBackgroundSurfaceParams = (updates: Partial<StripeSurfaceParams | GridSurfaceParams | PolkaDotSurfaceParams | CheckerSurfaceParams>) => {
    if (!customBackgroundSurfaceParams.value || customBackgroundSurfaceParams.value.type === 'solid') return
    customBackgroundSurfaceParams.value = { ...customBackgroundSurfaceParams.value, ...updates } as CustomBackgroundSurfaceParams
  }

  // ============================================================
  // Per-Layer Filter State
  // ============================================================
  // 選択中のレイヤーのフィルター編集用
  const selectedFilterLayerId = ref<string | null>(LAYER_IDS.BASE)

  // レイヤーごとのフィルター設定を保持（syncSceneLayersで再生成されても維持）
  const layerFilterConfigs = ref<Map<string, LayerFilterConfig>>(new Map([
    [LAYER_IDS.BASE, createDefaultFilterConfig()],
    [LAYER_IDS.MASK, createDefaultFilterConfig()],
  ]))

  // 選択中レイヤーのフィルター設定へのアクセサ
  const selectedLayerFilters = computed(() => {
    const layerId = selectedFilterLayerId.value
    if (!layerId) return null
    return layerFilterConfigs.value.get(layerId) ?? null
  })

  // フィルター設定を更新（部分更新をサポート）
  type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
  }

  const updateLayerFilters = (layerId: string, updates: DeepPartial<LayerFilterConfig>) => {
    const current = layerFilterConfigs.value.get(layerId) ?? createDefaultFilterConfig()
    const updated: LayerFilterConfig = {
      vignette: { ...current.vignette, ...(updates.vignette ?? {}) },
      chromaticAberration: { ...current.chromaticAberration, ...(updates.chromaticAberration ?? {}) },
      dotHalftone: { ...current.dotHalftone, ...(updates.dotHalftone ?? {}) },
      lineHalftone: { ...current.lineHalftone, ...(updates.lineHalftone ?? {}) },
    }
    layerFilterConfigs.value.set(layerId, updated)

    // エディタ状態のレイヤーも更新
    editorState.value = {
      ...editorState.value,
      canvasLayers: editorState.value.canvasLayers.map(l =>
        l.id === layerId ? { ...l, filters: updated } : l
      ),
    }
  }

  // ============================================================
  // Filter Usecase Wrappers
  // Provides Usecase-pattern API for filter operations
  // ============================================================

  /**
   * Select filter type (exclusive selection)
   * Uses FilterUsecase pattern internally
   */
  const selectFilterType = (layerId: string, type: FilterType) => {
    updateLayerFilters(layerId, {
      vignette: { enabled: type === 'vignette' },
      chromaticAberration: { enabled: type === 'chromaticAberration' },
      dotHalftone: { enabled: type === 'dotHalftone' },
      lineHalftone: { enabled: type === 'lineHalftone' },
    })
  }

  /**
   * Get current filter type for a layer
   */
  const getFilterType = (layerId: string): FilterType => {
    const filters = layerFilterConfigs.value.get(layerId)
    if (!filters) return 'void'
    if (filters.vignette.enabled) return 'vignette'
    if (filters.chromaticAberration.enabled) return 'chromaticAberration'
    if (filters.dotHalftone.enabled) return 'dotHalftone'
    if (filters.lineHalftone.enabled) return 'lineHalftone'
    return 'void'
  }

  /**
   * Update vignette parameters
   */
  const updateVignetteParams = (layerId: string, params: Partial<{ intensity: number; radius: number; softness: number }>) => {
    updateLayerFilters(layerId, { vignette: params })
  }

  /**
   * Update chromatic aberration parameters
   */
  const updateChromaticAberrationParams = (layerId: string, params: Partial<{ intensity: number }>) => {
    updateLayerFilters(layerId, { chromaticAberration: params })
  }

  /**
   * Update dot halftone parameters
   */
  const updateDotHalftoneParams = (layerId: string, params: Partial<{ dotSize: number; spacing: number; angle: number }>) => {
    updateLayerFilters(layerId, { dotHalftone: params })
  }

  /**
   * Update line halftone parameters
   */
  const updateLineHalftoneParams = (layerId: string, params: Partial<{ lineWidth: number; spacing: number; angle: number }>) => {
    updateLayerFilters(layerId, { lineHalftone: params })
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

  /**
   * Create default layers (base + mask)
   * Called once during initialization
   */
  const createDefaultLayers = () => {
    const baseFilters = layerFilterConfigs.value.get(LAYER_IDS.BASE) ?? createDefaultFilterConfig()
    const maskFilters = layerFilterConfigs.value.get(LAYER_IDS.MASK) ?? createDefaultFilterConfig()

    const layers: EditorCanvasLayer[] = [
      {
        id: LAYER_IDS.BASE,
        name: 'Background Texture',
        visible: true,
        opacity: 1.0,
        zIndex: 0,
        blendMode: 'normal',
        filters: baseFilters,
        config: { type: 'texture', patternIndex: selectedBackgroundIndex.value },
      },
      {
        id: LAYER_IDS.MASK,
        name: 'Clip Group',
        visible: true,
        opacity: 1.0,
        zIndex: 1,
        blendMode: 'normal',
        filters: maskFilters,
        config: {
          type: 'clipGroup',
          maskShape: 'circle' as const,
          maskShapeParams: { type: 'circle' as const, centerX: 0.5, centerY: 0.5, radius: 0.3 },
          maskInvert: false,
          maskFeather: 0,
          maskTextureIndex: selectedMidgroundTextureIndex.value,
          childIds: [],
        },
      },
    ]

    editorState.value = {
      ...editorState.value,
      canvasLayers: layers,
    }
  }

  /**
   * Sync layer configs with current selection state
   * Updates existing layers' config without recreating them
   */
  const syncLayerConfigs = () => {
    const layers = editorState.value.canvasLayers

    for (const layer of layers) {
      // Update base layer config
      if (layer.id === LAYER_IDS.BASE) {
        if (customBackgroundBitmap) {
          layer.config = { type: 'image', source: customBackgroundBitmap }
          layer.name = 'Background Image'
        } else {
          layer.config = { type: 'texture', patternIndex: selectedBackgroundIndex.value }
          layer.name = 'Background Texture'
        }
        // Sync filters from layerFilterConfigs
        const filters = layerFilterConfigs.value.get(LAYER_IDS.BASE)
        if (filters) {
          layer.filters = filters
        }
      }

      // Update clip group layer configs
      if (layer.config.type === 'clipGroup') {
        const existingConfig = layer.config
        layer.config = {
          type: 'clipGroup',
          maskShape: existingConfig.maskShape,
          maskShapeParams: existingConfig.maskShapeParams,
          maskInvert: existingConfig.maskInvert,
          maskFeather: existingConfig.maskFeather,
          maskTextureIndex: customMaskBitmap ? null : selectedMidgroundTextureIndex.value,
          childIds: existingConfig.childIds,
        }
        // Sync filters from layerFilterConfigs
        const filters = layerFilterConfigs.value.get(LAYER_IDS.MASK)
        if (filters) {
          layer.filters = filters
        }
      }
    }

    // Trigger reactivity for layerFilterConfigs (Map needs explicit trigger)
    layerFilterConfigs.value = new Map(layerFilterConfigs.value)

    // Trigger reactivity
    editorState.value = { ...editorState.value }
  }

  // ============================================================
  // Layer Operations (public API)
  // ============================================================

  /**
   * Add a new clip group layer
   * TODO: In future, allow multiple clip groups
   * Returns null if a clip group layer already exists (current limitation)
   */
  const addMaskLayer = (): string | null => {
    // Check if clip group layer already exists (temporary limitation)
    const existingClipGroup = editorState.value.canvasLayers.find(
      l => l.config.type === 'clipGroup'
    )
    if (existingClipGroup) return null

    const id = `clipgroup-${Date.now()}`
    const newLayer: EditorCanvasLayer = {
      id,
      name: 'Clip Group',
      visible: true,
      opacity: 1.0,
      zIndex: editorState.value.canvasLayers.length,
      blendMode: 'normal',
      filters: createDefaultFilterConfig(),
      config: {
        type: 'clipGroup',
        maskShape: 'circle' as const,
        maskShapeParams: { type: 'circle' as const, centerX: 0.5, centerY: 0.5, radius: 0.3 },
        maskInvert: false,
        maskFeather: 0,
        maskTextureIndex: selectedMidgroundTextureIndex.value,
        childIds: [],
      },
    }

    // Register filter config for new layer
    layerFilterConfigs.value.set(id, createDefaultFilterConfig())

    editorState.value = {
      ...editorState.value,
      canvasLayers: [...editorState.value.canvasLayers, newLayer],
    }

    renderScene()
    return id
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
    const newLayer: EditorCanvasLayer = {
      id,
      name: options?.text?.slice(0, 20) || 'Text Layer',
      visible: true,
      opacity: 1.0,
      zIndex: editorState.value.canvasLayers.length,
      blendMode: 'normal',
      filters: createDefaultFilterConfig(),
      config: {
        type: 'text',
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
      },
    }

    // Register filter config for new layer
    layerFilterConfigs.value.set(id, createDefaultFilterConfig())

    editorState.value = {
      ...editorState.value,
      canvasLayers: [...editorState.value.canvasLayers, newLayer],
    }

    renderScene()
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
    const newLayer: EditorCanvasLayer = {
      id,
      name: 'Object Layer',
      visible: true,
      opacity: 1.0,
      zIndex: editorState.value.canvasLayers.length,
      blendMode: 'normal',
      filters: createDefaultFilterConfig(),
      config: {
        type: 'object',
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
      },
    }

    // Register filter config for new layer
    layerFilterConfigs.value.set(id, createDefaultFilterConfig())

    editorState.value = {
      ...editorState.value,
      canvasLayers: [...editorState.value.canvasLayers, newLayer],
    }

    renderScene()
    return id
  }

  /**
   * Remove a layer by ID (base layer cannot be removed)
   */
  const removeLayer = (id: string): boolean => {
    if (id === LAYER_IDS.BASE) return false

    const newLayers = editorState.value.canvasLayers.filter(l => l.id !== id)
    if (newLayers.length === editorState.value.canvasLayers.length) return false

    // Remove filter config
    layerFilterConfigs.value.delete(id)

    // Cleanup 3D object renderer if exists
    const renderer = object3DRenderers.get(id)
    if (renderer) {
      renderer.dispose()
      object3DRenderers.delete(id)
      loadedModelUrls.delete(id)
    }

    editorState.value = {
      ...editorState.value,
      canvasLayers: newLayers,
    }

    renderScene()
    return true
  }

  /**
   * Update layer visibility
   */
  const updateLayerVisibility = (id: string, visible: boolean) => {
    const layer = editorState.value.canvasLayers.find(l => l.id === id)
    if (!layer) return

    layer.visible = visible
    editorState.value = { ...editorState.value }
    renderScene()
  }

  /**
   * Toggle layer visibility
   */
  const toggleLayerVisibility = (id: string) => {
    const layer = editorState.value.canvasLayers.find(l => l.id === id)
    if (!layer) return

    layer.visible = !layer.visible
    editorState.value = { ...editorState.value }
    renderScene()
  }

  /**
   * Update text layer config and re-render
   * Uses TextLayerUsecase when repository is available
   */
  const updateTextLayerConfig = (id: string, updates: Partial<TextLayerConfig>) => {
    const layer = editorState.value.canvasLayers.find(l => l.id === id)
    if (!layer || layer.config.type !== 'text') return

    // Update the config properties (editorState)
    Object.assign(layer.config, updates)

    // Also update repository using TextLayerUsecases if available
    if (repository) {
      if (updates.text !== undefined) {
        updateTextLayerText(id, updates.text, repository)
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
        }, repository)
      }
      if (updates.color !== undefined) {
        updateTextLayerColor(id, updates.color, repository)
      }
      if (updates.position !== undefined) {
        updateTextLayerPosition(id, {
          x: updates.position.x,
          y: updates.position.y,
          anchor: updates.position.anchor as 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right',
        }, repository)
      }
      if (updates.rotation !== undefined) {
        updateTextLayerRotation(id, updates.rotation, repository)
      }
    }

    // Trigger reactivity and re-render
    editorState.value = { ...editorState.value }
    renderScene()
  }


  // ============================================================
  // Background Rendering Helpers
  // ============================================================

  /**
   * Create background texture spec from custom params
   */
  const createBackgroundSpecFromParams = (
    params: CustomBackgroundSurfaceParams,
    color1: RGBA,
    color2: RGBA,
    viewport: Viewport
  ): TextureRenderSpec | null => {
    if (params.type === 'solid') return null
    if (params.type === 'stripe') {
      return createStripeSpec({ color1, color2, width1: params.width1, width2: params.width2, angle: params.angle })
    }
    if (params.type === 'grid') {
      return createGridSpec({ lineColor: color1, bgColor: color2, lineWidth: params.lineWidth, cellSize: params.cellSize })
    }
    if (params.type === 'polkaDot') {
      return createPolkaDotSpec({ dotColor: color1, bgColor: color2, dotRadius: params.dotRadius, spacing: params.spacing, rowOffset: params.rowOffset })
    }
    if (params.type === 'checker') {
      return createCheckerSpec({ color1, color2, cellSize: params.cellSize, angle: params.angle })
    }
    if (params.type === 'gradientGrain') {
      return createGradientGrainSpec({
        depthMapType: params.depthMapType,
        angle: params.angle,
        centerX: params.centerX,
        centerY: params.centerY,
        radialStartAngle: params.radialStartAngle,
        radialSweepAngle: params.radialSweepAngle,
        perlinScale: params.perlinScale,
        perlinOctaves: params.perlinOctaves,
        perlinSeed: params.seed,
        perlinContrast: params.perlinContrast,
        perlinOffset: params.perlinOffset,
        colorA: color1,  // Use reactive color from palette
        colorB: color2,  // Use reactive color from palette
        seed: params.seed,
        sparsity: params.sparsity,
        curvePoints: params.curvePoints,
      }, viewport)
    }
    return null
  }

  // ============================================================
  // Rendering
  // ============================================================

  /**
   * Create masked texture spec using custom params if available, falling back to preset values
   */
  const createMaskedTextureSpec = (
    maskPattern: MaskPattern,
    preset: MidgroundSurfacePreset,
    color1: RGBA,
    color2: RGBA,
    viewport: Viewport,
    customShapeParams?: CustomMaskShapeParams | null,
    customSurfParams?: CustomSurfaceParams | null
  ): TextureRenderSpec | null => {
    // Build mask config from custom params or preset
    const buildMaskConfig = (): CircleMaskShapeConfig | RectMaskShapeConfig | BlobMaskShapeConfig | PerlinMaskShapeConfig => {
      if (customShapeParams) {
        if (customShapeParams.type === 'circle') {
          return { type: 'circle', centerX: customShapeParams.centerX, centerY: customShapeParams.centerY, radius: customShapeParams.radius, cutout: customShapeParams.cutout }
        }
        if (customShapeParams.type === 'rect') {
          return {
            type: 'rect',
            left: customShapeParams.left, right: customShapeParams.right,
            top: customShapeParams.top, bottom: customShapeParams.bottom,
            radiusTopLeft: customShapeParams.radiusTopLeft, radiusTopRight: customShapeParams.radiusTopRight,
            radiusBottomLeft: customShapeParams.radiusBottomLeft, radiusBottomRight: customShapeParams.radiusBottomRight,
            cutout: customShapeParams.cutout,
          }
        }
        if (customShapeParams.type === 'perlin') {
          return {
            type: 'perlin',
            seed: customShapeParams.seed, threshold: customShapeParams.threshold,
            scale: customShapeParams.scale, octaves: customShapeParams.octaves,
            cutout: customShapeParams.cutout,
          }
        }
        // blob
        return {
          type: 'blob',
          centerX: customShapeParams.centerX, centerY: customShapeParams.centerY,
          baseRadius: customShapeParams.baseRadius, amplitude: customShapeParams.amplitude,
          octaves: customShapeParams.octaves, seed: customShapeParams.seed,
          cutout: customShapeParams.cutout,
        }
      }
      // Fall back to maskPattern
      return maskPattern.maskConfig
    }

    // Build surface params from custom params or preset
    // Returns null for solid type (triggers fallback to solid mask)
    type SurfaceParams = StripePresetParams | GridPresetParams | PolkaDotPresetParams | CheckerPresetParams | { type: 'gradientGrain' } | null
    const buildSurfaceParams = (): SurfaceParams => {
      if (customSurfParams) {
        if (customSurfParams.type === 'solid') {
          return null
        }
        if (customSurfParams.type === 'stripe') {
          return { type: 'stripe', width1: customSurfParams.width1, width2: customSurfParams.width2, angle: customSurfParams.angle }
        }
        if (customSurfParams.type === 'grid') {
          return { type: 'grid', lineWidth: customSurfParams.lineWidth, cellSize: customSurfParams.cellSize }
        }
        if (customSurfParams.type === 'polkaDot') {
          return { type: 'polkaDot', dotRadius: customSurfParams.dotRadius, spacing: customSurfParams.spacing, rowOffset: customSurfParams.rowOffset }
        }
        if (customSurfParams.type === 'checker') {
          return { type: 'checker', cellSize: customSurfParams.cellSize, angle: customSurfParams.angle }
        }
        if (customSurfParams.type === 'gradientGrain') {
          return { type: 'gradientGrain' }
        }
        return null
      }
      // Fall back to preset - check for solid type
      if (preset.params.type === 'solid') {
        return null
      }
      return preset.params as StripePresetParams | GridPresetParams | PolkaDotPresetParams | CheckerPresetParams
    }

    // Build gradientGrain texture config from custom params
    const buildGradientGrainConfig = (): GradientGrainTextureConfig | null => {
      if (!customSurfParams || customSurfParams.type !== 'gradientGrain') return null
      return {
        depthMapType: customSurfParams.depthMapType as DepthMapType,
        angle: customSurfParams.angle,
        centerX: customSurfParams.centerX,
        centerY: customSurfParams.centerY,
        circularInvert: false,
        radialStartAngle: customSurfParams.radialStartAngle,
        radialSweepAngle: customSurfParams.radialSweepAngle,
        perlinScale: customSurfParams.perlinScale,
        perlinOctaves: customSurfParams.perlinOctaves,
        perlinSeed: customSurfParams.seed,
        perlinContrast: customSurfParams.perlinContrast,
        perlinOffset: customSurfParams.perlinOffset,
        seed: customSurfParams.seed,
        sparsity: customSurfParams.sparsity,
        curvePoints: customSurfParams.curvePoints,
      }
    }

    const maskConfig = buildMaskConfig()
    const params = buildSurfaceParams()

    // If solid type was selected, return null to trigger solid mask fallback
    if (params === null) {
      return null
    }

    if (maskConfig.type === 'circle') {
      const circleMask: CircleMaskShapeConfig = maskConfig
      if (params.type === 'stripe') {
        return createCircleStripeSpec(
          color1, color2,
          { type: 'circle', centerX: circleMask.centerX, centerY: circleMask.centerY, radius: circleMask.radius, cutout: circleMask.cutout },
          params,
          viewport
        )
      }
      if (params.type === 'grid') {
        return createCircleGridSpec(
          color1, color2,
          { type: 'circle', centerX: circleMask.centerX, centerY: circleMask.centerY, radius: circleMask.radius, cutout: circleMask.cutout },
          params,
          viewport
        )
      }
      if (params.type === 'polkaDot') {
        return createCirclePolkaDotSpec(
          color1, color2,
          { type: 'circle', centerX: circleMask.centerX, centerY: circleMask.centerY, radius: circleMask.radius, cutout: circleMask.cutout },
          params,
          viewport
        )
      }
      if (params.type === 'checker') {
        return createCircleCheckerSpec(
          color1, color2,
          { type: 'circle', centerX: circleMask.centerX, centerY: circleMask.centerY, radius: circleMask.radius, cutout: circleMask.cutout },
          params,
          viewport
        )
      }
      if (params.type === 'gradientGrain') {
        const ggConfig = buildGradientGrainConfig()
        if (ggConfig) {
          return createCircleGradientGrainSpec(
            color1, color2,
            { type: 'circle', centerX: circleMask.centerX, centerY: circleMask.centerY, radius: circleMask.radius, cutout: circleMask.cutout },
            ggConfig,
            viewport
          )
        }
      }
    }

    if (maskConfig.type === 'rect') {
      const rectMask: RectMaskShapeConfig = maskConfig
      if (params.type === 'stripe') {
        return createRectStripeSpec(
          color1, color2,
          { type: 'rect', left: rectMask.left, right: rectMask.right, top: rectMask.top, bottom: rectMask.bottom, radiusTopLeft: rectMask.radiusTopLeft, radiusTopRight: rectMask.radiusTopRight, radiusBottomLeft: rectMask.radiusBottomLeft, radiusBottomRight: rectMask.radiusBottomRight, cutout: rectMask.cutout },
          params,
          viewport
        )
      }
      if (params.type === 'grid') {
        return createRectGridSpec(
          color1, color2,
          { type: 'rect', left: rectMask.left, right: rectMask.right, top: rectMask.top, bottom: rectMask.bottom, radiusTopLeft: rectMask.radiusTopLeft, radiusTopRight: rectMask.radiusTopRight, radiusBottomLeft: rectMask.radiusBottomLeft, radiusBottomRight: rectMask.radiusBottomRight, cutout: rectMask.cutout },
          params,
          viewport
        )
      }
      if (params.type === 'polkaDot') {
        return createRectPolkaDotSpec(
          color1, color2,
          { type: 'rect', left: rectMask.left, right: rectMask.right, top: rectMask.top, bottom: rectMask.bottom, radiusTopLeft: rectMask.radiusTopLeft, radiusTopRight: rectMask.radiusTopRight, radiusBottomLeft: rectMask.radiusBottomLeft, radiusBottomRight: rectMask.radiusBottomRight, cutout: rectMask.cutout },
          params,
          viewport
        )
      }
      if (params.type === 'checker') {
        return createRectCheckerSpec(
          color1, color2,
          { type: 'rect', left: rectMask.left, right: rectMask.right, top: rectMask.top, bottom: rectMask.bottom, radiusTopLeft: rectMask.radiusTopLeft, radiusTopRight: rectMask.radiusTopRight, radiusBottomLeft: rectMask.radiusBottomLeft, radiusBottomRight: rectMask.radiusBottomRight, cutout: rectMask.cutout },
          params,
          viewport
        )
      }
      if (params.type === 'gradientGrain') {
        const ggConfig = buildGradientGrainConfig()
        if (ggConfig) {
          return createRectGradientGrainSpec(
            color1, color2,
            { type: 'rect', left: rectMask.left, right: rectMask.right, top: rectMask.top, bottom: rectMask.bottom, radiusTopLeft: rectMask.radiusTopLeft, radiusTopRight: rectMask.radiusTopRight, radiusBottomLeft: rectMask.radiusBottomLeft, radiusBottomRight: rectMask.radiusBottomRight, cutout: rectMask.cutout },
            ggConfig,
            viewport
          )
        }
      }
    }

    if (maskConfig.type === 'blob') {
      const blobMask: BlobMaskShapeConfig = maskConfig
      if (params.type === 'stripe') {
        return createBlobStripeSpec(
          color1, color2,
          { type: 'blob', centerX: blobMask.centerX, centerY: blobMask.centerY, baseRadius: blobMask.baseRadius, amplitude: blobMask.amplitude, octaves: blobMask.octaves, seed: blobMask.seed, cutout: blobMask.cutout },
          params,
          viewport
        )
      }
      if (params.type === 'grid') {
        return createBlobGridSpec(
          color1, color2,
          { type: 'blob', centerX: blobMask.centerX, centerY: blobMask.centerY, baseRadius: blobMask.baseRadius, amplitude: blobMask.amplitude, octaves: blobMask.octaves, seed: blobMask.seed, cutout: blobMask.cutout },
          params,
          viewport
        )
      }
      if (params.type === 'polkaDot') {
        return createBlobPolkaDotSpec(
          color1, color2,
          { type: 'blob', centerX: blobMask.centerX, centerY: blobMask.centerY, baseRadius: blobMask.baseRadius, amplitude: blobMask.amplitude, octaves: blobMask.octaves, seed: blobMask.seed, cutout: blobMask.cutout },
          params,
          viewport
        )
      }
      if (params.type === 'checker') {
        return createBlobCheckerSpec(
          color1, color2,
          { type: 'blob', centerX: blobMask.centerX, centerY: blobMask.centerY, baseRadius: blobMask.baseRadius, amplitude: blobMask.amplitude, octaves: blobMask.octaves, seed: blobMask.seed, cutout: blobMask.cutout },
          params,
          viewport
        )
      }
      if (params.type === 'gradientGrain') {
        const ggConfig = buildGradientGrainConfig()
        if (ggConfig) {
          return createBlobGradientGrainSpec(
            color1, color2,
            { type: 'blob', centerX: blobMask.centerX, centerY: blobMask.centerY, baseRadius: blobMask.baseRadius, amplitude: blobMask.amplitude, octaves: blobMask.octaves, seed: blobMask.seed, cutout: blobMask.cutout },
            ggConfig,
            viewport
          )
        }
      }
    }

    if (maskConfig.type === 'perlin') {
      const perlinMask: PerlinMaskShapeConfig = maskConfig
      if (params.type === 'stripe') {
        return createPerlinStripeSpec(
          color1, color2,
          { type: 'perlin', seed: perlinMask.seed, threshold: perlinMask.threshold, scale: perlinMask.scale, octaves: perlinMask.octaves, cutout: perlinMask.cutout },
          params,
          viewport
        )
      }
      if (params.type === 'grid') {
        return createPerlinGridSpec(
          color1, color2,
          { type: 'perlin', seed: perlinMask.seed, threshold: perlinMask.threshold, scale: perlinMask.scale, octaves: perlinMask.octaves, cutout: perlinMask.cutout },
          params,
          viewport
        )
      }
      if (params.type === 'polkaDot') {
        return createPerlinPolkaDotSpec(
          color1, color2,
          { type: 'perlin', seed: perlinMask.seed, threshold: perlinMask.threshold, scale: perlinMask.scale, octaves: perlinMask.octaves, cutout: perlinMask.cutout },
          params,
          viewport
        )
      }
      if (params.type === 'checker') {
        return createPerlinCheckerSpec(
          color1, color2,
          { type: 'perlin', seed: perlinMask.seed, threshold: perlinMask.threshold, scale: perlinMask.scale, octaves: perlinMask.octaves, cutout: perlinMask.cutout },
          params,
          viewport
        )
      }
      // Note: gradientGrain with perlin mask is not supported yet
    }

    return null
  }

  /**
   * Apply filters to current canvas content for a layer
   */
  const applyLayerFilters = (layer: EditorCanvasLayer, viewport: Viewport) => {
    if (!previewRenderer) return

    const { filters } = layer

    // Dot Halftone (requires texture input, applied first)
    if (filters.dotHalftone.enabled) {
      const inputTexture = previewRenderer.copyCanvasToTexture()
      const uniforms = createDotHalftoneUniforms(
        {
          dotSize: filters.dotHalftone.dotSize,
          spacing: filters.dotHalftone.spacing,
          angle: filters.dotHalftone.angle,
        },
        viewport
      )
      previewRenderer.applyPostEffect(
        { shader: dotHalftoneShader, uniforms, bufferSize: DOT_HALFTONE_BUFFER_SIZE },
        inputTexture,
        { clear: true }
      )
    }

    // Line Halftone (requires texture input)
    if (filters.lineHalftone.enabled) {
      const inputTexture = previewRenderer.copyCanvasToTexture()
      const uniforms = createLineHalftoneUniforms(
        {
          lineWidth: filters.lineHalftone.lineWidth,
          spacing: filters.lineHalftone.spacing,
          angle: filters.lineHalftone.angle,
        },
        viewport
      )
      previewRenderer.applyPostEffect(
        { shader: lineHalftoneShader, uniforms, bufferSize: LINE_HALFTONE_BUFFER_SIZE },
        inputTexture,
        { clear: true }
      )
    }

    // Chromatic Aberration (requires texture input)
    if (filters.chromaticAberration.enabled) {
      const inputTexture = previewRenderer.copyCanvasToTexture()
      const uniforms = createChromaticAberrationUniforms(
        { intensity: filters.chromaticAberration.intensity, angle: 0 },
        viewport
      )
      previewRenderer.applyPostEffect(
        { shader: chromaticAberrationShader, uniforms, bufferSize: CHROMATIC_ABERRATION_BUFFER_SIZE },
        inputTexture,
        { clear: true }
      )
    }

    // Vignette (overlay, applied last)
    if (filters.vignette.enabled) {
      const vignetteSpec = createVignetteSpec(
        {
          color: [0, 0, 0, 1],
          intensity: filters.vignette.intensity,
          radius: filters.vignette.radius,
          softness: filters.vignette.softness,
        },
        viewport
      )
      previewRenderer.render(vignetteSpec, { clear: false })
    }
  }

  /**
   * Render editor state based on current layer configuration
   * Each layer's filters are applied after that layer is rendered
   */
  const renderScene = async () => {
    if (!previewRenderer) return

    const viewport = previewRenderer.getViewport()

    // Sort layers by zIndex and filter visible ones
    const sortedLayers = [...editorState.value.canvasLayers]
      .filter(l => l.visible)
      .sort((a, b) => a.zIndex - b.zIndex)

    let isFirstVisible = true
    for (const layer of sortedLayers) {

      const isFirst = isFirstVisible
      isFirstVisible = false

      switch (layer.config.type) {
        case 'image':
          if (customBackgroundBitmap) {
            await previewRenderer.renderImage(customBackgroundBitmap)
          }
          break

        case 'texture': {
          // Use custom background surface params if available
          const customBgParams = customBackgroundSurfaceParams.value
          if (customBgParams) {
            if (customBgParams.type === 'solid') {
              // Solid fill with primary color
              const spec = createSolidSpec({ color: textureColor1.value })
              previewRenderer.render(spec, { clear: isFirst })
              break
            }
            const spec = createBackgroundSpecFromParams(customBgParams, textureColor1.value, textureColor2.value, viewport)
            if (spec) {
              previewRenderer.render(spec, { clear: isFirst })
              break
            }
          }
          // Fallback to preset
          const bgPattern = texturePatterns[layer.config.patternIndex]
          if (bgPattern) {
            const spec = bgPattern.createSpec(textureColor1.value, textureColor2.value, viewport)
            previewRenderer.render(spec, { clear: isFirst })
          }
          break
        }

        case 'clipGroup': {
          // ClipGroup rendering: use layer's mask config
          const layerMaskShape = layer.config.maskShape
          const layerMaskShapeParams = layer.config.maskShapeParams
          const maskInvert = layer.config.maskInvert
          const maskFeather = layer.config.maskFeather

          // Use selectedMaskIndex to get the mask pattern for fallback rendering
          const maskPattern = maskPatterns[selectedMaskIndex.value ?? 0]

          // Helper to create clip mask spec from layer's maskShapeParams
          const createClipSpec = (): TextureRenderSpec | null => {
            // Use customMaskShapeParams if available, otherwise use layer config
            const shapeParams = customMaskShapeParams.value ?? layerMaskShapeParams
            if (!shapeParams) return null

            const feather = maskFeather ?? 0
            // Use cutout from shapeParams (pattern preset), fallback to maskInvert (layer config)
            // cutout === invert: true = show outside, false = show inside
            const invert = 'cutout' in shapeParams ? (shapeParams.cutout ?? false) : maskInvert

            if (shapeParams.type === 'circle') {
              return createCircleClipSpec(
                {
                  type: 'circle',
                  centerX: shapeParams.centerX,
                  centerY: shapeParams.centerY,
                  radius: shapeParams.radius,
                  invert,
                  feather,
                },
                viewport
              )
            }
            if (shapeParams.type === 'rect') {
              // Check if using old format (from customMaskShapeParams) or new format (from layer config)
              if ('left' in shapeParams) {
                // Old format: convert to center-based format
                const centerX = (shapeParams.left + shapeParams.right) / 2
                const centerY = (shapeParams.top + shapeParams.bottom) / 2
                const width = shapeParams.right - shapeParams.left
                const height = shapeParams.bottom - shapeParams.top
                return createRectClipSpec(
                  {
                    type: 'rect',
                    centerX,
                    centerY,
                    width,
                    height,
                    cornerRadius: [
                      shapeParams.radiusTopLeft,
                      shapeParams.radiusTopRight,
                      shapeParams.radiusBottomRight,
                      shapeParams.radiusBottomLeft,
                    ],
                    invert,
                    feather,
                  },
                  viewport
                )
              } else {
                // New format with centerX/centerY/width/height
                return createRectClipSpec(
                  {
                    type: 'rect',
                    centerX: shapeParams.centerX,
                    centerY: shapeParams.centerY,
                    width: shapeParams.width,
                    height: shapeParams.height,
                    cornerRadius: shapeParams.cornerRadius,
                    invert,
                    feather,
                  },
                  viewport
                )
              }
            }
            if (shapeParams.type === 'blob') {
              return createBlobClipSpec(
                {
                  type: 'blob',
                  centerX: shapeParams.centerX,
                  centerY: shapeParams.centerY,
                  baseRadius: shapeParams.baseRadius,
                  amplitude: shapeParams.amplitude,
                  octaves: shapeParams.octaves,
                  seed: shapeParams.seed,
                  invert,
                  feather,
                },
                viewport
              )
            }
            if (shapeParams.type === 'perlin') {
              return createPerlinClipSpec(
                {
                  type: 'perlin',
                  seed: shapeParams.seed,
                  threshold: shapeParams.threshold,
                  scale: shapeParams.scale,
                  octaves: shapeParams.octaves,
                  invert,
                  feather,
                },
                viewport
              )
            }
            return null
          }

          // Helper to create mask overlay spec (for fallback/solid fill rendering)
          const createMaskOverlaySpec = (): TextureRenderSpec | null => {
            const shapeParams = customMaskShapeParams.value ?? {
              ...layerMaskShapeParams,
              cutout: maskInvert,
            }
            if (!shapeParams) return null

            // cutout === maskInvert: true = show outside (cutout), false = show inside (solid)
            const cutout = 'cutout' in shapeParams ? (shapeParams.cutout ?? false) : maskInvert
            const solidInnerColor = cutout ? maskInnerColor.value : midgroundTextureColor1.value
            const solidOuterColor = cutout ? midgroundTextureColor1.value : maskInnerColor.value

            if (shapeParams.type === 'circle') {
              return createCircleMaskSpec(
                {
                  centerX: shapeParams.centerX,
                  centerY: shapeParams.centerY,
                  radius: shapeParams.radius,
                  innerColor: solidInnerColor,
                  outerColor: solidOuterColor,
                  cutout,
                },
                viewport
              )
            }
            if (shapeParams.type === 'rect') {
              if ('left' in shapeParams) {
                return createRectMaskSpec(
                  {
                    left: shapeParams.left,
                    right: shapeParams.right,
                    top: shapeParams.top,
                    bottom: shapeParams.bottom,
                    radiusTopLeft: shapeParams.radiusTopLeft,
                    radiusTopRight: shapeParams.radiusTopRight,
                    radiusBottomLeft: shapeParams.radiusBottomLeft,
                    radiusBottomRight: shapeParams.radiusBottomRight,
                    innerColor: solidInnerColor,
                    outerColor: solidOuterColor,
                    cutout,
                  },
                  viewport
                )
              } else {
                const halfWidth = shapeParams.width / 2
                const halfHeight = shapeParams.height / 2
                const cornerRadius = shapeParams.cornerRadius
                return createRectMaskSpec(
                  {
                    left: shapeParams.centerX - halfWidth,
                    right: shapeParams.centerX + halfWidth,
                    top: shapeParams.centerY - halfHeight,
                    bottom: shapeParams.centerY + halfHeight,
                    radiusTopLeft: cornerRadius[0],
                    radiusTopRight: cornerRadius[1],
                    radiusBottomLeft: cornerRadius[3],
                    radiusBottomRight: cornerRadius[2],
                    innerColor: solidInnerColor,
                    outerColor: solidOuterColor,
                    cutout,
                  },
                  viewport
                )
              }
            }
            if (shapeParams.type === 'blob') {
              return createBlobMaskSpec(
                {
                  centerX: shapeParams.centerX,
                  centerY: shapeParams.centerY,
                  baseRadius: shapeParams.baseRadius,
                  amplitude: shapeParams.amplitude,
                  frequency: 0,
                  octaves: shapeParams.octaves,
                  seed: shapeParams.seed,
                  innerColor: solidInnerColor,
                  outerColor: solidOuterColor,
                  cutout,
                },
                viewport
              )
            }
            if (shapeParams.type === 'perlin') {
              return createPerlinMaskSpec(
                {
                  seed: shapeParams.seed,
                  threshold: shapeParams.threshold,
                  scale: shapeParams.scale,
                  octaves: shapeParams.octaves,
                  innerColor: solidInnerColor,
                  outerColor: solidOuterColor,
                  cutout,
                },
                viewport
              )
            }
            return null
          }

          if (maskPattern || layerMaskShape) {
            // ClipGroup rendering pipeline:
            // 1. Render content (texture pattern or child layers) to offscreen
            // 2. Apply clip mask shader
            // 3. Composite to main canvas

            const textureIndex = layer.config.maskTextureIndex
            const texturePattern = textureIndex !== null ? midgroundTexturePatterns[textureIndex] : undefined
            const hasTexture = texturePattern !== undefined || customSurfaceParams.value?.type === 'gradientGrain'

            // Try to use new clip mask pipeline
            const clipSpec = createClipSpec()

            // Helper to create pure texture spec (no mask) for offscreen rendering
            const createPureTextureSpec = (): TextureRenderSpec | null => {
              const params = customSurfaceParams.value ?? texturePattern?.params
              if (!params) return null

              // RGBA is a tuple [r, g, b, a]
              const color1 = midgroundTextureColor1.value
              const color2 = midgroundTextureColor2.value

              if (params.type === 'stripe') {
                return createStripeSpec({
                  color1,
                  color2,
                  width1: params.width1,
                  width2: params.width2,
                  angle: params.angle,
                })
              }
              if (params.type === 'grid') {
                return createGridSpec({
                  lineColor: color1,
                  bgColor: color2,
                  lineWidth: params.lineWidth,
                  cellSize: params.cellSize,
                })
              }
              if (params.type === 'polkaDot') {
                return createPolkaDotSpec({
                  dotColor: color1,
                  bgColor: color2,
                  dotRadius: params.dotRadius,
                  spacing: params.spacing,
                  rowOffset: params.rowOffset,
                })
              }
              if (params.type === 'checker') {
                return createCheckerSpec({
                  color1,
                  color2,
                  cellSize: params.cellSize,
                  angle: params.angle,
                })
              }
              // Solid type - use solid spec
              if (params.type === 'solid') {
                return createSolidSpec({
                  color: color1,
                })
              }
              return null
            }

            // Handle custom mask image (customMaskBitmap)
            if (customMaskBitmap && clipSpec) {
              // Render custom image to offscreen, then apply clip mask
              const offscreenTexture = await previewRenderer.renderImageToOffscreen(customMaskBitmap, 0)
              previewRenderer.applyClipMask(clipSpec, offscreenTexture, { clear: false })
              break
            }

            if (hasTexture && clipSpec) {
              // New approach: Render texture to offscreen, then apply clip mask
              const textureSpec = createPureTextureSpec()
              if (textureSpec) {
                // Render texture to offscreen buffer
                const offscreenTexture = previewRenderer.renderToOffscreen(textureSpec, 0)
                // Apply clip mask and render to main canvas
                previewRenderer.applyClipMask(clipSpec, offscreenTexture, { clear: false })
                break
              }
            }

            if (hasTexture && maskPattern) {
              // Fallback: use old maskedTexture approach for textured content
              const preset = texturePattern ?? midgroundTexturePatterns[0]
              if (preset) {
                const spec = createMaskedTextureSpec(
                  maskPattern,
                  preset,
                  midgroundTextureColor1.value,
                  midgroundTextureColor2.value,
                  viewport,
                  customMaskShapeParams.value,
                  customSurfaceParams.value
                )
                if (spec) {
                  previewRenderer.render(spec, { clear: false })
                  break
                }
              }
            }

            // Fallback to solid color mask with new clip parameters
            const maskSpec = createMaskOverlaySpec()
            if (maskSpec) {
              previewRenderer.render(maskSpec, { clear: false })
            } else if (maskPattern) {
              const spec = maskPattern.createSpec(maskInnerColor.value, maskOuterColor.value, viewport)
              previewRenderer.render(spec, { clear: false })
            }
          }
          break
        }

        case 'text': {
          const config = layer.config
          // Render text to ImageBitmap using Canvas 2D
          const textResult = await renderTextToBitmap({
            text: config.text,
            fontFamily: config.fontFamily,
            fontSize: config.fontSize,
            fontWeight: config.fontWeight,
            letterSpacing: config.letterSpacing,
            lineHeight: config.lineHeight,
            color: config.color,
          })

          // Convert anchor string to numeric values
          const anchor = anchorToNumbers(config.position.anchor)

          // Render the text bitmap at the specified position
          await previewRenderer.renderPositionedImage(
            textResult.bitmap,
            {
              x: config.position.x,
              y: config.position.y,
              anchorX: anchor.x,
              anchorY: anchor.y,
              rotation: config.rotation,
              opacity: layer.opacity,
            },
            { clear: false }
          )

          // Clean up the bitmap
          textResult.bitmap.close()
          break
        }

        case 'object': {
          const config = layer.config
          if (!config.modelUrl) break

          // Get or create renderer for this layer
          let renderer = object3DRenderers.get(layer.id)
          if (!renderer) {
            renderer = createObject3DRenderer()
            object3DRenderers.set(layer.id, renderer)
          }

          // Load model if URL changed
          const currentUrl = loadedModelUrls.get(layer.id)
          if (currentUrl !== config.modelUrl) {
            try {
              await renderer.loadModel(config.modelUrl)
              loadedModelUrls.set(layer.id, config.modelUrl)
            } catch (error) {
              console.error(`Failed to load 3D model: ${config.modelUrl}`, error)
              break
            }
          }

          // Render 3D object to ImageBitmap
          try {
            const bitmap = await renderer.renderFrame({
              width: viewport.width,
              height: viewport.height,
              cameraPosition: { x: 0, y: 0, z: 5 },
              modelTransform: {
                position: config.position,
                rotation: config.rotation,
                scale: config.scale,
              },
              materialOverrides: config.materialOverrides,
            })

            // Render the 3D bitmap to canvas (centered)
            await previewRenderer.renderPositionedImage(
              bitmap,
              {
                x: 0.5,
                y: 0.5,
                anchorX: 0.5,
                anchorY: 0.5,
                rotation: 0,
                opacity: layer.opacity,
              },
              { clear: false }
            )

            bitmap.close()
          } catch (error) {
            console.error('Failed to render 3D object', error)
          }
          break
        }
      }

      // Apply per-layer filters after rendering the layer
      applyLayerFilters(layer, viewport)
    }

    // Update cached ImageData for contrast analysis
    try {
      canvasImageData.value = await previewRenderer.readPixels()
    } catch {
      // Ignore errors (e.g., if canvas is not ready)
    }
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

    if (params.type === 'solid') {
      return createSolidSpec({ color: color1 })
    }
    if (params.type === 'stripe') {
      return createStripeSpec({
        color1,
        color2,
        width1: params.width1,
        width2: params.width2,
        angle: params.angle,
      })
    }
    if (params.type === 'grid') {
      return createGridSpec({
        lineColor: color1,
        bgColor: color2,
        lineWidth: params.lineWidth,
        cellSize: params.cellSize,
      })
    }
    if (params.type === 'polkaDot') {
      return createPolkaDotSpec({
        dotColor: color1,
        bgColor: color2,
        dotRadius: params.dotRadius,
        spacing: params.spacing,
        rowOffset: params.rowOffset,
      })
    }
    if (params.type === 'checker') {
      return createCheckerSpec({
        color1,
        color2,
        cellSize: params.cellSize,
        angle: params.angle,
      })
    }
    return null
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

    // Handle clip-group-surface section separately
    if (section === 'clip-group-surface') {
      for (let i = 0; i < thumbnailRenderers.length; i++) {
        const renderer = thumbnailRenderers[i]
        const pattern = midgroundTexturePatterns[i]
        if (renderer && pattern) {
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

      // Create default layers only if none exist
      if (editorState.value.canvasLayers.length === 0) {
        createDefaultLayers()
      }

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

      await renderScene()
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
    if (customBackgroundImage.value) {
      URL.revokeObjectURL(customBackgroundImage.value)
    }
    if (customBackgroundBitmap) {
      customBackgroundBitmap.close()
      customBackgroundBitmap = null
    }

    customBackgroundFile.value = file
    customBackgroundImage.value = URL.createObjectURL(file)
    customBackgroundBitmap = await createImageBitmap(file)

    syncLayerConfigs()
    await renderScene()
  }

  const clearBackgroundImage = () => {
    if (customBackgroundImage.value) {
      URL.revokeObjectURL(customBackgroundImage.value)
    }
    if (customBackgroundBitmap) {
      customBackgroundBitmap.close()
      customBackgroundBitmap = null
    }
    customBackgroundFile.value = null
    customBackgroundImage.value = null

    syncLayerConfigs()
    renderScene()
  }

  const isLoadingRandomBackground = ref(false)

  const loadRandomBackgroundImage = async (query?: string) => {
    isLoadingRandomBackground.value = true
    try {
      const url = await fetchUnsplashPhotoUrl({ query })
      const response = await fetch(url)
      const blob = await response.blob()
      const file = new File([blob], `unsplash-${Date.now()}.jpg`, { type: 'image/jpeg' })
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
    await renderScene()
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
    renderScene()
  }

  const isLoadingRandomMask = ref(false)

  const loadRandomMaskImage = async (query?: string) => {
    isLoadingRandomMask.value = true
    try {
      const url = await fetchUnsplashPhotoUrl({ query })
      const response = await fetch(url)
      const blob = await response.blob()
      const file = new File([blob], `unsplash-${Date.now()}.jpg`, { type: 'image/jpeg' })
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
  // to ensure customParams are updated before syncLayerConfigs/renderScene run
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
      renderScene()
    }
  )

  watch(
    [textureColor1, textureColor2, maskInnerColor, maskOuterColor, midgroundTextureColor1, midgroundTextureColor2],
    () => {
      renderScene()
    }
  )

  watch([textureColor1, textureColor2], renderThumbnails)

  // Filter watchers - watch the Map's changes via deep watch
  watch(
    layerFilterConfigs,
    () => renderScene(),
    { deep: true }
  )

  // Custom params watchers - re-render when params change
  watch(
    customMaskShapeParams,
    () => renderScene(),
    { deep: true }
  )

  watch(
    customSurfaceParams,
    () => renderScene(),
    { deep: true }
  )

  watch(
    customBackgroundSurfaceParams,
    () => renderScene(),
    { deep: true }
  )

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
      processors: [
        {
          type: 'effect',
          enabled: true,
          config: baseFilters,
        } as EffectProcessorConfig,
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
        processors: [
          {
            type: 'effect',
            enabled: true,
            config: maskFilters,
          } as EffectProcessorConfig,
          {
            type: 'mask',
            enabled: true,
            shape: maskShape,
            invert: false,
            feather: 0,
          } as MaskProcessorConfig,
        ],
      }
      layers.push(surfaceLayer)
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
      if (bgSurface.type === 'solid') {
        customBackgroundSurfaceParams.value = { type: 'solid' }
      } else if (bgSurface.type === 'stripe') {
        customBackgroundSurfaceParams.value = { type: 'stripe', width1: bgSurface.width1, width2: bgSurface.width2, angle: bgSurface.angle }
      } else if (bgSurface.type === 'grid') {
        customBackgroundSurfaceParams.value = { type: 'grid', lineWidth: bgSurface.lineWidth, cellSize: bgSurface.cellSize }
      } else if (bgSurface.type === 'polkaDot') {
        customBackgroundSurfaceParams.value = { type: 'polkaDot', dotRadius: bgSurface.dotRadius, spacing: bgSurface.spacing, rowOffset: bgSurface.rowOffset }
      } else if (bgSurface.type === 'checker') {
        customBackgroundSurfaceParams.value = { type: 'checker', cellSize: bgSurface.cellSize, angle: bgSurface.angle }
      } else if (bgSurface.type === 'image') {
        // Restore background image from imageId (URL)
        await restoreBackgroundImage(bgSurface.imageId)
      }

      // Reverse-lookup background surface preset index
      const bgPresetIndex = findSurfacePresetIndex(bgSurface, surfacePresets)
      selectedBackgroundIndex.value = bgPresetIndex ?? 0

      // Background filters (from effect processor)
      const effectProcessor = baseLayer.processors.find((p): p is EffectProcessorConfig => p.type === 'effect')
      if (effectProcessor) {
        layerFilterConfigs.value.set(LAYER_IDS.BASE, effectProcessor.config)
      }
    }

    // Surface layer with mask
    if (surfaceLayer) {
      // Find mask processor
      const maskProcessor = surfaceLayer.processors.find((p): p is MaskProcessorConfig => p.type === 'mask')

      if (maskProcessor) {
        // Mask shape
        const shape = maskProcessor.shape
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

      // Mask surface
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

      // Mask filters (from effect processor)
      const effectProcessor = surfaceLayer.processors.find((p): p is EffectProcessorConfig => p.type === 'effect')
      if (effectProcessor) {
        layerFilterConfigs.value.set(LAYER_IDS.MASK, effectProcessor.config)
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
    await renderScene()

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
      await fromHeroViewConfig(preset.config)
      return preset.colorPreset ?? null
    }
    return null
  }

  // ============================================================
  // Repository Integration
  // ============================================================

  // Track repository subscription for cleanup
  let repositoryUnsubscribe: (() => void) | null = null

  // Subscribe to repository changes (if provided)
  if (repository) {
    repositoryUnsubscribe = repository.subscribe(async (config: HeroViewConfig) => {
      // Skip if we're the ones who triggered the update
      if (isLoadingFromConfig) return
      // Load external changes
      await fromHeroViewConfig(config)
    })
  }

  // Cleanup repository subscription on unmount
  onUnmounted(() => {
    if (repositoryUnsubscribe) {
      repositoryUnsubscribe()
      repositoryUnsubscribe = null
    }
  })

  // ============================================================
  // Public API
  // ============================================================

  return {
    // Editor State (for debugging/inspection)
    editorState,

    // Pattern data
    texturePatterns,
    maskPatterns,
    midgroundTexturePatterns,

    // Colors for thumbnail rendering
    textureColor1,
    textureColor2,
    midgroundTextureColor1,
    midgroundTextureColor2,
    maskInnerColor,
    maskOuterColor,

    // Spec creators for thumbnails
    createMidgroundThumbnailSpec,
    createBackgroundThumbnailSpec: (viewport: { width: number; height: number }) => {
      const bgPattern = texturePatterns[selectedBackgroundIndex.value]
      if (bgPattern) {
        return bgPattern.createSpec(textureColor1.value, textureColor2.value, viewport)
      }
      return null
    },

    // Selection state
    selectedBackgroundIndex,
    selectedMaskIndex,
    selectedMidgroundTextureIndex,
    activeSection,

    // Semantic context for mask layer (for future UI switching)
    maskSemanticContext,

    // PrimitiveKey-based color selection
    backgroundColorKey1,
    backgroundColorKey2,
    maskColorKey1,
    maskColorKey2,

    // Ink color helpers (for text on surfaces)
    getInkColorForSurface,
    getInkRgbaForSurface,

    // Custom background
    customBackgroundImage,
    customBackgroundFile,
    setBackgroundImage,
    clearBackgroundImage,
    loadRandomBackgroundImage,
    isLoadingRandomBackground,

    // Custom mask
    customMaskImage,
    customMaskFile,
    setMaskImage,
    clearMaskImage,
    loadRandomMaskImage,
    isLoadingRandomMask,

    // Per-layer filters
    selectedFilterLayerId,
    selectedLayerFilters,
    layerFilterConfigs,
    updateLayerFilters,
    // Filter Usecase API
    selectFilterType,
    getFilterType,
    updateVignetteParams,
    updateChromaticAberrationParams,
    updateDotHalftoneParams,
    updateLineHalftoneParams,

    // Custom shape/surface params
    customMaskShapeParams,
    customSurfaceParams,
    customBackgroundSurfaceParams,
    currentMaskShapeSchema,
    currentSurfaceSchema,
    currentBackgroundSurfaceSchema,
    updateMaskShapeParams,
    updateSurfaceParams,
    updateBackgroundSurfaceParams,

    // Layer operations
    addMaskLayer,
    addTextLayer,
    addObjectLayer,
    removeLayer,
    updateLayerVisibility,
    toggleLayerVisibility,
    updateTextLayerConfig,

    // Actions
    openSection,
    initPreview,
    destroyPreview,

    // Foreground (HTML layer)
    foregroundConfig,
    foregroundTitleColor,
    foregroundBodyColor,
    foregroundElementColors,
    foregroundTitleAutoKey,
    foregroundBodyAutoKey,

    // Canvas ImageData for contrast analysis
    canvasImageData,
    setElementBounds,

    // Serialization & Repository
    toHeroViewConfig,
    fromHeroViewConfig,
    saveToRepository,

    // Presets
    presets,
    selectedPresetId,
    loadPresets,
    applyPreset,

    // Usecases (for future migration)
    heroViewRepository,
    maskUsecase,
  }
}
