/**
 * HeroScene Module
 *
 * レイヤーベースのHeroセクション描画システム
 *
 * ## 構成
 *
 * ```
 * [HTMLLayer]       ← 最前面、インタラクティブ要素
 * [CanvasLayer N]   ← 装飾テキスト等
 * [CanvasLayer ...]
 * [CanvasLayer 1]   ← 中景（マスク付きテクスチャ）
 * [CanvasLayer 0]   ← 後景（背景テクスチャ/画像）
 * ```
 *
 * ## Usage
 *
 * ```typescript
 * import {
 *   createHeroScene,
 *   createTextureLayer,
 *   createTextLayer,
 *   createHeroSceneUseCase,
 * } from '@/modules/HeroScene'
 *
 * // シーンを作成
 * const scene = createHeroScene({ width: 1280, height: 720 })
 *
 * // レイヤーを追加
 * const bgLayer = createTextureLayer('bg', 3, { zIndex: 0 })
 * const textLayer = createTextLayer('title', 'Hello World', {
 *   zIndex: 10,
 *   fontSize: 72,
 *   fontFamily: 'Montserrat',
 * })
 * ```
 */

// Domain - CompiledHeroView
export type {
  CompiledHeroView,
  CompiledLayerNode,
  CompiledSurfaceLayerNode,
  CompiledTextLayerNode,
  CompiledImageLayerNode,
  CompiledGroupLayerNode,
  CompiledProcessorLayerNode,
  CompiledSurface,
  CompiledMaskShape,
  CompiledMaskProcessor,
  CompiledEffect,
  CompiledProcessorConfig,
  CompiledForegroundLayer,
  CompiledForegroundElement,
} from './Domain'

export {
  isCompiledSurfaceLayerNode,
  isCompiledTextLayerNode,
  isCompiledImageLayerNode,
  isCompiledGroupLayerNode,
  isCompiledProcessorLayerNode,
  isCompiledEffect,
  isCompiledMaskProcessor,
} from './Domain'

