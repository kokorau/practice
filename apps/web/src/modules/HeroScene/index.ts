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
  ViewportConfig,
  StripeSurfaceConfig,
  GridSurfaceConfig,
  PolkaDotSurfaceConfig,
  CheckerSurfaceConfig,
  SolidSurfaceConfig,
  ImageSurfaceConfig,
  HeroSurfaceConfig,
  HeroCircleMaskShapeConfig,
  HeroRectMaskShapeConfig,
  HeroBlobMaskShapeConfig,
  HeroPerlinMaskShapeConfig,
  MaskShapeConfig,
  HeroMaskShapeConfig,
  // Normalized config types (Phase 12)
  SurfaceType,
  NormalizedSurfaceConfig,
  AnySurfaceConfig,
  MaskShapeTypeId,
  NormalizedMaskConfig,
  AnyMaskConfig,
  // Processor config types (JSON serialization)
  ProcessorConfig,
  EffectProcessorConfig,
  EffectFilterConfig,
  SingleEffectConfig,
  AnyEffectConfig,
  MaskProcessorConfig,
  // LayerNodeConfig types (JSON serialization)
  LayerNodeConfig,
  BaseLayerNodeConfig,
  SurfaceLayerNodeConfig,
  SurfaceColorsConfig,
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
  // Legacy types (deprecated)
  BackgroundSurfaceConfig,
  MaskSurfaceConfig,
  BackgroundLayerConfig,
  MaskLayerConfig,
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
} from './Domain'

export {
  // Effect Schemas (new)
  VignetteEffectSchema,
  ChromaticAberrationEffectSchema,
  DotHalftoneEffectSchema,
  LineHalftoneEffectSchema,
  BlurEffectSchema,
  LayerEffectSchemas,
  createDefaultEffectConfig,
  createDefaultBlurConfig,
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
  // LayerTreeOps - Tree operations
  findLayerInTree,
  updateLayerInTree,
  removeLayerFromTree,
  findParentLayerInTree,
  moveLayerInTree,
  canMoveLayerInTree,
  wrapLayerInGroupInTree,
  flattenLayersInTree,
  insertLayerInTree,
  createGroupLayerConfig,
  // LayerTreeOps - Modifier operations
  canMoveModifierInTree,
  moveModifierInTree,
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
  createDefaultEffectProcessorConfig,
  createDefaultHeroViewConfig,
  // ReverseLookup utilities
  approxEqual,
  findSurfacePresetIndex,
  findMaskPatternIndex,
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
  // Layer helpers
  getLayerFilters,
  // Effect config type guards
  isSingleEffectConfig,
  isLegacyEffectFilterConfig,
  // Effect config migration
  migrateLegacyEffectConfig,
  toLegacyEffectConfig,
  hasLegacyEffectConfigs,
  migrateEffectConfigsInModifiers,
  getEffectConfigsFromModifiers,
  // Surface config normalization (Phase 12)
  SURFACE_TYPES,
  isNormalizedSurfaceConfig,
  isLegacyTypeSurfaceConfig,
  normalizeSurfaceConfig,
  denormalizeSurfaceConfig,
  getSurfaceAsNormalized,
  getSurfaceAsLegacy,
  // Mask config normalization (Phase 12)
  MASK_SHAPE_TYPE_IDS,
  isNormalizedMaskConfig,
  isLegacyTypeMaskConfig,
  normalizeMaskConfig,
  denormalizeMaskConfig,
  getMaskAsNormalized,
  getMaskAsLegacy,
  // Full config migration (Phase 13)
  migrateHeroViewConfig,
  configNeedsMigration,
  // Default colors for surface layers (palette keys for layer config)
  DEFAULT_LAYER_BACKGROUND_COLORS,
  DEFAULT_LAYER_MASK_COLORS,
  // HeroEditorState factories
  createDefaultBackgroundUIState,
  createDefaultMaskUIState,
  createDefaultFilterUIState,
  createDefaultForegroundUIState,
  createDefaultPresetUIState,
  createDefaultHeroEditorUIState,
  isValidEditorSection,
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
  LayerUpdate,
  // Unified Surface Usecase types
  SurfaceUsecase,
  SurfaceUsecaseDeps,
  SurfaceSelectionPort,
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
  // ConfigSyncer
  syncBackgroundSurfaceParams,
  syncMaskSurfaceParams,
} from './Application'

// Re-export ConfigSyncer types
export type { SyncBackgroundSurfaceResult, SyncMaskSurfaceResult } from './Application'

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
  // Preset UseCases
  applyPreset,
  applyPreset as applyPresetUsecase,
  exportPreset,
  exportPreset as exportPresetUsecase,
  createPreset,
  // Filter UseCases (new generic functions)
  selectFilterType,
  getFilterType,
  updateEffectParams,
  getEffectParams,
  // Filter UseCases (legacy aliases)
  updateVignetteParams,
  updateChromaticAberrationParams,
  updateDotHalftoneParams,
  updateLineHalftoneParams,
  updateBlurParams,
  getVignetteParams,
  getChromaticAberrationParams,
  getDotHalftoneParams,
  getLineHalftoneParams,
  getBlurParams,
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
  // Preset Export
  createBrowserPresetExporter,
  // 3D Object Renderer
  ThreeJsObject3DRenderer,
  createObject3DRenderer,
  // Config-based rendering
  renderHeroConfig,
  // ImageUpload Adapter
  createUnsplashImageUploadAdapter,
} from './Infra'

// Types (grouped state definitions for useHeroScene)
export type {
  // Custom params types
  CustomMaskShapeParams,
  GradientGrainSurfaceParams,
  CustomSurfaceParams,
  CustomBackgroundSurfaceParams,
  SectionType,
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
