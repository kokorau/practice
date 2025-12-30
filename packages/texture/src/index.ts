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
  // Filter specs
  createVignetteSpec,
  createChromaticAberrationShader,
  createChromaticAberrationUniforms,
  CHROMATIC_ABERRATION_BUFFER_SIZE,
} from './shaders'

export type {
  VignetteParams,
  ChromaticAberrationParams,
} from './shaders'

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
} from './Domain'

// Application
export type { GetDefaultTexturePatterns, GetDefaultMaskPatterns } from './Application'

// Infra
export { getDefaultTexturePatterns, getDefaultMaskPatterns } from './Infra'
