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
import type { Timeline } from '@practice/timeline'
import type { ObjectSchema } from '@practice/schema'
import type {
  TexturePattern,
  MaskPattern,
  SurfacePreset,
  RGBA,
  TextureRenderSpec,
  Viewport,
  GenericParams,
} from '@practice/texture'
import type { Oklch } from '@practice/color'
import type { PrimitiveKey, InkRole } from '@practice/semantic-color-palette'
import type {
  LayerEffectConfig,
  EffectType,
  SingleEffectConfig,
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
  LayerDropPosition,
  ModifierDropPosition,
  CompiledHeroView,
  NormalizedMaskConfig,
  ProcessorNodeConfig,
  SurfaceLayerNodeConfig,
  ColorValue,
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
  // === New Multi-Effect API ===
  /** All layer effect configs as SingleEffectConfig[][] (reactive Map) */
  readonly effectPipelines: ComputedRef<Map<string, SingleEffectConfig[]>>
  /** Currently selected layer ID */
  readonly selectedLayerId: Ref<string | null>
  /** Effect pipeline for the currently selected layer */
  readonly selectedPipeline: ComputedRef<SingleEffectConfig[]>
  /** Select a layer by ID */
  readonly selectLayer: (id: string) => void
  /** Add an effect to a layer's pipeline */
  readonly addEffect: (layerId: string, effectType: EffectType, params?: Record<string, unknown>) => void
  /** Remove an effect from a layer's pipeline by index */
  readonly removeEffect: (layerId: string, index: number) => void
  /** Update effect params at a specific index */
  readonly updateEffectAt: (layerId: string, index: number, params: Record<string, unknown>) => void
  /** Reorder effects in the pipeline */
  readonly reorderEffects: (layerId: string, fromIndex: number, toIndex: number) => void
  /** Clear all effects from a layer */
  readonly clearEffects: (layerId: string) => void
  /** Set entire effect pipeline for a layer */
  readonly setEffectPipeline: (layerId: string, effects: SingleEffectConfig[]) => void
  /** Delete effect pipeline for a layer */
  readonly deleteEffectPipeline: (layerId: string) => void

  // === Raw Params for DSL Display ===
  /** Raw effect params for the selected layer (preserves PropertyValue for DSL display) */
  readonly selectedRawEffectParams: ComputedRef<Map<EffectType, Record<string, unknown>>>

  // === Legacy API (deprecated, for backward compatibility) ===
  /** All layer effect configs (reactive Map) @deprecated Use effectPipelines instead */
  readonly effects: ComputedRef<Map<string, LayerEffectConfig>>
  /** Effect config for the currently selected layer @deprecated Use selectedPipeline instead */
  readonly selectedEffect: ComputedRef<LayerEffectConfig | null>
  /** Set effect type for a layer (null to disable all effects) @deprecated Use addEffect/removeEffect instead */
  readonly setEffectType: (layerId: string, type: EffectType | null) => void
  /** Update effect params for a layer @deprecated Use updateEffectAt instead */
  readonly updateEffectParams: <T extends EffectType>(
    layerId: string,
    type: T,
    params: Partial<Omit<LayerEffectConfig[T], 'enabled'>>
  ) => void
  /** Set entire effect config for a layer @deprecated Use setEffectPipeline instead */
  readonly setEffectConfig: (layerId: string, config: LayerEffectConfig | SingleEffectConfig[]) => void
  /** Delete effect config for a layer @deprecated Use deleteEffectPipeline instead */
  readonly deleteEffectConfig: (layerId: string) => void
}

// ============================================================
// Custom Params Types (GenericParams-based type aliases)
// ============================================================

/**
 * Custom mask shape params - GenericParams with id field for type identification
 */
export type CustomMaskShapeParams = GenericParams

/**
 * Custom surface params - GenericParams with id field for type identification
 */
export type CustomSurfaceParams = GenericParams

/**
 * Custom background surface params - GenericParams with id field for type identification
 */
export type CustomBackgroundSurfaceParams = GenericParams

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
 * Mask pattern with normalized config for pipeline-based preview
 * Uses Omit to replace maskConfig type (MaskShapeConfig -> NormalizedMaskConfig)
 */
export interface MaskPatternWithNormalizedConfig extends Omit<MaskPattern, 'maskConfig'> {
  maskConfig: NormalizedMaskConfig
}

/**
 * Pattern state for texture/mask selection and thumbnails
 */
