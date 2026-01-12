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
  // Effect types (legacy aliases)
  VignetteFilterConfig,
  ChromaticAberrationFilterConfig,
  DotHalftoneFilterConfig,
  LineHalftoneFilterConfig,
  LayerFilterConfig,
  LayerFilterSchemaMap,
  // Modifier types (new)
  EffectModifier,
  MaskModifier,
  Modifier,
  // Legacy Processor aliases
  EffectProcessor,
  MaskProcessor,
  Processor,
  // Layer & Group types
  Layer,
  Group,
  SceneNode,
  LayerType,
  LayerVariant,
  NodeBase,
  Surface,
  PatternSurface,
  ImageSurface,
  SolidSurface,
  TextConfig,
  Model3DConfig,
  DropPosition,
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
  // Processor config types (JSON serialization)
  ProcessorConfig,
  EffectProcessorConfig,
  MaskProcessorConfig,
  // LayerNodeConfig types (JSON serialization)
  LayerNodeConfig,
  BaseLayerNodeConfig,
  SurfaceLayerNodeConfig,
  TextLayerNodeConfig as TextLayerNodeConfigType,
  Model3DLayerNodeConfig,
  ImageLayerNodeConfig as ImageLayerNodeConfigType,
  GroupLayerNodeConfig,
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
  migrateVignetteConfig,
  // Effect Schemas (legacy aliases)
  VignetteFilterSchema,
  ChromaticAberrationFilterSchema,
  DotHalftoneFilterSchema,
  LineHalftoneFilterSchema,
  LayerFilterSchemas,
  createDefaultVignetteConfig,
  createDefaultChromaticAberrationConfig,
  createDefaultDotHalftoneConfig,
  createDefaultLineHalftoneConfig,
  createDefaultFilterConfig,
  createDefaultShapeVignetteConfig,
  // Modifier factories (new)
  createEffectPlaceholder,
  createMaskModifier,
  isEffectModifier,
  isMaskModifier,
  getEffectPlaceholders,
  getEnabledMasks,
  // Legacy Processor factories (deprecated)
  createEffectProcessor,
  createMaskProcessor,
  isEffectProcessor,
  isMaskProcessor,
  getEnabledEffects,
  // Layer & Group factories
  createLayer,
  createBaseLayer,
  createSurfaceLayer,
  createSceneTextLayer,
  createModel3DLayer,
  createSceneImageLayer,
  createGroup,
  isLayer,
  isGroup,
  isBaseLayer,
  isSurfaceLayer,
  isTextLayer,
  isModel3DLayer,
  isImageLayer,
  findNode,
  updateNode,
  removeNode,
  flattenNodes,
  findParentNode,
  wrapNodeInGroup,
  // DnD move utilities
  canMoveSceneNode,
  moveSceneNode,
  // Scene layer ID mapping
  SCENE_LAYER_IDS,
  getSceneLayerId,
  // Layer factories
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
} from './Domain'

// Application
export type {
  TextTextureInfo,
  TextTexturePort,
  LayerRenderResult,
  LayerRendererPort,
  HeroSceneUseCaseDeps,
  // 3D Object Renderer
  Object3DRendererPort,
  Object3DRenderParams,
  LightingConfig,
  // Editor State types
  EditorTextureLayerConfig,
  EditorClipGroupLayerConfig,
  EditorImageLayerConfig,
  EditorTextLayerConfig,
  EditorCanvasLayerConfig,
  EditorCanvasLayer,
  HeroSceneEditorState,
  // Compile types
  MidgroundTexturePattern,
  PatternMaps,
  CompileColors,
  CompileOptions,
  // Preset types
  HeroViewPresetRepository,
  GetHeroViewPresetsUseCase,
  // ForegroundElement UseCase types
  ForegroundElementUpdate,
  ForegroundConfigPort,
  SelectionPort,
  ForegroundElementUsecase,
  ForegroundElementUsecaseDeps,
  // Usecase types
  BackgroundSurfaceUsecase,
  BackgroundSurfaceUsecaseDeps,
  ImageUploadPort,
  SurfaceParamsUpdate,
  MaskUsecase,
  MaskUsecaseDeps,
  MaskShapeParamsUpdate,
  LayerUpdate,
} from './Application'

export {
  HeroSceneUseCase,
  createHeroSceneUseCase,
  createHeroSceneEditorState,
  compileHeroScene,
  // Preset UseCase
  createGetHeroViewPresetsUseCase,
  // ForegroundElement UseCase
  createForegroundElementUsecase,
  // Usecases
  createBackgroundSurfaceUsecase,
  createMaskUsecase,
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
  // Color UseCases
  updateBrandColor,
  updateAccentColor,
  updateFoundationColor,
  applyColorPreset,
  type UpdateBrandColorParams,
  type UpdateAccentColorParams,
  type UpdateFoundationColorParams,
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
export type { TextTextureRendererConfig, HeroSceneRendererDeps, RenderHeroConfigOptions, TextureRendererLike } from './Infra'

export {
  TextTextureRenderer,
  createTextTextureRenderer,
  HeroSceneRenderer,
  createHeroSceneRenderer,
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
