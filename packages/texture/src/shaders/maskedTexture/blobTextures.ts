/**
 * Blob Mask + Texture Shaders
 *
 * Blob形状マスクと各種テクスチャパターンの組み合わせ。
 */

import { fullscreenVertex, aaUtils, maskBlendState } from '../common'
import { stripePatternFn, gridPatternFn, polkaDotPatternFn, checkerPatternFn } from './patterns'
import { waveUtils, blobMaskFn } from './masks'
import type { TextureRenderSpec, Viewport } from '../../Domain'
import type { BlobMaskConfig, StripeTextureConfig, GridTextureConfig, PolkaDotTextureConfig, CheckerTextureConfig } from './types'

type RGBA = [number, number, number, number]

// ============================================================
// Buffer Sizes
// ============================================================

export const BLOB_STRIPE_BUFFER_SIZE = 96  // 80 -> 96 (added cutout + padding)
export const BLOB_GRID_BUFFER_SIZE = 80
export const BLOB_POLKA_DOT_BUFFER_SIZE = 96  // 80 -> 96 (added cutout + padding)
export const BLOB_CHECKER_BUFFER_SIZE = 80

// ============================================================
// Shaders
// ============================================================

/** Blob mask + stripe texture shader */
export const blobStripeShader = /* wgsl */ `
${fullscreenVertex}

${aaUtils}

${stripePatternFn}

${waveUtils}

${blobMaskFn}

struct Params {
  color1: vec4f,
  color2: vec4f,
  // mask params
  maskCenterX: f32,
  maskCenterY: f32,
  maskBaseRadius: f32,
  maskAmplitude: f32,
  maskOctaves: u32,
  maskSeed: f32,
  aspectRatio: f32,
  // texture params
  stripeWidth1: f32,
  stripeWidth2: f32,
  stripeAngle: f32,
  // viewport
  viewportWidth: f32,
  viewportHeight: f32,
  cutout: f32,
  _padding: f32,
}

@group(0) @binding(0) var<uniform> params: Params;

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = vec2f(pos.x / params.viewportWidth, pos.y / params.viewportHeight);

  let sdf = blobMaskSDF(uv, params.maskCenterX, params.maskCenterY, params.maskBaseRadius, params.maskAmplitude, params.maskOctaves, params.maskSeed, params.aspectRatio);
  let pixelSize = 1.0 / min(params.viewportWidth, params.viewportHeight);
  let rawMaskAlpha = smoothstep(-pixelSize, pixelSize, sdf);
  let maskAlpha = mix(1.0 - rawMaskAlpha, rawMaskAlpha, params.cutout);

  let textureColor = stripePattern(pos.xy, params.color1, params.color2, params.stripeWidth1, params.stripeWidth2, params.stripeAngle);

  return vec4f(textureColor.rgb, textureColor.a * maskAlpha);
}
`

/** Blob mask + grid texture shader */
export const blobGridShader = /* wgsl */ `
${fullscreenVertex}

${aaUtils}

${gridPatternFn}

${waveUtils}

${blobMaskFn}

struct Params {
  color1: vec4f,
  color2: vec4f,
  // mask params
  maskCenterX: f32,
  maskCenterY: f32,
  maskBaseRadius: f32,
  maskAmplitude: f32,
  maskOctaves: u32,
  maskSeed: f32,
  aspectRatio: f32,
  // texture params
  gridLineWidth: f32,
  gridCellSize: f32,
  // viewport
  viewportWidth: f32,
  viewportHeight: f32,
  cutout: f32,
}

@group(0) @binding(0) var<uniform> params: Params;

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = vec2f(pos.x / params.viewportWidth, pos.y / params.viewportHeight);

  let sdf = blobMaskSDF(uv, params.maskCenterX, params.maskCenterY, params.maskBaseRadius, params.maskAmplitude, params.maskOctaves, params.maskSeed, params.aspectRatio);
  let pixelSize = 1.0 / min(params.viewportWidth, params.viewportHeight);
  let rawMaskAlpha = smoothstep(-pixelSize, pixelSize, sdf);
  let maskAlpha = mix(1.0 - rawMaskAlpha, rawMaskAlpha, params.cutout);

  let textureColor = gridPattern(pos.xy, params.color1, params.color2, params.gridLineWidth, params.gridCellSize);

  return vec4f(textureColor.rgb, textureColor.a * maskAlpha);
}
`

