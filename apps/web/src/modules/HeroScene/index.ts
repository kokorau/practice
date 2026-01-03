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
  MaskedTextureLayerConfig,
  ImageLayerConfig,
  TextLayerConfig,
  CanvasLayerConfig,
  CanvasLayer,
  BlendMode,
  VignetteFilterConfig,
  ChromaticAberrationFilterConfig,
  DotHalftoneFilterConfig,
  LineHalftoneFilterConfig,
  LayerFilterConfig,
  LayerFilterSchemaMap,
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
  BackgroundSurfaceConfig,
  MaskSurfaceConfig,
  HeroCircleMaskShapeConfig,
  HeroRectMaskShapeConfig,
  HeroBlobMaskShapeConfig,
  HeroMaskShapeConfig,
  BackgroundLayerConfig,
  MaskLayerConfig,
  GridPosition,
  ForegroundElementConfig,
  ForegroundLayerConfig,
  HeroViewConfig,
  // HeroViewPreset types
  HeroViewPreset,
} from './Domain'

export {
  // Filter Schemas
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
  // Layer factories
  createCanvasLayer,
  createTextureLayer,
  createMaskedTextureLayer,
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
} from './Domain'

// Application
export type {
  TextTextureInfo,
  TextTexturePort,
  LayerRenderResult,
  LayerRendererPort,
  HeroSceneUseCaseDeps,
  // Editor State types
  EditorTextureLayerConfig,
  EditorMaskedTextureLayerConfig,
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
} from './Infra'