export interface PatternState {
  /** Available texture patterns (reactive ref for async loading) */
  readonly texturePatterns: Ref<TexturePattern[]>
  /** Available mask patterns (reactive ref for async loading) */
  readonly maskPatterns: Ref<MaskPattern[]>
  /** Mask patterns with normalized config for pipeline-based preview */
  readonly maskPatternsWithNormalizedConfig: ComputedRef<MaskPatternWithNormalizedConfig[]>
  /** Available midground texture patterns (reactive ref for async loading) */
  readonly midgroundTexturePatterns: Ref<SurfacePreset[]>

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
  /** Custom background surface params */
  readonly customBackgroundSurfaceParams: Ref<CustomBackgroundSurfaceParams | null>
  /** Raw background surface params with PropertyValue preserved (for DSL display) */
  readonly rawBackgroundSurfaceParams: ComputedRef<Record<string, unknown> | null>
  /** Current background surface schema for UI */
  readonly currentBackgroundSurfaceSchema: ComputedRef<ObjectSchema | null>
  /** Update background surface params */
  readonly updateBackgroundSurfaceParams: (updates: Partial<SurfaceParamsUpdate>) => void
  /** Update single background surface param (preserves existing PropertyValue types, accepts PropertyValue for DSL/range) */
  readonly updateSingleBackgroundSurfaceParam: (paramName: string, value: unknown) => void
}

// ============================================================
// MaskState - Clip Group State + Actions
// ============================================================

/**
 * Processor target info (processor node and its target surface)
 */
export interface ProcessorTarget {
  /** The selected processor node */
  readonly processor: ProcessorNodeConfig | undefined
  /** The surface that the processor applies to */
  readonly targetSurface: SurfaceLayerNodeConfig | undefined
}

/**
 * Mask (clip group) state and actions
 */
export interface MaskState {
  /** Semantic context for mask layer (for surface color derivation) */
  readonly maskSemanticContext: Ref<HeroContextName>

  /** Custom mask shape params */
  readonly customMaskShapeParams: Ref<CustomMaskShapeParams | null>
  /** Raw mask shape params with PropertyValue preserved (for DSL display) */
  readonly rawMaskShapeParams: ComputedRef<Record<string, unknown> | null>
  /** Custom surface params for midground */
  readonly customSurfaceParams: Ref<CustomSurfaceParams | null>
  /** Raw surface params with PropertyValue preserved (for DSL display) */
  readonly rawSurfaceParams: ComputedRef<Record<string, unknown> | null>
  /** Current mask shape schema for UI */
  readonly currentMaskShapeSchema: ComputedRef<ObjectSchema | null>
  /** Current surface schema for UI */
  readonly currentSurfaceSchema: ComputedRef<ObjectSchema | null>
  /** Update mask shape params */
  readonly updateMaskShapeParams: (updates: Record<string, unknown>) => void
  /** Update surface params */
  readonly updateSurfaceParams: (updates: Record<string, unknown>) => void
  /** Update single surface param (preserves existing PropertyValue types, accepts PropertyValue for DSL/range) */
  readonly updateSingleSurfaceParam: (paramName: string, value: unknown) => void

  /** Processor target info (derived from current selection) */
  readonly processorTarget: ComputedRef<ProcessorTarget>
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

  /**
   * Compiled HeroView with all values resolved
   * This is the source of truth for rendering.
   * All palette keys, PropertyValues, and font IDs are resolved to concrete values.
   */
  readonly compiledView: ComputedRef<CompiledHeroView>
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
  /** Currently selected preset (derived from selectedPresetId) */
  readonly selectedPreset: ComputedRef<HeroViewPreset | undefined>
  /** Timeline from selected preset (only if animated preset) */
  readonly selectedTimeline: ComputedRef<Timeline | undefined>

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

/** Add image layer options */
export interface AddImageLayerOptions {
  imageId?: string
  mode?: 'cover' | 'positioned'
  position?: {
    x: number
    y: number
    width: number
    height: number
    rotation?: number
    opacity?: number
  }
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
  /** Add an image layer (returns layer ID) */
  readonly addImageLayer: (options?: Partial<AddImageLayerOptions>) => string
  /** Add a group layer (returns layer ID) */
  readonly addGroupLayer: () => string
  /** Remove a layer by ID (returns true if removed) */
  readonly removeLayer: (layerId: string) => boolean
  /** Add a processor (effect or mask) to a layer */
  readonly addProcessorToLayer: (layerId: string, processorType: 'effect' | 'mask') => void
  /** Add a modifier (effect or mask) to an existing processor node */
  readonly addModifierToProcessor: (processorNodeId: string, processorType: 'effect' | 'mask') => void
  /** Remove a processor modifier from a layer by index (auto-removes processor if empty) */
  readonly removeProcessorFromLayer: (processorNodeId: string, modifierIndex: number) => void
  /** Remove an entire processor node (with all modifiers) */
  readonly removeProcessor: (processorNodeId: string) => void

