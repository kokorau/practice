/**
 * useHeroScene
 *
 * HeroSceneモジュールをVueのリアクティブシステムと連携するcomposable
 * 現在は2レイヤー固定（base, mask）
 */

import { ref, computed, watch, nextTick, onUnmounted, type ComputedRef, type Ref } from 'vue'
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
  type StripeSurfaceParams,
  type GridSurfaceParams,
  type PolkaDotSurfaceParams,
  type CheckerSurfaceParams,
  type DepthMapType,
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
import type { PrimitivePalette, ContextName, PrimitiveKey } from '../../modules/SemanticColorPalette/Domain'
import { selectInkForSurface, type InkRole } from '../../modules/SemanticColorPalette/Infra'
import { fetchUnsplashPhotoUrl } from '../../modules/PhotoUnsplash/Infra/fetchUnsplashPhoto'
import {
  type LayerFilterConfig,
  type HeroSceneEditorState,
  type EditorCanvasLayer,
  type HeroViewConfig,
  type HeroColorsConfig,
  type HeroPrimitiveKey,
  type HeroContextName,
  type BackgroundLayerConfig,
  type MaskLayerConfig,
  type BackgroundSurfaceConfig,
  type MaskSurfaceConfig,
  type HeroMaskShapeConfig,
  type ForegroundLayerConfig,
  type HeroViewPreset,
  createHeroSceneEditorState,
  createDefaultFilterConfig,
  createDefaultForegroundConfig,
  createDefaultColorsConfig,
  createGetHeroViewPresetsUseCase,
  createInMemoryHeroViewPresetRepository,
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

export type SectionType = 'background' | 'mask-surface' | 'mask-shape' | 'foreground-title' | 'foreground-description' | 'filter'

/**
 * Custom mask shape params union type
 */
export type CustomMaskShapeParams =
  | ({ type: 'circle' } & CircleMaskShapeParams)
  | ({ type: 'rect' } & RectMaskShapeParams)
  | ({ type: 'blob' } & BlobMaskShapeParams)

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
  const { primitivePalette, isDark } = options

  // ============================================================
  // Pattern Definitions
  // ============================================================
  const texturePatterns = getDefaultTexturePatterns()
  const maskPatterns = getDefaultMaskPatterns()
  const midgroundTexturePatterns = getMidgroundPresets()

  // ============================================================
  // Editor State (index-based for UI management)
  // ============================================================
  const editorState = ref<HeroSceneEditorState>(createHeroSceneEditorState({ width: 1280, height: 720 }))

  // Selection state (UI bindings)
  const selectedBackgroundIndex = ref(3)
  const selectedMaskIndex = ref<number | null>(21)
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
      customMaskShapeParams.value = null
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
  // Renderer State
  // ============================================================
  let previewRenderer: TextureRenderer | null = null
  const thumbnailRenderers: TextureRenderer[] = []

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

  // Mask outer color (the color outside the mask / cutout area)
  const maskOuterColorKey = ref<PrimitiveKey | 'auto'>('auto')  // 'auto' = use semantic context surface

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

  // Resolve mask outer color key ('auto' uses semantic context surface)
  const resolvedMaskOuterColorKey = computed((): PrimitiveKey =>
    maskOuterColorKey.value === 'auto' ? maskSurfaceKey.value : maskOuterColorKey.value
  )

  const maskInnerColor = computed((): RGBA => paletteToRgba(primitivePalette.value[resolvedMaskOuterColorKey.value], 0))
  const maskOuterColor = computed((): RGBA => paletteToRgba(primitivePalette.value[resolvedMaskOuterColorKey.value]))

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
  // Foreground Ink Colors (computed from background)
  // ============================================================
  /**
   * Computed ink colors for foreground text elements.
   * These are automatically calculated based on the background surface color.
   */
  const foregroundTitleInk = computed((): Oklch => {
    // Use the background's primary surface color to determine text contrast
    const surfaceKey = resolvedBackgroundColorKey2.value
    return getInkColorForSurface(surfaceKey, 'title')
  })

  const foregroundBodyInk = computed((): Oklch => {
    const surfaceKey = resolvedBackgroundColorKey2.value
    return getInkColorForSurface(surfaceKey, 'body')
  })

  /**
   * Get CSS color strings for foreground elements
   */
  const foregroundTitleColor = computed((): string => $Oklch.toCss(foregroundTitleInk.value))
  const foregroundBodyColor = computed((): string => $Oklch.toCss(foregroundBodyInk.value))

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
        name: 'Mask Layer',
        visible: true,
        opacity: 1.0,
        zIndex: 1,
        blendMode: 'normal',
        filters: maskFilters,
        config: {
          type: 'maskedTexture',
          maskIndex: selectedMaskIndex.value ?? 0,
          textureIndex: selectedMidgroundTextureIndex.value,
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
      }

      // Update mask layer configs (all maskedTexture layers share the same settings)
      if (layer.config.type === 'maskedTexture') {
        layer.config = {
          type: 'maskedTexture',
          maskIndex: selectedMaskIndex.value ?? 0,
          textureIndex: customMaskBitmap ? null : selectedMidgroundTextureIndex.value,
          surfaceImage: customMaskBitmap ?? undefined,
        }
      }
    }

    // Trigger reactivity
    editorState.value = { ...editorState.value }
  }

  // ============================================================
  // Layer Operations (public API)
  // ============================================================

  /**
   * Add a new mask layer (limited to 1 mask layer)
   * Returns null if a mask layer already exists
   */
  const addMaskLayer = (): string | null => {
    // Check if mask layer already exists
    const existingMask = editorState.value.canvasLayers.find(
      l => l.config.type === 'maskedTexture'
    )
    if (existingMask) return null

    const id = `mask-${Date.now()}`
    const newLayer: EditorCanvasLayer = {
      id,
      name: 'Mask Layer',
      visible: true,
      opacity: 1.0,
      zIndex: editorState.value.canvasLayers.length,
      blendMode: 'normal',
      filters: createDefaultFilterConfig(),
      config: {
        type: 'maskedTexture',
        maskIndex: selectedMaskIndex.value ?? 0,
        textureIndex: selectedMidgroundTextureIndex.value,
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
    const buildMaskConfig = (): CircleMaskShapeConfig | RectMaskShapeConfig | BlobMaskShapeConfig => {
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
    const buildSurfaceParams = (): StripePresetParams | GridPresetParams | PolkaDotPresetParams | CheckerPresetParams | null => {
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
        // gradientGrain is handled separately
        return null
      }
      // Fall back to preset - check for solid type
      if (preset.params.type === 'solid') {
        return null
      }
      return preset.params as StripePresetParams | GridPresetParams | PolkaDotPresetParams | CheckerPresetParams
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

    // Iterate through editor layers in zIndex order
    let isFirstVisible = true
    for (let i = 0; i < editorState.value.canvasLayers.length; i++) {
      const layer = editorState.value.canvasLayers[i]
      if (!layer || !layer.visible) continue

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

        case 'maskedTexture': {
          const maskPattern = maskPatterns[layer.config.maskIndex]
          if (maskPattern) {
            // surfaceImage がある場合: 画像を描画してからマスクオーバーレイを適用
            if (layer.config.surfaceImage) {
              await previewRenderer.renderImage(layer.config.surfaceImage, { clear: false })
              // マスク形状の外側を背景色で塗りつぶし（内側は透明）
              const maskSpec = maskPattern.createSpec(maskInnerColor.value, maskOuterColor.value, viewport)
              previewRenderer.render(maskSpec, { clear: false })
              break
            }

            // gradientGrain がある場合: グラデーションを描画してからマスクオーバーレイを適用
            if (customSurfaceParams.value?.type === 'gradientGrain') {
              const params = customSurfaceParams.value
              const gradientSpec = createGradientGrainSpec({
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
                colorA: midgroundTextureColor1.value,
                colorB: midgroundTextureColor2.value,
                seed: params.seed,
                sparsity: params.sparsity,
                curvePoints: params.curvePoints,
              }, viewport)
              if (gradientSpec) {
                previewRenderer.render(gradientSpec, { clear: false })
                const maskSpec = maskPattern.createSpec(maskInnerColor.value, maskOuterColor.value, viewport)
                previewRenderer.render(maskSpec, { clear: false })
                break
              }
            }

            if (layer.config.textureIndex !== null) {
              const texturePattern = midgroundTexturePatterns[layer.config.textureIndex]
              if (texturePattern) {
                const spec = createMaskedTextureSpec(
                  maskPattern,
                  texturePattern,
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
            // Fallback to solid color mask: use customMaskShapeParams to respect cutout setting
            const params = customMaskShapeParams.value
            const cutout = params?.cutout ?? true

            // Create mask spec using customMaskShapeParams for proper cutout handling
            // For cutout: true  -> inside transparent (show background), outside colored
            // For cutout: false -> inside colored, outside transparent
            const createMaskSpecFromParams = (): TextureRenderSpec | null => {
              if (!params) return null

              if (params.type === 'circle') {
                return createCircleMaskSpec(
                  {
                    centerX: params.centerX,
                    centerY: params.centerY,
                    radius: params.radius,
                    innerColor: cutout ? maskInnerColor.value : midgroundTextureColor1.value,
                    outerColor: cutout ? maskOuterColor.value : maskInnerColor.value,
                    cutout,
                  },
                  viewport
                )
              }
              if (params.type === 'rect') {
                return createRectMaskSpec(
                  {
                    left: params.left,
                    right: params.right,
                    top: params.top,
                    bottom: params.bottom,
                    radiusTopLeft: params.radiusTopLeft,
                    radiusTopRight: params.radiusTopRight,
                    radiusBottomLeft: params.radiusBottomLeft,
                    radiusBottomRight: params.radiusBottomRight,
                    innerColor: cutout ? maskInnerColor.value : midgroundTextureColor1.value,
                    outerColor: cutout ? maskOuterColor.value : maskInnerColor.value,
                    cutout,
                  },
                  viewport
                )
              }
              if (params.type === 'blob') {
                return createBlobMaskSpec(
                  {
                    centerX: params.centerX,
                    centerY: params.centerY,
                    baseRadius: params.baseRadius,
                    amplitude: params.amplitude,
                    frequency: 0,
                    octaves: params.octaves,
                    seed: params.seed,
                    innerColor: cutout ? maskInnerColor.value : midgroundTextureColor1.value,
                    outerColor: cutout ? maskOuterColor.value : maskInnerColor.value,
                    cutout,
                  },
                  viewport
                )
              }
              return null
            }

            const maskSpec = createMaskSpecFromParams()
            if (maskSpec) {
              previewRenderer.render(maskSpec, { clear: false })
            } else {
              // Fallback if customMaskShapeParams not available
              const spec = maskPattern.createSpec(maskInnerColor.value, maskOuterColor.value, viewport)
              previewRenderer.render(spec, { clear: false })
            }
          }
          break
        }
      }

      // Apply per-layer filters after rendering the layer
      applyLayerFilters(layer, viewport)
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
    if (section === 'mask-shape') return maskPatterns
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

    // Handle mask-surface section separately
    if (section === 'mask-surface') {
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

      // Handle mask-surface section separately (uses midgroundTexturePatterns)
      if (section === 'mask-surface') {
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

      // Handle background and mask-shape sections
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

  watch(
    [selectedBackgroundIndex, selectedMaskIndex, selectedMidgroundTextureIndex],
    () => {
      syncLayerConfigs()
      renderScene()
    }
  )

  // Initialize custom params when selection changes
  watch(selectedBackgroundIndex, () => {
    initBackgroundSurfaceParamsFromPreset()
  }, { immediate: true })

  watch(selectedMaskIndex, () => {
    initMaskShapeParamsFromPreset()
  }, { immediate: true })

  watch(selectedMidgroundTextureIndex, () => {
    initSurfaceParamsFromPreset()
  }, { immediate: true })

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
   * Build BackgroundSurfaceConfig from current state
   */
  const buildBackgroundSurface = (): BackgroundSurfaceConfig => {
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
   * Build MaskSurfaceConfig from current state
   */
  const buildMaskSurface = (): MaskSurfaceConfig => {
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
      outer: maskOuterColorKey.value as HeroPrimitiveKey | 'auto',
    },
    semanticContext: maskSemanticContext.value as HeroContextName,
  })

  /**
   * Convert current editor state to HeroViewConfig
   * Returns a self-contained, JSON-serializable config
   */
  const toHeroViewConfig = (): HeroViewConfig => {
    const baseFilters = layerFilterConfigs.value.get(LAYER_IDS.BASE) ?? createDefaultFilterConfig()
    const maskFilters = layerFilterConfigs.value.get(LAYER_IDS.MASK) ?? createDefaultFilterConfig()

    const background: BackgroundLayerConfig = {
      surface: buildBackgroundSurface(),
      filters: baseFilters,
    }

    let mask: MaskLayerConfig | null = null
    const maskShape = buildMaskShape()
    if (maskShape && selectedMaskIndex.value !== null) {
      mask = {
        shape: maskShape,
        surface: buildMaskSurface(),
        filters: maskFilters,
      }
    }

    return {
      viewport: {
        width: editorState.value.config.width,
        height: editorState.value.config.height,
      },
      colors: buildColorsConfig(),
      background,
      mask,
      foreground: foregroundConfig.value,
    }
  }

  /**
   * Restore editor state from HeroViewConfig
   * Note: Image restoration requires additional handling (imageId → ImageBitmap)
   */
  const fromHeroViewConfig = (config: HeroViewConfig) => {
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
    maskOuterColorKey.value = colors.mask.outer as PrimitiveKey | 'auto'
    maskSemanticContext.value = colors.semanticContext as ContextName

    // Background surface
    const bgSurface = config.background.surface
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
    }
    // Note: image type requires external handling

    // Background filters
    layerFilterConfigs.value.set(LAYER_IDS.BASE, config.background.filters)

    // Mask layer
    if (config.mask) {
      // Mask shape
      const shape = config.mask.shape
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

      // Mask surface
      const maskSurface = config.mask.surface
      if (maskSurface.type === 'solid') {
        customSurfaceParams.value = { type: 'solid' }
        selectedMidgroundTextureIndex.value = 0
      } else if (maskSurface.type === 'stripe') {
        customSurfaceParams.value = { type: 'stripe', width1: maskSurface.width1, width2: maskSurface.width2, angle: maskSurface.angle }
      } else if (maskSurface.type === 'grid') {
        customSurfaceParams.value = { type: 'grid', lineWidth: maskSurface.lineWidth, cellSize: maskSurface.cellSize }
      } else if (maskSurface.type === 'polkaDot') {
        customSurfaceParams.value = { type: 'polkaDot', dotRadius: maskSurface.dotRadius, spacing: maskSurface.spacing, rowOffset: maskSurface.rowOffset }
      } else if (maskSurface.type === 'checker') {
        customSurfaceParams.value = { type: 'checker', cellSize: maskSurface.cellSize, angle: maskSurface.angle }
      }
      // Note: image type requires external handling

      // Mask filters
      layerFilterConfigs.value.set(LAYER_IDS.MASK, config.mask.filters)
    } else {
      selectedMaskIndex.value = null
      customMaskShapeParams.value = null
      customSurfaceParams.value = null
    }

    // Foreground
    foregroundConfig.value = config.foreground

    // Reset mask selection based on restored config
    if (config.mask) {
      selectedMaskIndex.value = 0 // TODO: Reverse-lookup mask shape index
    } else {
      selectedMaskIndex.value = null
    }

    // Re-render
    renderScene()
  }

  // ============================================================
  // Preset Management
  // ============================================================

  const presetRepository = createInMemoryHeroViewPresetRepository()
  const presetUseCase = createGetHeroViewPresetsUseCase(presetRepository)
  const presets = ref<HeroViewPreset[]>([])
  const selectedPresetId = ref<string | null>(null)

  /**
   * Load available presets
   */
  const loadPresets = async () => {
    presets.value = await presetUseCase.execute()
  }

  /**
   * Apply a preset by ID
   * Returns the colorPreset if available for the caller to apply
   */
  const applyPreset = async (presetId: string) => {
    const preset = await presetUseCase.findById(presetId)
    if (preset) {
      selectedPresetId.value = presetId
      fromHeroViewConfig(preset.config)
      return preset.colorPreset ?? null
    }
    return null
  }

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

    // Spec creators for thumbnails
    createMidgroundThumbnailSpec,

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
    maskOuterColorKey,

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
    removeLayer,
    updateLayerVisibility,
    toggleLayerVisibility,

    // Actions
    openSection,
    initPreview,
    destroyPreview,

    // Foreground (HTML layer)
    foregroundConfig,
    foregroundTitleColor,
    foregroundBodyColor,

    // Serialization
    toHeroViewConfig,
    fromHeroViewConfig,

    // Presets
    presets,
    selectedPresetId,
    loadPresets,
    applyPreset,
  }
}
