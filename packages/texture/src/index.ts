// WebGPU 2D Shaders
// テクスチャ生成用のシェーダーをエクスポート

export { TextureRenderer } from './TextureRenderer'
export type {
  SolidTextureParams,
  StripeTextureParams,
  GridTextureParams,
  PolkaDotTextureParams,
  CheckerTextureParams,
} from './shaders'

// Domain
export type { RGBA, TextureRenderOptions, TexturePattern } from './Domain'

// Application
export type { GetDefaultTexturePatterns, GetDefaultMaskPatterns } from './Application'

// Infra
export { getDefaultTexturePatterns, getDefaultMaskPatterns } from './Infra'