  /** Update layer visibility */
  readonly updateLayerVisibility: (layerId: string, visible: boolean) => void
  /** Toggle layer visibility */
  readonly toggleLayerVisibility: (layerId: string) => void
  /** Wrap layer in a new group (returns group ID or null if failed) */
  readonly groupLayer: (layerId: string) => string | null
  /** Wrap layer with mask in a new group (returns group ID or null if failed) */
  readonly useAsMask: (layerId: string) => string | null
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
  /** Move layer to new position in tree */
  readonly moveLayer: (layerId: string, position: LayerDropPosition) => void
  /** Move modifier to new position */
  readonly moveModifier: (sourceNodeId: string, sourceModifierIndex: number, position: ModifierDropPosition) => void

  // Mask Children Operations
  /** Add layer to mask children */
  readonly addLayerToMask: (processorId: string, modifierIndex: number, layer: LayerNodeConfig) => void
  /** Remove layer from mask children */
  readonly removeLayerFromMask: (processorId: string, modifierIndex: number, layerId: string) => void
  /** Move layer within mask children */
  readonly moveLayerInMask: (processorId: string, modifierIndex: number, layerId: string, newIndex: number) => void
}

// ============================================================
// ImagesState - Image Layer Management
// ============================================================

/**
 * Image layer state and actions
 * For generic ImageLayer image management (layer-agnostic)
 */
export interface ImagesState {
  /** Image registry mapping layerId to ImageBitmap */
  readonly imageRegistry: Ref<Map<string, ImageBitmap>>

  /** Set image for any image layer */
  readonly setLayerImage: (layerId: string, file: File) => Promise<void>

  /** Clear image for a layer */
  readonly clearLayerImage: (layerId: string) => void

  /** Load random image for a layer */
  readonly loadRandomImage: (layerId: string, query?: string) => Promise<void>

  /** Get image URL for a layer */
  readonly getImageUrl: (layerId: string) => string | null

  /** Loading state per layer */
  readonly isLayerLoading: Ref<Map<string, boolean>>
}

// ============================================================
// ImagesState - Image Layer Management
// ============================================================

/**
 * Image layer state and actions
 * For generic ImageLayer image management (layer-agnostic)
 */
export interface ImagesState {
  /** Image registry mapping layerId to ImageBitmap */
  readonly imageRegistry: Ref<Map<string, ImageBitmap>>

  /** Set image for any image layer */
  readonly setLayerImage: (layerId: string, file: File) => Promise<void>

  /** Clear image for a layer */
  readonly clearLayerImage: (layerId: string) => void

  /** Load random image for a layer */
  readonly loadRandomImage: (layerId: string, query?: string) => Promise<void>

  /** Get image URL for a layer */
  readonly getImageUrl: (layerId: string) => string | null

  /** Loading state per layer */
  readonly isLayerLoading: Ref<Map<string, boolean>>
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
  /** SelectProcessor usecase - syncs effect manager with processor selection */
  readonly selectProcessorUsecase: {
    execute: (layers: LayerNodeConfig[], layerId: string, processorType: 'effect' | 'mask') => void
  }
  /** ApplyAnimatedPreset usecase - handles animated preset application */
  readonly applyAnimatedPresetUsecase: {
    execute: (preset: HeroViewPreset, baseLayerId: string) => void
  }
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
  /**
   * Expanded layer IDs for layer tree UI
   * Writable computed that syncs with editorUIState.layerTree.expandedLayerIds
   */
  readonly expandedLayerIds: Ref<Set<string>>
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
  /** Initialize pattern presets (loads from async repositories) */
  readonly initPatterns: () => Promise<void>
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
  /** Primary color value for background */
  readonly colorKey1: ColorValue
  /** Secondary color value for background */
  readonly colorKey2: ColorValue
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
  /** Raw surface params with PropertyValue preserved (for DSL display) */
  readonly rawSurfaceParams?: Record<string, unknown> | null
}

/**
 * Mask (surface) layer props for RightPropertyPanel
 */
export interface RightPanelMaskProps {
  /** Primary color value for mask surface */
  readonly colorKey1: ColorValue
  /** Secondary color value for mask surface */
  readonly colorKey2: ColorValue
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
  /** Raw surface params with PropertyValue preserved (for DSL display) */
  readonly rawSurfaceParams?: Record<string, unknown> | null
  /** Selected mask shape index */
  readonly selectedShapeIndex: number | null
  /** Mask shape schema for UI */
  readonly shapeSchema: ObjectSchema | null
  /** Custom mask shape params */
  readonly shapeParams: Record<string, unknown> | null
  /** Raw mask shape params with PropertyValue preserved (for DSL display) */
  readonly rawShapeParams?: Record<string, unknown> | null
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