// Domain
export type {
  LayerBase,
  CanvasLayerType,
  TextureLayerConfig,
  ImageLayerConfig,
  TextLayerConfig,
  ObjectLayerConfig,
  // ClipGroup types
  ClipMaskShape,
  ClipMaskConfig,
  ClipMaskShapeParams,
  CircleClipShapeParams,
  RectClipShapeParams,
  BlobClipShapeParams,
  PerlinClipShapeParams,
  ImageClipShapeParams,
  ClipGroupLayerConfig,
  CanvasLayerConfig,
  CanvasLayer,
  BlendMode,
  // Effect types (new)
  VignetteEffectConfig,
  ChromaticAberrationEffectConfig,
  DotHalftoneEffectConfig,
  LineHalftoneEffectConfig,
  BlurEffectConfig,
  PixelateEffectConfig,
  HexagonMosaicEffectConfig,
  VoronoiMosaicEffectConfig,
  LayerEffectConfig,
  LayerEffectSchemaMap,
  // Vignette shape types (new)
  VignetteShape,
  VignetteConfig,
  EllipseVignetteConfig,
  CircleVignetteConfig,
  RectVignetteConfig,
  LinearVignetteConfig,
  EllipseVignetteParams,
  CircleVignetteParams,
  RectVignetteParams,
  LinearVignetteParams,
  // LayerTreeOps types
  LayerDropPosition,
  ModifierDropPosition,
  // HTML types
  HtmlContentItem,
  HtmlLayer,
  HeroSceneConfig,
  HeroScene,
  // HeroViewConfig types
  HeroPrimitiveKey,
  HeroContextName,
  HeroColorsConfig,
  ColorValue,
  CustomColor,
  ViewportConfig,
  // Normalized config types (Phase 12)
  SurfaceType,
  NormalizedSurfaceConfig,
  AnySurfaceConfig,
  MaskShapeTypeId,
  MaskShapeConfig,
  NormalizedMaskConfig,
  AnyMaskConfig,
  // Processor config types (JSON serialization)
  ProcessorConfig,
  SingleEffectConfig,
  MaskProcessorConfig,
  FilterProcessorConfig,
  // LayerNodeConfig types (JSON serialization)
  LayerNodeConfig,
  BaseLayerNodeConfig,
  SurfaceLayerNodeConfig,
  TextLayerNodeConfig,
  TextLayerNodeConfig as TextLayerNodeConfigType,
  Model3DLayerNodeConfig,
  ImageLayerNodeConfig,
  ImageLayerNodeConfig as ImageLayerNodeConfigType,
  ImagePositionConfig,
  GroupLayerNodeConfig,
  ProcessorNodeConfig,
  // Foreground
  GridPosition,
  ForegroundElementType,
  ForegroundElementConfig,
  ForegroundLayerConfig,
  HeroViewConfig,
  // HeroViewPreset types
  PresetHsvColor,
  PresetFoundation,
  PresetColorConfig,
  HeroViewPreset,
  // ReverseLookup types
  SurfacePresetParams,
  MaskPatternConfig,
  // Effect Registry types
  EffectType,
  FilterType,
  EffectDefinition,
  VignetteEffectDefinition,
  EffectShaderSpec,
  // Effector types (unified effect + mask)
  EffectorType,
  EffectorCategory,
  EffectorModifier,
  MaskShapeType,
  UnifiedFilterType,
  BaseEffectorDefinition,
  EffectEffectorDefinition,
  MaskEffectorDefinition,
  EffectorDefinition,
  // HeroEditorState types (unified UI state)
  EditorSectionType,
  BackgroundUIState,
  MaskUIState,
  FilterUIState,
  ForegroundUIState,
  PresetUIState,
  HeroEditorUIState,
  HeroEditorState,
  // EditorTypes (selection and layer types)
  ProcessorType,
  AddProcessorType,
  // SelectableProcessorType exported from Application below
  LayerSelection,
  UILayerType,
  LayerVariant,
  // TextAnchorPosition exported from ./types below
  TextLayerOptions,
  ObjectLayerOptions,
  ImageLayerOptions,
  // SectionVisual types
  StaticValue,
  RangeExpr,
  PropertyValue,
  VisualProperties,
  HeroConfigRef,
  ConfigRef,
  SectionVisual,
  // PropertyResolver
  PropertyResolver,
} from './Domain'