/** Blob mask + polka dot texture shader */
export const blobPolkaDotShader = /* wgsl */ `
${fullscreenVertex}

${aaUtils}

${polkaDotPatternFn}

${waveUtils}

${blobMaskFn}

struct Params {
  color1: vec4f,
  color2: vec4f,
  // mask params
  maskCenterX: f32,
  maskCenterY: f32,
  maskBaseRadius: f32,
  maskAmplitude: f32,
  maskOctaves: u32,
  maskSeed: f32,
  aspectRatio: f32,
  // texture params
  dotRadius: f32,
  dotSpacing: f32,
  dotRowOffset: f32,
  // viewport
  viewportWidth: f32,
  viewportHeight: f32,
  cutout: f32,
  _padding: f32,
}

@group(0) @binding(0) var<uniform> params: Params;

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = vec2f(pos.x / params.viewportWidth, pos.y / params.viewportHeight);

  let sdf = blobMaskSDF(uv, params.maskCenterX, params.maskCenterY, params.maskBaseRadius, params.maskAmplitude, params.maskOctaves, params.maskSeed, params.aspectRatio);
  let pixelSize = 1.0 / min(params.viewportWidth, params.viewportHeight);
  let rawMaskAlpha = smoothstep(-pixelSize, pixelSize, sdf);
  let maskAlpha = mix(1.0 - rawMaskAlpha, rawMaskAlpha, params.cutout);

  let textureColor = polkaDotPattern(pos.xy, params.color1, params.color2, params.dotRadius, params.dotSpacing, params.dotRowOffset);

  return vec4f(textureColor.rgb, textureColor.a * maskAlpha);
}
`

// ============================================================
// Spec Creation Functions
// ============================================================

/** Create spec for blob mask + stripe texture */
export function createBlobStripeSpec(
  color1: RGBA,
  color2: RGBA,
  mask: BlobMaskConfig,
  texture: StripeTextureConfig,
  viewport: Viewport
): TextureRenderSpec {
  const aspectRatio = viewport.width / viewport.height
  const cutout = mask.cutout ?? true
  const data = new ArrayBuffer(BLOB_STRIPE_BUFFER_SIZE)
  const floatView = new Float32Array(data)
  const uintView = new Uint32Array(data)

  floatView[0] = color1[0]
  floatView[1] = color1[1]
  floatView[2] = color1[2]
  floatView[3] = color1[3]
  floatView[4] = color2[0]
  floatView[5] = color2[1]
  floatView[6] = color2[2]
  floatView[7] = color2[3]
  floatView[8] = mask.centerX
  floatView[9] = mask.centerY
  floatView[10] = mask.baseRadius
  floatView[11] = mask.amplitude
  uintView[12] = mask.octaves
  floatView[13] = mask.seed
  floatView[14] = aspectRatio
  floatView[15] = texture.width1
  floatView[16] = texture.width2
  floatView[17] = texture.angle
  floatView[18] = viewport.width
  floatView[19] = viewport.height
  floatView[20] = cutout ? 1.0 : 0.0
  floatView[21] = 0 // padding

  return {
    shader: blobStripeShader,
    uniforms: data,
    bufferSize: BLOB_STRIPE_BUFFER_SIZE,
    blend: maskBlendState,
  }
}

/** Create spec for blob mask + grid texture */
export function createBlobGridSpec(
  color1: RGBA,
  color2: RGBA,
  mask: BlobMaskConfig,
  texture: GridTextureConfig,
  viewport: Viewport
): TextureRenderSpec {
  const aspectRatio = viewport.width / viewport.height
  const cutout = mask.cutout ?? true
  const data = new ArrayBuffer(BLOB_GRID_BUFFER_SIZE)
  const floatView = new Float32Array(data)
  const uintView = new Uint32Array(data)

  floatView[0] = color1[0]
  floatView[1] = color1[1]
  floatView[2] = color1[2]
  floatView[3] = color1[3]
  floatView[4] = color2[0]
  floatView[5] = color2[1]
  floatView[6] = color2[2]
  floatView[7] = color2[3]
  floatView[8] = mask.centerX
  floatView[9] = mask.centerY
  floatView[10] = mask.baseRadius
  floatView[11] = mask.amplitude
  uintView[12] = mask.octaves
  floatView[13] = mask.seed
  floatView[14] = aspectRatio
  floatView[15] = texture.lineWidth
  floatView[16] = texture.cellSize
  floatView[17] = viewport.width
  floatView[18] = viewport.height
  floatView[19] = cutout ? 1.0 : 0.0

  return {
    shader: blobGridShader,
    uniforms: data,
    bufferSize: BLOB_GRID_BUFFER_SIZE,
    blend: maskBlendState,
  }
}

