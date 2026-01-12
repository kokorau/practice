// WebGPU 2D Shaders
// テクスチャ生成用のシェーダーをエクスポート

export { TextureRenderer, type PostEffectSpec } from './TextureRenderer'

// Shader types and createSpec functions
export type {
  SolidTextureParams,
  StripeTextureParams,
  GridTextureParams,
  PolkaDotTextureParams,
  CheckerTextureParams,
  TriangleTextureParams,
  HexagonTextureParams,
  CircleMaskParams,
  RectMaskParams,
  BlobMaskParams,
  PerlinMaskParams,
  LinearGradientMaskParams,
  // Masked texture types
  MaskType,
  TextureType,
  CircleMaskConfig,
  RectMaskConfig,
  BlobMaskConfig,
  PerlinMaskConfig,
  MaskConfig,
  StripeTextureConfig,
  GridTextureConfig,
  PolkaDotTextureConfig,
  CheckerTextureConfig,
  TextureConfig,
  MaskedTextureParams,
  GradientGrainTextureConfig,
  // Gradient types
  LinearGradientParams,
  ColorStop,
  GradientGrainParams,
  LinearDepthMapParams,
  CircularDepthMapParams,
  RadialDepthMapParams,
  PerlinDepthMapParams,
  NoiseMapParams,
  GradientNoiseMapParams,
  IntensityCurveParams,
  DepthMapType,
  // Clip mask types
  ClipMaskBaseParams,
  CircleClipParams,
  RectClipParams,
  BlobClipParams,
  PerlinClipParams,
  LinearGradientClipParams,
  ClipMaskParams,
} from './shaders'

export {
  createSolidSpec,
  createStripeSpec,
  createGridSpec,
  createPolkaDotSpec,
  createCheckerSpec,
  createTriangleSpec,
  createHexagonSpec,
  // Textile pattern specs
  createAsanohaSpec,
  createSeigaihaSpec,
  createWaveSpec,
  createScalesSpec,
  createOgeeSpec,
  createSunburstSpec,
  createCircleMaskSpec,
  createRectMaskSpec,
  createBlobMaskSpec,
  createPerlinMaskSpec,
  createLinearGradientMaskSpec,
  // Masked texture specs
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
  // Gradient specs
  createLinearGradientSpec,
  createGradientGrainSpec,
  createLinearDepthMapSpec,
  createCircularDepthMapSpec,
  createRadialDepthMapSpec,
  createPerlinDepthMapSpec,
  createNoiseMapSpec,
  createGradientNoiseMapSpec,
  createIntensityCurveSpec,
  // Clip mask specs
  createCircleClipSpec,
  createRectClipSpec,
  createBlobClipSpec,
  createPerlinClipSpec,
  createLinearGradientClipSpec,
  createClipMaskSpec,
} from './shaders'

// Filter specs are now available via '@practice/texture/filters'
// import { vignetteShader, createVignetteUniforms, chromaticAberrationShader } from '@practice/texture/filters'

// Domain
export type {
  RGBA,
  TextureRenderOptions,
  Viewport,
  TexturePattern,
  TextureRenderSpec,
  MaskShapeType,
  CircleMaskShapeConfig,
  RectMaskShapeConfig,
  BlobMaskShapeConfig,
  PerlinMaskShapeConfig,
  LinearGradientMaskShapeConfig,
  MaskShapeConfig,
  MaskPattern,
  // Surface Presets
  SurfacePresetType,
  SolidPresetParams,
  StripePresetParams,
  GridPresetParams,
  PolkaDotPresetParams,
  CheckerPresetParams,
  GradientGrainPresetParams,
  TrianglePresetParams,
  HexagonPresetParams,
  SurfacePresetParams,
  SurfacePreset,
  // TexturePatternSpec types
  TexturePatternSpec,
  TexturePatternParams,
  SimpleTexturePatternParams,
  MaskPatternParams,
  MaskedTexturePatternParams,
  FilterPatternParams,
  SolidPatternParams,
  StripePatternParams,
  GridPatternParams,
  PolkaDotPatternParams,
  CircleMaskPatternParams,
  RectMaskPatternParams,
  CircleStripePatternParams,
  CircleGridPatternParams,
  CirclePolkaDotPatternParams,
  RectStripePatternParams,
  RectGridPatternParams,
  RectPolkaDotPatternParams,
  BlobStripePatternParams,
  BlobGridPatternParams,
  BlobPolkaDotPatternParams,
  VignettePatternParams,
  ChromaticAberrationPatternParams,
  // Schema param types
  CircleMaskShapeParams,
  RectMaskShapeParams,
  BlobMaskShapeParams,
  PerlinMaskShapeParams,
  LinearGradientMaskShapeParams,
  SolidSurfaceParams,
  StripeSurfaceParams,
  GridSurfaceParams,
  PolkaDotSurfaceParams,
  CheckerSurfaceParams,
  TriangleSurfaceParams,
  HexagonSurfaceParams,
} from './Domain'

// Shape and Surface Schemas
export {
  // Shape Schemas
  CircleMaskShapeSchema,
  RectMaskShapeSchema,
  BlobMaskShapeSchema,
  PerlinMaskShapeSchema,
  MaskShapeSchemas,
  // Surface Schemas
  SolidSurfaceSchema,
  StripeSurfaceSchema,
  GridSurfaceSchema,
  PolkaDotSurfaceSchema,
  CheckerSurfaceSchema,
  GradientGrainSurfaceSchema,
  SurfaceSchemas,
  // Constants
  DEFAULT_GRADIENT_GRAIN_CURVE_POINTS,
  // Factory functions
  createDefaultCircleMaskParams,
  createDefaultRectMaskParams,
  createDefaultBlobMaskParams,
  createDefaultPerlinMaskParams,
  createDefaultSolidParams,
  createDefaultStripeParams,
  createDefaultGridParams,
  createDefaultPolkaDotParams,
  createDefaultCheckerParams,
  createDefaultGradientGrainParams,
} from './Domain'

// Application
export type { GetDefaultTexturePatterns, GetDefaultMaskPatterns, GetSurfacePresets } from './Application'
export {
  createUniforms,
  createTexturePatternSpec,
  createTexturePatternFromPreset,
  createTexturePatternsFromPresets,
} from './Application'

// Infra
export { getDefaultTexturePatterns, getDefaultMaskPatterns, getSurfacePresets } from './Infra'

// Text rendering
export { renderTextToBitmap, type TextRenderOptions, type TextRenderResult } from './text/renderTextToCanvas'
export { createPositionedImageSpec, anchorToNumbers, type PositionedImageParams } from './shaders'
