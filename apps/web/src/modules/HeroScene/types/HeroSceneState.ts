/**
 * HeroSceneState Type Definitions
 *
 * useHeroSceneの返り値を論理的にグループ化した型定義。
 * prop drillingの複雑さを軽減し、関連するstate/actionsをまとめて扱えるようにする。
 *
 * ## 使用例
 *
 * ```typescript
 * // グループ化された型を使用してpropsを定義
 * interface Props {
 *   background: BackgroundState
 *   mask: MaskState
 *   filter: FilterState
 * }
 * ```
 *
 * @see useHeroScene for the composable that returns these grouped states
 */

import type { Ref, ComputedRef, ShallowRef } from 'vue'
import type { ObjectSchema } from '@practice/schema'
import type {
  TexturePattern,
  MaskPattern,
  SurfacePreset,
  RGBA,
  TextureRenderSpec,
  CircleMaskShapeParams,
  RectMaskShapeParams,
  BlobMaskShapeParams,
  PerlinMaskShapeParams,
  LinearGradientMaskShapeParams,
  RadialGradientMaskShapeParams,
  BoxGradientMaskShapeParams,
  WavyLineMaskShapeParams,
  StripeSurfaceParams,
  GridSurfaceParams,
  PolkaDotSurfaceParams,
  CheckerSurfaceParams,
  TriangleSurfaceParams,
  HexagonSurfaceParams,
  Viewport,
  DepthMapType,
} from '@practice/texture'
import type { Oklch } from '@practice/color'
import type { PrimitiveKey } from '../../SemanticColorPalette/Domain'
import type { InkRole } from '../../SemanticColorPalette/Domain'
import type {
  LayerEffectConfig,
  EffectType,
  HeroViewConfig,
  HeroViewPreset,
  LayerNodeConfig,
  ForegroundLayerConfig,
  HeroContextName,
  FilterType,
  SurfaceParamsUpdate,
  HeroViewRepository,
  SurfaceUsecase,
  ForegroundElementUpdate,
  PresetColorConfig,
  ExportPresetOptions,
  HeroEditorUIState,
} from '../index'

// ============================================================
// Effect Manager Interface (to avoid importing from composables)
// ============================================================

/**
 * Interface for effect manager (matches useEffectManager return type)
 *
 * This interface is defined here to maintain Clean Architecture boundaries.
 * The actual implementation is in composables/useEffectManager.ts
 */
export interface EffectManagerInterface {
  /** All layer effect configs (reactive Map) */
  readonly effects: ComputedRef<Map<string, LayerEffectConfig>>
  /** Currently selected layer ID */
  readonly selectedLayerId: Ref<string | null>
  /** Effect config for the currently selected layer */
  readonly selectedEffect: ComputedRef<LayerEffectConfig | null>
  /** Select a layer by ID */
  readonly selectLayer: (id: string) => void
  /** Set effect type for a layer (null to disable all effects) */
  readonly setEffectType: (layerId: string, type: EffectType | null) => void
  /** Update effect params for a layer */
  readonly updateEffectParams: <T extends EffectType>(
    layerId: string,
    type: T,
    params: Partial<Omit<LayerEffectConfig[T], 'enabled'>>
  ) => void
  /** Set entire effect config for a layer (for loading from repository) */
  readonly setEffectConfig: (layerId: string, config: LayerEffectConfig) => void
  /** Delete effect config for a layer */
  readonly deleteEffectConfig: (layerId: string) => void
}

// ============================================================
// Custom Params Types (re-exported from useHeroScene)
// ============================================================

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
  | ({ type: 'triangle' } & TriangleSurfaceParams)
  | ({ type: 'hexagon' } & HexagonSurfaceParams)
  | ({ type: 'gradientGrain' } & GradientGrainSurfaceParams)
  | ({ type: 'asanoha' } & AsanohaSurfaceParams)
  | ({ type: 'seigaiha' } & SeigaihaSurfaceParams)
  | ({ type: 'wave' } & WaveSurfaceParams)
  | ({ type: 'scales' } & ScalesSurfaceParams)
  | ({ type: 'ogee' } & OgeeSurfaceParams)
  | ({ type: 'sunburst' } & SunburstSurfaceParams)

