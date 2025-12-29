// WebGPU 2D Shaders
// テクスチャ生成用のシェーダーをエクスポート

export { TextureRenderer } from './TextureRenderer'

// Shader types and createSpec functions
export type {
  SolidTextureParams,
  StripeTextureParams,
  GridTextureParams,
  PolkaDotTextureParams,
  CheckerTextureParams,
  CircleMaskParams,
  RectMaskParams,
  HalfMaskParams,
  HalfMaskDirection,
  BlobMaskParams,
} from './shaders'

export {
  createSolidSpec,
  createStripeSpec,
  createGridSpec,
  createPolkaDotSpec,
  createCheckerSpec,
  createCircleMaskSpec,
  createRectMaskSpec,
  createHalfMaskSpec,
  createBlobMaskSpec,
} from './shaders'

// Domain
export type {
  RGBA,
  TextureRenderOptions,
  Viewport,
  TexturePattern,
  TextureRenderSpec,
} from './Domain'

// Application
export type { GetDefaultTexturePatterns, GetDefaultMaskPatterns } from './Application'

// Infra
export { getDefaultTexturePatterns, getDefaultMaskPatterns } from './Infra'
