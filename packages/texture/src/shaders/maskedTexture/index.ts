/**
 * Masked Texture Shaders
 *
 * マスク形状（circle, rect, blob）とテクスチャパターン（stripe, grid, polkaDot）の
 * 組み合わせシェーダーをエクスポート。
 */

// Types
export type {
  MaskType,
  TextureType,
  CircleMaskConfig,
  RectMaskConfig,
  BlobMaskConfig,
  MaskConfig,
  StripeTextureConfig,
  GridTextureConfig,
  PolkaDotTextureConfig,
  CheckerTextureConfig,
  TextureConfig,
  MaskedTextureParams,
} from './types'

// Circle mask textures
export {
  circleStripeShader,
  circleGridShader,
  circlePolkaDotShader,
  circleCheckerShader,
  createCircleStripeSpec,
  createCircleGridSpec,
  createCirclePolkaDotSpec,
  createCircleCheckerSpec,
  CIRCLE_STRIPE_BUFFER_SIZE,
  CIRCLE_GRID_BUFFER_SIZE,
  CIRCLE_POLKA_DOT_BUFFER_SIZE,
  CIRCLE_CHECKER_BUFFER_SIZE,
} from './circleTextures'

// Rect mask textures
export {
  rectStripeShader,
  rectGridShader,
  rectPolkaDotShader,
  rectCheckerShader,
  createRectStripeSpec,
  createRectGridSpec,
  createRectPolkaDotSpec,
  createRectCheckerSpec,
  RECT_STRIPE_BUFFER_SIZE,
  RECT_GRID_BUFFER_SIZE,
  RECT_POLKA_DOT_BUFFER_SIZE,
  RECT_CHECKER_BUFFER_SIZE,
} from './rectTextures'

// Blob mask textures
export {
  blobStripeShader,
  blobGridShader,
  blobPolkaDotShader,
  blobCheckerShader,
  createBlobStripeSpec,
  createBlobGridSpec,
  createBlobPolkaDotSpec,
  createBlobCheckerSpec,
  BLOB_STRIPE_BUFFER_SIZE,
  BLOB_GRID_BUFFER_SIZE,
  BLOB_POLKA_DOT_BUFFER_SIZE,
  BLOB_CHECKER_BUFFER_SIZE,
} from './blobTextures'

// Pattern functions (for extension)
export { stripePatternFn, gridPatternFn, polkaDotPatternFn, checkerPatternFn } from './patterns'

// Mask SDF functions (for extension)
export { circleMaskFn, rectMaskFn, blobMaskFn, waveUtils } from './masks'