/**
 * Custom background surface params union type
 */
export type CustomBackgroundSurfaceParams =
  | { type: 'solid' }
  | ({ type: 'stripe' } & StripeSurfaceParams)
  | ({ type: 'grid' } & GridSurfaceParams)
  | ({ type: 'polkaDot' } & PolkaDotSurfaceParams)
  | ({ type: 'checker' } & CheckerSurfaceParams)
  | ({ type: 'triangle' } & TriangleSurfaceParams)
  | ({ type: 'hexagon' } & HexagonSurfaceParams)
  | ({ type: 'gradientGrain' } & GradientGrainSurfaceParams)
  | ({ type: 'asanoha' } & AsanohaSurfaceParams)
  | ({ type: 'seigaiha' } & SeigaihaSurfaceParams)
  | ({ type: 'wave' } & WaveSurfaceParams)
  | ({ type: 'scales' } & ScalesSurfaceParams)
  | ({ type: 'ogee' } & OgeeSurfaceParams)
  | ({ type: 'sunburst' } & SunburstSurfaceParams)

// ============================================================
// Section Type
// ============================================================

export type SectionType =
  | 'background'
  | 'clip-group-surface'
  | 'clip-group-shape'
  | 'foreground-title'
  | 'foreground-description'
  | 'filter'
  | 'effect'
  | 'text-content'

// ============================================================
// PatternState - Texture/Mask Pattern Data
// ============================================================

/**
 * Pattern state for texture/mask selection and thumbnails
 */
export interface PatternState {
  /** Available texture patterns */
  readonly texturePatterns: TexturePattern[]
  /** Available mask patterns */
  readonly maskPatterns: MaskPattern[]
  /** Available midground texture patterns (surface presets) */
  readonly midgroundTexturePatterns: SurfacePreset[]

  /** Color 1 for texture patterns */
  readonly textureColor1: ComputedRef<RGBA>
  /** Color 2 for texture patterns */
  readonly textureColor2: ComputedRef<RGBA>
  /** Color 1 for midground texture patterns */
  readonly midgroundTextureColor1: ComputedRef<RGBA>
  /** Color 2 for midground texture patterns */
  readonly midgroundTextureColor2: ComputedRef<RGBA>
  /** Inner color for mask (transparent) */
  readonly maskInnerColor: ComputedRef<RGBA>
  /** Outer color for mask */
  readonly maskOuterColor: ComputedRef<RGBA>

  /** Create spec for midground thumbnail rendering */
  readonly createMidgroundThumbnailSpec: (preset: SurfacePreset, color1: RGBA, color2: RGBA, viewport: Viewport) => TextureRenderSpec | null
  /** Create spec for background thumbnail rendering */
  readonly createBackgroundThumbnailSpec: (viewport: { width: number; height: number }) => TextureRenderSpec | null

  /** Selected background texture index */
  readonly selectedBackgroundIndex: Ref<number>
  /** Selected mask pattern index (null = custom image) */
  readonly selectedMaskIndex: Ref<number | null>
  /** Selected midground texture index */
  readonly selectedMidgroundTextureIndex: Ref<number>
  /** Active UI section */
  readonly activeSection: Ref<SectionType | null>
}

// ============================================================
// BackgroundState - Background Layer State + Actions
// ============================================================

/**
 * Background layer state and actions
 */
export interface BackgroundState {
  /** Primary color key for background */
  readonly backgroundColorKey1: Ref<PrimitiveKey>
  /** Secondary color key for background ('auto' = canvas surface) */
  readonly backgroundColorKey2: Ref<PrimitiveKey | 'auto'>

