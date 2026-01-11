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
  LayerEffectConfig,
  LayerEffectSchemaMap,
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
  // Layer & Group types (new)
  Layer,
  Group,
  SceneNode,
  LayerType,
  LayerVariant,
  NodeBase,
  Surface,
  PatternSurface,
  TextConfig,
  Model3DConfig,
  // Legacy LayerNode aliases
  LayerNodeType,
  LayerNodeBase,
  BaseLayerNode,
  GroupLayerNode,
  SurfaceLayerNode,
  ObjectLayerNode as ObjectLayerNodeType,
  TextLayerNode,
  LayerNode,
  SurfaceConfig,
  TexturePatternSurface,
  ImageSurface,
  SolidSurface,
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
} from './Domain'

export {
  // Effect Schemas (new)
  VignetteEffectSchema,
  ChromaticAberrationEffectSchema,
  DotHalftoneEffectSchema,
  LineHalftoneEffectSchema,
  LayerEffectSchemas,
  createDefaultEffectConfig,
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
  // Modifier factories (new)
  createEffectModifier,
  createMaskModifier,
  isEffectModifier,
  isMaskModifier,
  getEnabledEffects,
  getEnabledMasks,
  // Legacy Processor factories
  createEffectProcessor,
  createMaskProcessor,
  isEffectProcessor,
  isMaskProcessor,
  // Layer & Group factories (new)
  createLayer,
  createBaseLayer,
  createSurfaceLayer,
  createTextLayer as createSceneTextLayer,
  createModel3DLayer,
  createImageLayer as createSceneImageLayer,
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
  isAncestorOf,
  insertNode,
  moveNode,
  // Legacy LayerNode factories
  createBaseLayerNode,
  createGroupLayerNode,
  createSurfaceLayerNode,
  createTextLayerNode,
  createModel3DLayerNode,
  createImageLayerNode,
  createObjectLayerNode,
  isBaseLayerNode,
  isGroupLayerNode,
  isSurfaceLayerNode,
  isTextLayerNode,
  isModel3DLayerNode,
  isImageLayerNode,
  isObjectLayerNode,
  findLayerNode,
  updateLayerNode,
  removeLayerNode,
  flattenLayerNodes,
  insertLayerNode,
  moveLayerNode,
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
} from './usecase'

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
  // 3D Object Renderer
  ThreeJsObject3DRenderer,
  createObject3DRenderer,
  // Config-based rendering
  renderHeroConfig,
} from './Infra'