/** Create spec for blob mask + polka dot texture */
export function createBlobPolkaDotSpec(
  color1: RGBA,
  color2: RGBA,
  mask: BlobMaskConfig,
  texture: PolkaDotTextureConfig,
  viewport: Viewport
): TextureRenderSpec {
  const aspectRatio = viewport.width / viewport.height
  const cutout = mask.cutout ?? true
  const data = new ArrayBuffer(BLOB_POLKA_DOT_BUFFER_SIZE)
  const floatView = new Float32Array(data)
  const uintView = new Uint32Array(data)

  floatView[0] = color1[0]
  floatView[1] = color1[1]
  floatView[2] = color1[2]
  floatView[3] = color1[3]
  floatView[4] = color2[0]
  floatView[5] = color2[1]
  floatView[6] = color2[2]
  floatView[7] = color2[3]
  floatView[8] = mask.centerX
  floatView[9] = mask.centerY
  floatView[10] = mask.baseRadius
  floatView[11] = mask.amplitude
  uintView[12] = mask.octaves
  floatView[13] = mask.seed
  floatView[14] = aspectRatio
  floatView[15] = texture.dotRadius
  floatView[16] = texture.spacing
  floatView[17] = texture.rowOffset
  floatView[18] = viewport.width
  floatView[19] = viewport.height
  floatView[20] = cutout ? 1.0 : 0.0
  floatView[21] = 0 // padding

  return {
    shader: blobPolkaDotShader,
    uniforms: data,
    bufferSize: BLOB_POLKA_DOT_BUFFER_SIZE,
    blend: maskBlendState,
  }
}

/** Blob mask + checker texture shader */
export const blobCheckerShader = /* wgsl */ `
${fullscreenVertex}

${aaUtils}

${checkerPatternFn}

${waveUtils}

${blobMaskFn}

struct Params {
  color1: vec4f,
  color2: vec4f,
  // mask params
  maskCenterX: f32,
  maskCenterY: f32,
  maskBaseRadius: f32,
  maskAmplitude: f32,
  maskOctaves: u32,
  maskSeed: f32,
  aspectRatio: f32,
  // texture params
  cellSize: f32,
  angle: f32,
  // viewport
  viewportWidth: f32,
  viewportHeight: f32,
  cutout: f32,
}

@group(0) @binding(0) var<uniform> params: Params;

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = vec2f(pos.x / params.viewportWidth, pos.y / params.viewportHeight);

  let sdf = blobMaskSDF(uv, params.maskCenterX, params.maskCenterY, params.maskBaseRadius, params.maskAmplitude, params.maskOctaves, params.maskSeed, params.aspectRatio);
  let pixelSize = 1.0 / min(params.viewportWidth, params.viewportHeight);
  let rawMaskAlpha = smoothstep(-pixelSize, pixelSize, sdf);
  let maskAlpha = mix(1.0 - rawMaskAlpha, rawMaskAlpha, params.cutout);

  let textureColor = checkerPattern(pos.xy, params.color1, params.color2, params.cellSize, params.angle);

  return vec4f(textureColor.rgb, textureColor.a * maskAlpha);
}
`

/** Create spec for blob mask + checker texture */
export function createBlobCheckerSpec(
  color1: RGBA,
  color2: RGBA,
  mask: BlobMaskConfig,
  texture: CheckerTextureConfig,
  viewport: Viewport
): TextureRenderSpec {
  const aspectRatio = viewport.width / viewport.height
  const cutout = mask.cutout ?? true
  const data = new ArrayBuffer(BLOB_CHECKER_BUFFER_SIZE)
  const floatView = new Float32Array(data)
  const uintView = new Uint32Array(data)

  floatView[0] = color1[0]
  floatView[1] = color1[1]
  floatView[2] = color1[2]
  floatView[3] = color1[3]
  floatView[4] = color2[0]
  floatView[5] = color2[1]
  floatView[6] = color2[2]
  floatView[7] = color2[3]
  floatView[8] = mask.centerX
  floatView[9] = mask.centerY
  floatView[10] = mask.baseRadius
  floatView[11] = mask.amplitude
  uintView[12] = mask.octaves
  floatView[13] = mask.seed
  floatView[14] = aspectRatio
  floatView[15] = texture.cellSize
  floatView[16] = texture.angle
  floatView[17] = viewport.width
  floatView[18] = viewport.height
  floatView[19] = cutout ? 1.0 : 0.0

  return {
    shader: blobCheckerShader,
    uniforms: data,
    bufferSize: BLOB_CHECKER_BUFFER_SIZE,
    blend: maskBlendState,
  }
}