  /** Custom background image URL (data URL or blob URL) */
  readonly customBackgroundImage: Ref<string | null>
  /** Custom background image file */
  readonly customBackgroundFile: Ref<File | null>
  /** Set background image from file */
  readonly setBackgroundImage: (file: File) => Promise<void>
  /** Clear background image */
  readonly clearBackgroundImage: () => void
  /** Load random background image from Unsplash */
  readonly loadRandomBackgroundImage: () => Promise<void>
  /** Loading state for random background */
  readonly isLoadingRandomBackground: Ref<boolean>

  /** Custom background surface params */
  readonly customBackgroundSurfaceParams: Ref<CustomBackgroundSurfaceParams | null>
  /** Current background surface schema for UI */
  readonly currentBackgroundSurfaceSchema: ComputedRef<ObjectSchema | null>
  /** Update background surface params */
  readonly updateBackgroundSurfaceParams: (updates: Partial<SurfaceParamsUpdate>) => void
}

// ============================================================
// MaskState - Clip Group State + Actions
// ============================================================

/**
 * Mask (clip group) state and actions
 */
export interface MaskState {
  /** Primary color key for mask */
  readonly maskColorKey1: Ref<PrimitiveKey | 'auto'>
  /** Secondary color key for mask */
  readonly maskColorKey2: Ref<PrimitiveKey | 'auto'>

  /** Semantic context for mask layer (for surface color derivation) */
  readonly maskSemanticContext: Ref<HeroContextName>

  /** Custom mask image URL */
  readonly customMaskImage: Ref<string | null>
  /** Custom mask image file */
  readonly customMaskFile: Ref<File | null>
  /** Set mask image from file */
  readonly setMaskImage: (file: File) => Promise<void>
  /** Clear mask image */
  readonly clearMaskImage: () => void
  /** Load random mask image */
  readonly loadRandomMaskImage: () => Promise<void>
  /** Loading state for random mask */
  readonly isLoadingRandomMask: Ref<boolean>

  /** Custom mask shape params */
  readonly customMaskShapeParams: Ref<CustomMaskShapeParams | null>
  /** Custom surface params for midground */
  readonly customSurfaceParams: Ref<CustomSurfaceParams | null>
  /** Current mask shape schema for UI */
  readonly currentMaskShapeSchema: ComputedRef<ObjectSchema | null>
  /** Current surface schema for UI */
  readonly currentSurfaceSchema: ComputedRef<ObjectSchema | null>
  /** Update mask shape params */
  readonly updateMaskShapeParams: (updates: Partial<CircleMaskShapeParams | RectMaskShapeParams | BlobMaskShapeParams | PerlinMaskShapeParams | LinearGradientMaskShapeParams | RadialGradientMaskShapeParams | BoxGradientMaskShapeParams | WavyLineMaskShapeParams>) => void
  /** Update surface params */
  readonly updateSurfaceParams: (updates: Partial<StripeSurfaceParams | GridSurfaceParams | PolkaDotSurfaceParams | CheckerSurfaceParams>) => void
}

// ============================================================
// FilterState - Effect Configuration
// ============================================================

/**
 * Filter/effect state and actions
 */
export interface FilterState {
  /** Effect manager composable instance */
  readonly effectManager: EffectManagerInterface
  /** Currently selected layer for filter editing */
  readonly selectedFilterLayerId: Ref<string | null>
  /** Filter config for selected layer */
  readonly selectedLayerFilters: ComputedRef<LayerEffectConfig | null>
  /** All layer filter configs */
  readonly layerFilterConfigs: Ref<Map<string, LayerEffectConfig>>
  /** Update filters for a layer */
  readonly updateLayerFilters: (layerId: string, updates: DeepPartial<LayerEffectConfig>) => void

  /** Select filter type (exclusive selection) */
  readonly selectFilterType: (layerId: string, type: FilterType) => void
  /** Get current filter type for a layer */
  readonly getFilterType: (layerId: string) => FilterType