export {
  // Effect Schemas (new)
  VignetteEffectSchema,
  ChromaticAberrationEffectSchema,
  DotHalftoneEffectSchema,
  LineHalftoneEffectSchema,
  BlurEffectSchema,
  PixelateEffectSchema,
  HexagonMosaicEffectSchema,
  VoronoiMosaicEffectSchema,
  LayerEffectSchemas,
  createDefaultEffectConfig,
  createDefaultBlurConfig,
  createDefaultPixelateConfig,
  createDefaultHexagonMosaicConfig,
  createDefaultVoronoiMosaicConfig,
  // Vignette shape schemas and types
  VignetteBaseSchema,
  VignetteShapeSchemas,
  EllipseVignetteSchema,
  CircleVignetteSchema,
  RectVignetteSchema,
  LinearVignetteSchema,
  VignetteShapeOptions,
  createDefaultVignetteShapeConfig,
  createVignetteConfigForShape,
  createDefaultVignetteConfig,
  createDefaultChromaticAberrationConfig,
  createDefaultDotHalftoneConfig,
  createDefaultLineHalftoneConfig,
  createDefaultShapeVignetteConfig,
  // LayerTreeOps - Type guards
  isGroupLayerConfig,
  isProcessorLayerConfig,
  isSurfaceLayerConfig,
  isBaseLayerConfig,
  isTextLayerConfig,
  isImageLayerConfig,
  isModel3DLayerConfig,
  isMaskProcessorConfig,
  isFilterProcessorConfig,
  // LayerTreeOps - Tree operations
  findLayerInTree,
  updateLayerInTree,
  removeLayerFromTree,
  findParentLayerInTree,
  findProcessorWithMask,
  findProcessorTargetSurface,
  moveLayerInTree,
  canMoveLayerInTree,
  wrapLayerInGroupInTree,
  flattenLayersInTree,
  insertLayerInTree,
  createGroupLayerConfig,
  // LayerTreeOps - Modifier operations
  canMoveModifierInTree,
  moveModifierInTree,
  addModifierToProcessor,
  removeModifierFromProcessor,
  findProcessorForLayer,
  createProcessorNodeConfig,
  ensureProcessorForLayer,
  // LayerTreeOps - Processor target detection (for UI rendering)
  isProcessorTarget,
  hasProcessorBelow,
  // LayerTreeOps - Layer variant detection
  getLayerVariant,
  // Layer factories (deprecated - use HeroViewConfig instead)
  createCanvasLayer,
  createTextureLayer,
  createDefaultClipMask,
  createClipGroupLayer,
  createImageLayer,
  createTextLayer,
  createHtmlLayer,
  createHeroScene,
  sortCanvasLayers,
  addCanvasLayer,
  removeCanvasLayer,
  updateCanvasLayer,
  // HeroViewConfig factories
  createDefaultColorsConfig,
  createDefaultForegroundConfig,
  createDefaultHeroViewConfig,
  // Custom color type guard
  isCustomColor,
  // ReverseLookup utilities
  approxEqual,
  findSurfacePresetIndex,
  findMaskPatternIndex,
  findMaskPatternIndexByType,
  // Constants
  HERO_CANVAS_WIDTH,
  HERO_CANVAS_HEIGHT,
  HERO_CANVAS_DIMENSIONS,
  // Effect Registry
  EFFECT_REGISTRY,
  EFFECT_TYPES,
  getEffectDefinition,
  isValidEffectType,
  // Effector utilities (unified effect + mask)
  EFFECTOR_TYPES,
  MASK_SHAPE_TYPES,
  isEffectType,
  isMaskType,
  isValidEffectorType,
  isValidMaskShapeType,
  getEffectorCategory,
  getEffectorDisplayName,
  getMaskShapeDisplayName,
  createEffectorModifier,
  // Mappers
  toCustomMaskShapeParams,
  fromCustomMaskShapeParams,
  toCustomSurfaceParams,
  toCustomBackgroundSurfaceParams,
  fromCustomSurfaceParams,
  // ForegroundLayout
  type PositionedElement,
  type PositionedGroup,
  type CompiledPositionedElement,
  type CompiledPositionedGroup,
  GRID_POSITIONS,
  ELEMENT_TAG,
  compileForegroundLayout,
  layoutCompiledForeground,
  // Layer helpers
  getLayerFilters,
  // Processor modifier helpers
  findMaskModifierIndex,
  findModifierIndex,
  getPrecedingEffects,
  getEffectsBeforeMask,
  // Effect config type guard
  isSingleEffectConfig,
  // Effect utilities
  isEffectOfType,
  isVignetteEffect,
  isChromaticAberrationEffect,
  isDotHalftoneEffect,
  isLineHalftoneEffect,
  isBlurEffect,
  createSingleEffectConfig,
  extractEnabledEffects,
  denormalizeToLayerEffectConfig,
  safeDenormalizeToLayerEffectConfig,
  createDefaultMaskProcessorConfig,
  createDefaultFilterProcessorConfig,
  // Surface config normalization
  SURFACE_TYPES,
  isNormalizedSurfaceConfig,
  normalizeSurfaceConfig,
  denormalizeSurfaceConfig,
  safeDenormalizeSurfaceConfig,
  getSurfaceAsNormalized,
  // Mask config normalization
  MASK_SHAPE_TYPE_IDS,
  isNormalizedMaskConfig,
  normalizeMaskConfig,
  denormalizeMaskConfig,
  safeDenormalizeMaskConfig,
  getMaskAsNormalized,
  // Config migration (legacy format to normalized format)
  migrateToNormalizedFormat,
  // HeroEditorState factories
  createDefaultBackgroundUIState,
  createDefaultMaskUIState,
  createDefaultFilterUIState,
  createDefaultForegroundUIState,
  createDefaultPresetUIState,
  createDefaultHeroEditorUIState,
  isValidEditorSection,
  // SectionVisual helpers
  $PropertyValue,
  // PropertyResolver
  createPropertyResolver,
  resolveHeroViewConfig,
  // HeroViewPreset helpers
  isStaticPreset,
  isAnimatedPreset,
  getPresetConfig,
} from './Domain'

