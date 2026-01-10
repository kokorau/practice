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
  // Processor types (new)
  EffectProcessor,
  MaskProcessor,
  Processor,
  // LayerNode types (new)
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
  // Processor factories (new)
  createEffectProcessor,
  createMaskProcessor,
  isEffectProcessor,
  isMaskProcessor,
  getEnabledEffects,
  getEnabledMasks,
  // LayerNode factories (new)
  createBaseLayerNode,
  createGroupLayerNode,
  createSurfaceLayerNode,
  createTextLayerNode,
  createObjectLayerNode,
  isBaseLayerNode,
  isGroupLayerNode,
  isSurfaceLayerNode,
  isTextLayerNode,
  isObjectLayerNode,
  findLayerNode,
  updateLayerNode,
  removeLayerNode,
  flattenLayerNodes,
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
} from './Application'

export {
  HeroSceneUseCase,
  createHeroSceneUseCase,
  createHeroSceneEditorState,
  compileHeroScene,
  // Preset UseCase
  createGetHeroViewPresetsUseCase,
} from './Application'

// Infra
export type { TextTextureRendererConfig, HeroSceneRendererDeps } from './Infra'

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
} from './Infra'