  /** Update vignette parameters */
  readonly updateVignetteParams: (layerId: string, params: Partial<{ intensity: number; radius: number; softness: number }>) => void
  /** Update chromatic aberration parameters */
  readonly updateChromaticAberrationParams: (layerId: string, params: Partial<{ intensity: number }>) => void
  /** Update dot halftone parameters */
  readonly updateDotHalftoneParams: (layerId: string, params: Partial<{ dotSize: number; spacing: number; angle: number }>) => void
  /** Update line halftone parameters */
  readonly updateLineHalftoneParams: (layerId: string, params: Partial<{ lineWidth: number; spacing: number; angle: number }>) => void
  /** Update blur parameters */
  readonly updateBlurParams: (layerId: string, params: Partial<{
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
  }>) => void
}

/** Deep partial utility type */
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

// ============================================================
// ForegroundState - Foreground Elements
// ============================================================

/**
 * Foreground (HTML layer) state
 */
export interface ForegroundState {
  /** Foreground layer configuration */
  readonly foregroundConfig: Ref<ForegroundLayerConfig>

  /** Computed title text color (CSS string) */
  readonly foregroundTitleColor: ComputedRef<string>
  /** Computed body text color (CSS string) */
  readonly foregroundBodyColor: ComputedRef<string>
  /** Computed element colors map (CSS strings) */
  readonly foregroundElementColors: ComputedRef<Map<string, string>>

  /** Auto-selected title color key */
  readonly foregroundTitleAutoKey: ComputedRef<PrimitiveKey | null>
  /** Auto-selected body color key */
  readonly foregroundBodyAutoKey: ComputedRef<PrimitiveKey | null>
}

// ============================================================
// PresetState - Preset Management
// ============================================================

/**
 * Preset management state and actions
 */
export interface PresetState {
  /** Available presets */
  readonly presets: Ref<HeroViewPreset[]>
  /** Currently selected preset ID */
  readonly selectedPresetId: Ref<string | null>

  /** Load presets from repository (returns color preset if initial preset applied) */
  readonly loadPresets: (applyInitial?: boolean) => Promise<PresetColorConfig | null>
  /** Apply a preset (returns color preset if available) */
  readonly applyPreset: (presetId: string) => Promise<PresetColorConfig | null>
  /** Export current state as preset */
  readonly exportPreset: (options?: ExportPresetOptions) => HeroViewPreset
}

// ============================================================
// LayerOperations - Layer CRUD Operations
// ============================================================

/** Anchor position type for text layers */
export type TextAnchorPosition = 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'

/** Add object layer options */
export interface AddObjectLayerOptions {
  modelUrl?: string
  x?: number
  y?: number
  z?: number
  rotationX?: number
  rotationY?: number
  rotationZ?: number
  scale?: number
}

/**
 * Layer operation actions
 */
export interface LayerOperations {
  /** Add a mask layer (returns layer ID or null if limit reached) */
  readonly addMaskLayer: () => string | null
  /** Add a text layer (returns layer ID) */
  readonly addTextLayer: (config?: Partial<{ text: string; fontFamily: string; fontSize: number }>) => string
  /** Add a 3D object layer (returns layer ID) */
  readonly addObjectLayer: (options?: Partial<AddObjectLayerOptions>) => string
  /** Remove a layer by ID (returns true if removed) */
  readonly removeLayer: (layerId: string) => boolean

  /** Update layer visibility */
  readonly updateLayerVisibility: (layerId: string, visible: boolean) => void
  /** Toggle layer visibility */
  readonly toggleLayerVisibility: (layerId: string) => void
  /** Update text layer configuration */
  readonly updateTextLayerConfig: (layerId: string, config: Partial<{
    text: string
    fontFamily: string
    fontSize: number
    fontWeight: number
    letterSpacing: number
    lineHeight: number
    color: string
    position: { x: number; y: number; anchor: TextAnchorPosition }
    rotation: number
  }>) => void
}

// ============================================================
// InkColorHelpers - Ink Color Selection
// ============================================================

/**
 * Ink color helper functions
 */
export interface InkColorHelpers {
  /** Get ink color for text on a given surface */
  readonly getInkColorForSurface: (surfaceKey: PrimitiveKey, role?: InkRole) => Oklch
  /** Get ink color as RGBA for rendering */
  readonly getInkRgbaForSurface: (surfaceKey: PrimitiveKey, role?: InkRole) => RGBA
}