// Application
export type {
  // 3D Object Renderer
  Object3DRendererPort,
  Object3DRenderParams,
  LightingConfig,
  // Preset types
  HeroViewPresetRepository,
  GetHeroViewPresetsUseCase,
  // PresetManager types
  MergeMode,
  PresetManagerOptions,
  // ForegroundElement UseCase types
  ForegroundElementUpdate,
  ForegroundConfigPort,
  SelectionPort,
  ForegroundElementUsecase,
  ForegroundElementUsecaseDeps,
  // Usecase types
  ImageUploadPort,
  SurfaceParamsUpdate,
  MaskShapeParamsUpdate,
  LayerUpdate,
  // Unified Surface Usecase types
  SurfaceUsecase,
  SurfaceUsecaseDeps,
  SurfaceSelectionPort,
  // Processor Usecase types
  ProcessorModifierType,
  ProcessorUsecase,
  ProcessorUsecaseDeps,
  // SelectProcessor Usecase types
  SelectableProcessorType,
  EffectManagerPort,
  SelectProcessorResult,
  SelectProcessorUsecase,
  SelectProcessorUsecaseDeps,
  // ApplyAnimatedPreset Usecase types
  ForegroundConfigSyncPort,
  EffectManagerResetPort,
  ApplyAnimatedPresetResult,
  ApplyAnimatedPresetUsecase,
  ApplyAnimatedPresetUsecaseDeps,
  // GetProcessorWithTarget Usecase types
  ProcessorWithTarget,
  GetProcessorWithTargetUsecase,
  // compileHeroView types
  CompileContext,
  IntensityProvider,
  ForegroundColorContext,
  FontResolver,
} from './Application'

export {
  // Preset UseCase
  createGetHeroViewPresetsUseCase,
  // PresetManager
  PresetManager,
  createPresetManager,
  // ForegroundElement UseCase
  createForegroundElementUsecase,
  // Usecases
  createSurfaceUsecase,
  createProcessorUsecase,
  createSelectProcessorUsecase,
  createApplyAnimatedPresetUsecase,
  createGetProcessorWithTargetUsecase,
  getProcessorWithTargetUsecase,
  // ConfigSyncer
  syncBackgroundSurfaceParams,
  syncMaskSurfaceParams,
  syncMaskShapeParams,
  syncSurfaceParamsForLayer,
  syncRawParams,
  // compileHeroView
  compileHeroView,
  DEFAULT_INTENSITY_PROVIDER,
  createDefaultColorContext,
  // resolvers
  resolveKeyToRgba,
  resolveKeyToCss,
  resolveKeyToOklch,
  resolveSurfaceColorKey,
  getCanvasSurfaceKey,
  getSurfaceKeyForContext,
  oklchToRgba,
  oklchToCss,
  resolveParams,
  resolvePropertyValue,
  compileForegroundLayer,
  compileForegroundElement,
  resolveFontFamily,
  resolveElementColor,
  DEFAULT_FONT_RESOLVER,
} from './Application'

// Re-export ConfigSyncer types
export type {
  SyncBackgroundSurfaceResult,
  SyncMaskSurfaceResult,
  SyncMaskShapeResult,
  SyncSurfaceParamsForLayerResult,
  SyncRawParamsResult,
  EffectRawParams,
} from './Application'

// HeroView Repository types (from Domain)
export type {
  HeroViewRepository,
  HeroViewSubscriber,
  HeroViewUnsubscribe,
} from './Domain'

