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
  CircleMaskParams,
  RectMaskParams,
  BlobMaskParams,
  // Masked texture types
  MaskType,
  TextureType,
  CircleMaskConfig,
  RectMaskConfig,
  BlobMaskConfig,
  MaskConfig,
  StripeTextureConfig,
  GridTextureConfig,
  PolkaDotTextureConfig,
  TextureConfig,
  MaskedTextureParams,
} from './shaders'

export {
  createSolidSpec,
  createStripeSpec,
  createGridSpec,
  createPolkaDotSpec,
  createCheckerSpec,
  createCircleMaskSpec,
  createRectMaskSpec,
  createBlobMaskSpec,
  // Masked texture specs
  createCircleStripeSpec,
  createCircleGridSpec,
  createCirclePolkaDotSpec,
  createRectStripeSpec,
  createRectGridSpec,
  createRectPolkaDotSpec,
  createBlobStripeSpec,
  createBlobGridSpec,
  createBlobPolkaDotSpec,
} from './shaders'

// Filter specs are now available via '@practice/texture/filters'
// import { createVignetteSpec, createChromaticAberrationShader } from '@practice/texture/filters'

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
  MaskShapeConfig,
  MaskPattern,
  // Surface Presets
  SurfacePresetType,
  SolidPresetParams,
  StripePresetParams,
  GridPresetParams,
  PolkaDotPresetParams,
  CheckerPresetParams,
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