// ============================================================
// CanvasState - Canvas/Renderer State
// ============================================================

/**
 * Canvas and rendering state
 */
export interface CanvasState {
  /** Cached canvas ImageData for contrast analysis */
  readonly canvasImageData: ShallowRef<ImageData | null>
  /** Set element bounds for per-element background analysis */
  readonly setElementBounds: (elementType: 'title' | 'description', bounds: { x: number; y: number; width: number; height: number } | null) => void
}

// ============================================================
// SerializationState - Config Import/Export
// ============================================================

/**
 * Serialization and repository operations
 */
export interface SerializationState {
  /** Export current state to HeroViewConfig */
  readonly toHeroViewConfig: () => HeroViewConfig
  /** Import state from HeroViewConfig */
  readonly fromHeroViewConfig: (config: HeroViewConfig) => Promise<void>
  /** Save to external repository */
  readonly saveToRepository: () => void
}

// ============================================================
// UsecaseState - Direct Usecase Access
// ============================================================

/**
 * Direct access to underlying usecases
 */
export interface UsecaseState {
  /** HeroView repository */
  readonly heroViewRepository: HeroViewRepository
  /** Unified surface usecase (operates on selected layer) */
  readonly surfaceUsecase: SurfaceUsecase
  /** Color usecase */
  readonly colorUsecase: {
    updateBrandColor: (params: { hue?: number; saturation?: number; value?: number }) => void
    updateAccentColor: (params: { hue?: number; saturation?: number; value?: number }) => void
    updateFoundationColor: (params: { hue?: number; saturation?: number; value?: number }) => void
    applyColorPreset: (preset: {
      id: string
      name: string
      description: string
      brand: { hue: number; saturation: number; value: number }
      accent: { hue: number; saturation: number; value: number }
      foundation: { hue: number; saturation: number; value: number }
    }) => void
  }
  /** Layer usecase */
  readonly layerUsecase: {
    addLayer: (layer: LayerNodeConfig, index?: number) => void
    removeLayer: (layerId: string) => void
    toggleExpand: (layerId: string) => void
    toggleVisibility: (layerId: string) => void
    updateLayer: (layerId: string, updates: Partial<LayerNodeConfig>) => void
  }
  /** Foreground element usecase */
  readonly foregroundElementUsecase: {
    getSelectedElement: () => unknown
    selectElement: (elementId: string | null) => void
    addElement: (type: 'title' | 'description') => void
    removeElement: (elementId: string) => void
    updateElement: (elementId: string, updates: ForegroundElementUpdate) => void
    updateSelectedElement: (updates: ForegroundElementUpdate) => void
  }
  /** Preset usecase */
  readonly presetUsecase: {
    exportPreset: (options?: { id?: string; name?: string }) => HeroViewPreset
    createPreset: (options?: { id?: string; name?: string }) => HeroViewPreset
  }
  /** Selected foreground element ID */
  readonly selectedForegroundElementId: Ref<string | null>
}

// ============================================================
// EditorState - Editor Debugging State
// ============================================================

/**
 * Editor state for debugging/inspection
 */
export interface EditorStateRef {
  /**
   * Current HeroViewConfig (derived from heroViewRepository)
   * This is the preferred way to access editor state
   */
  readonly heroViewConfig: ComputedRef<HeroViewConfig>
  /**
   * Unified UI state (selection indices, custom params, etc.)
   * This consolidates all UI-related state in a single reactive object
   */
  readonly editorUIState: Ref<HeroEditorUIState>
}

// ============================================================
// RendererActions - Preview Renderer Control
// ============================================================

/**
 * Preview renderer control actions
 */