// HeroView UseCases
export {
  getHeroView,
  setHeroView,
  subscribeHeroView,
  // Layer UseCases
  toggleExpand,
  toggleVisibility,
  addLayer,
  removeLayer,
  updateLayer,
  wrapLayerInGroup,
  wrapLayerWithMask,
  moveLayer,
  moveModifier,
  // Preset UseCases
  applyPreset,
  applyPreset as applyPresetUsecase,
  exportPreset,
  exportPreset as exportPresetUsecase,
  createPreset,
  // TextLayer UseCases
  updateTextLayerText,
  updateTextLayerFont,
  updateTextLayerColor,
  updateTextLayerPosition,
  updateTextLayerRotation,
} from './usecase'

// TextLayer UseCase types
export type {
  UpdateTextLayerFontParams,
  UpdateTextLayerPositionParams,
  TextAnchor,
} from './usecase'

// Preset UseCase types
export type { PresetExportPort, ExportPresetOptions } from './usecase'

// HeroView Infra (re-export from Infra for convenience)
export {
  createHeroViewInMemoryRepository,
} from './Infra'

// Infra
export type { RenderHeroConfigOptions, TextureRendererLike } from './Infra'

export {
  // Preset Repository
  createInMemoryHeroViewPresetRepository,
  DEFAULT_PRESETS,
  // Preset Export
  createBrowserPresetExporter,
  // 3D Object Renderer
  ThreeJsObject3DRenderer,
  createObject3DRenderer,
  // Config-based rendering
  renderHeroConfig,
  // Effect preview utilities
  createEffectSpecsForPreview,
  // Mask preview utilities
  createMaskPreviewConfig,
  // Effect preview utilities (pipeline-based)
  createEffectPreviewConfig,
  // Surface preview utilities
  createSurfacePreviewConfig,
  // Compositor pipeline
  buildPipeline,
  executePipeline,
  renderWithPipeline,
} from './Infra'

// Preview config types
export type { CreateMaskPreviewConfigOptions, CreateEffectPreviewConfigOptions, CreateSurfacePreviewConfigOptions } from './Infra'

// Types (grouped state definitions for useHeroScene)
export type {
  // Custom params types
  CustomMaskShapeParams,
  GradientGrainLinearSurfaceParams,
  GradientGrainCircularSurfaceParams,
  GradientGrainRadialSurfaceParams,
  GradientGrainPerlinSurfaceParams,
  GradientGrainCurlSurfaceParams,
  CustomSurfaceParams,
  CustomBackgroundSurfaceParams,
  SectionType,
  // Mask pattern with normalized config
  MaskPatternWithNormalizedConfig,
  // Grouped state types
  PatternState,
  BackgroundState,
  MaskState,
  FilterState,
  ForegroundState,
  PresetState,
  LayerOperations,
  ImagesState,
  InkColorHelpers,
  CanvasState,
  SerializationState,
  UsecaseState,
  EditorStateRef,
  RendererActions,
  // Helper types
  TextAnchorPosition,
  AddObjectLayerOptions,
  // RightPropertyPanel props types
  RightPanelSelectionProps,
  RightPanelForegroundProps,
  RightPanelBackgroundProps,
  RightPanelMaskProps,
  RightPanelFilterProps,
} from './types'

// Domain - Dependency Extraction & Graph
export {
  extractTrackIdsFromParams,
  extractTrackIdsFromHeroViewConfig,
  extractTrackIdsFromLayers,
  buildDependencyGraph,
  buildDependencyGraphFromLayers,
  getSourcesForTrack,
  hasTrackDependency,
  getAllTrackIds,
  getTrackDependencyCounts,
  groupSourcesByType,
  getLayersWithDependencies,
} from './Domain'

export type {
  DependencySourceType,
  DependencySource,
  TrackDependency,
  DependencyGraph,
} from './Domain'

// Domain - Layer Display Helpers
export {
  getLayerIcon,
  getLayerLabel,
  getDependencySourceIcon,
  getDependencySourceLabel,
} from './Domain'

export type { DisplayLayerVariant } from './Domain'