export interface RendererActions {
  /** Initialize preview renderer */
  readonly initPreview: (canvas?: HTMLCanvasElement | null) => Promise<void>
  /** Destroy preview renderer */
  readonly destroyPreview: () => void
  /** Open a UI section */
  readonly openSection: (section: SectionType) => void
  /**
   * Render scene using HeroViewConfig-based pipeline
   *
   * This is an experimental function for Phase 8 migration.
   * It uses toHeroViewConfig() + renderHeroConfig() instead of the legacy
   * canvasLayers-based renderScene().
   *
   * @experimental This function is part of the migration from canvasLayers to HeroViewConfig
   */
  readonly renderSceneFromConfig?: () => Promise<void>
}

// ============================================================
// RightPropertyPanel Props Types
// ============================================================

/**
 * Selection state for RightPropertyPanel
 */
export interface RightPanelSelectionProps {
  /** Currently selected foreground element ID */
  readonly selectedForegroundElementId: string | null
  /** Currently selected layer */
  readonly selectedLayer: unknown | null
  /** Selected layer variant type */
  readonly selectedLayerVariant: 'base' | 'surface' | 'text' | 'model3d' | 'image' | null
  /** Selected processor type */
  readonly selectedProcessorType: 'effect' | 'mask' | 'processor' | null
}

/**
 * Foreground element props for RightPropertyPanel (text elements)
 */
export interface RightPanelForegroundProps {
  /** Foreground configuration */
  readonly foregroundConfig: ForegroundLayerConfig
  /** Auto-selected title color key */
  readonly foregroundTitleAutoKey: PrimitiveKey | null
  /** Auto-selected body color key */
  readonly foregroundBodyAutoKey: PrimitiveKey | null
}

/**
 * Background layer props for RightPropertyPanel
 */
export interface RightPanelBackgroundProps {
  /** Primary color key for background */
  readonly colorKey1: PrimitiveKey
  /** Secondary color key for background */
  readonly colorKey2: PrimitiveKey | 'auto'
  /** Custom background image URL */
  readonly customImage: string | null
  /** Custom background file name */
  readonly customFileName: string | null
  /** Selected pattern index */
  readonly selectedIndex: number | null
  /** Loading state for random background */
  readonly isLoadingRandom: boolean
  /** Surface schema for UI */
  readonly surfaceSchema: ObjectSchema | null
  /** Custom surface params */
  readonly surfaceParams: Record<string, unknown> | null
}

/**
 * Mask (surface) layer props for RightPropertyPanel
 */
export interface RightPanelMaskProps {
  /** Primary color key for mask surface */
  readonly colorKey1: PrimitiveKey | 'auto'
  /** Secondary color key for mask surface */
  readonly colorKey2: PrimitiveKey | 'auto'
  /** Custom mask image URL */
  readonly customImage: string | null
  /** Custom mask file name */
  readonly customFileName: string | null
  /** Selected surface pattern index */
  readonly selectedSurfaceIndex: number | null
  /** Loading state for random mask */
  readonly isLoadingRandom: boolean
  /** Surface schema for UI */
  readonly surfaceSchema: ObjectSchema | null
  /** Custom surface params */
  readonly surfaceParams: Record<string, unknown> | null
  /** Selected mask shape index */
  readonly selectedShapeIndex: number | null
  /** Mask shape schema for UI */
  readonly shapeSchema: ObjectSchema | null
  /** Custom mask shape params */
  readonly shapeParams: Record<string, unknown> | null
  /** Outer color for mask */
  readonly outerColor: RGBA
  /** Inner color for mask */
  readonly innerColor: RGBA
}

/**
 * Filter/effect props for RightPropertyPanel
 */
export interface RightPanelFilterProps {
  /** Currently selected filter type */
  readonly selectedType: FilterType
  /** Vignette configuration */
  readonly vignetteConfig: Record<string, unknown>
  /** Chromatic aberration configuration */
  readonly chromaticConfig: Record<string, unknown>
  /** Dot halftone configuration */
  readonly dotHalftoneConfig: Record<string, unknown>
  /** Line halftone configuration */
  readonly lineHalftoneConfig: Record<string, unknown>
  /** Blur configuration */
  readonly blurConfig: Record<string, unknown>
}
