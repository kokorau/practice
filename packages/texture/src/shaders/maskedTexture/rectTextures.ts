/**
 * Rect Mask + Texture Shaders
 *
 * 長方形マスクと各種テクスチャパターンの組み合わせ。
 */

import { fullscreenVertex, aaUtils, maskBlendState, oklabUtils } from '../common'
import { stripePatternFn, gridPatternFn, polkaDotPatternFn, checkerPatternFn } from './patterns'
import { rectMaskFn } from './masks'
import type { TextureRenderSpec, Viewport } from '../../Domain'
import type { RectMaskConfig, StripeTextureConfig, GridTextureConfig, PolkaDotTextureConfig, CheckerTextureConfig } from './types'

type RGBA = [number, number, number, number]

// ============================================================
// Buffer Sizes
// ============================================================

export const RECT_STRIPE_BUFFER_SIZE = 96
export const RECT_GRID_BUFFER_SIZE = 96
export const RECT_POLKA_DOT_BUFFER_SIZE = 96
export const RECT_CHECKER_BUFFER_SIZE = 96

// ============================================================
// Shaders
// ============================================================

/** Rect mask + stripe texture shader */
export const rectStripeShader = /* wgsl */ `
${fullscreenVertex}

${aaUtils}

${oklabUtils}

${stripePatternFn}

${rectMaskFn}

struct Params {
  color1: vec4f,
  color2: vec4f,
  // mask params
  maskLeft: f32,
  maskRight: f32,
  maskTop: f32,
  maskBottom: f32,
  maskRadiusTL: f32,
  maskRadiusTR: f32,
  maskRadiusBL: f32,
  maskRadiusBR: f32,
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

  let sdf = rectMaskSDF(
    uv,
    params.maskLeft, params.maskRight, params.maskTop, params.maskBottom,
    params.maskRadiusTL, params.maskRadiusTR, params.maskRadiusBL, params.maskRadiusBR,
    params.aspectRatio
  );
  let pixelSize = 1.0 / min(params.viewportWidth, params.viewportHeight);
  let rawMaskAlpha = smoothstep(-pixelSize, pixelSize, sdf);
  let maskAlpha = mix(1.0 - rawMaskAlpha, rawMaskAlpha, params.cutout);

  let textureColor = stripePattern(pos.xy, params.color1, params.color2, params.stripeWidth1, params.stripeWidth2, params.stripeAngle);

  return vec4f(textureColor.rgb, textureColor.a * maskAlpha);
}
`

/** Rect mask + grid texture shader */
export const rectGridShader = /* wgsl */ `
${fullscreenVertex}

${aaUtils}

${oklabUtils}

${gridPatternFn}

${rectMaskFn}

struct Params {
  color1: vec4f,
  color2: vec4f,
  // mask params
  maskLeft: f32,
  maskRight: f32,
  maskTop: f32,
  maskBottom: f32,
  maskRadiusTL: f32,
  maskRadiusTR: f32,
  maskRadiusBL: f32,
  maskRadiusBR: f32,
  aspectRatio: f32,
  // texture params
  gridLineWidth: f32,
  gridCellSize: f32,
  // viewport
  viewportWidth: f32,
  viewportHeight: f32,
  cutout: f32,
  _padding1: f32,
  _padding2: f32,
}

@group(0) @binding(0) var<uniform> params: Params;

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = vec2f(pos.x / params.viewportWidth, pos.y / params.viewportHeight);

  let sdf = rectMaskSDF(
    uv,
    params.maskLeft, params.maskRight, params.maskTop, params.maskBottom,
    params.maskRadiusTL, params.maskRadiusTR, params.maskRadiusBL, params.maskRadiusBR,
    params.aspectRatio
  );
  let pixelSize = 1.0 / min(params.viewportWidth, params.viewportHeight);
  let rawMaskAlpha = smoothstep(-pixelSize, pixelSize, sdf);
  let maskAlpha = mix(1.0 - rawMaskAlpha, rawMaskAlpha, params.cutout);

  let textureColor = gridPattern(pos.xy, params.color1, params.color2, params.gridLineWidth, params.gridCellSize);

  return vec4f(textureColor.rgb, textureColor.a * maskAlpha);
}
`

/** Rect mask + polka dot texture shader */
export const rectPolkaDotShader = /* wgsl */ `
${fullscreenVertex}

${aaUtils}

${oklabUtils}

${polkaDotPatternFn}

${rectMaskFn}

struct Params {
  color1: vec4f,
  color2: vec4f,
  // mask params
  maskLeft: f32,
  maskRight: f32,
  maskTop: f32,
  maskBottom: f32,
  maskRadiusTL: f32,
  maskRadiusTR: f32,
  maskRadiusBL: f32,
  maskRadiusBR: f32,
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

  let sdf = rectMaskSDF(
    uv,
    params.maskLeft, params.maskRight, params.maskTop, params.maskBottom,
    params.maskRadiusTL, params.maskRadiusTR, params.maskRadiusBL, params.maskRadiusBR,
    params.aspectRatio
  );
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

/** Create spec for rect mask + stripe texture */
export function createRectStripeSpec(
  color1: RGBA,
  color2: RGBA,
  mask: RectMaskConfig,
  texture: StripeTextureConfig,
  viewport: Viewport
): TextureRenderSpec {
  const aspectRatio = viewport.width / viewport.height
  const cutout = mask.cutout ?? true
  const data = new Float32Array([
    ...color1,
    ...color2,
    mask.left,
    mask.right,
    mask.top,
    mask.bottom,
    mask.radiusTopLeft ?? 0,
    mask.radiusTopRight ?? 0,
    mask.radiusBottomLeft ?? 0,
    mask.radiusBottomRight ?? 0,
    aspectRatio,
    texture.width1,
    texture.width2,
    texture.angle,
    viewport.width,
    viewport.height,
    cutout ? 1.0 : 0.0,
    0, // padding
  ])
  return {
    shader: rectStripeShader,
    uniforms: data.buffer,
    bufferSize: RECT_STRIPE_BUFFER_SIZE,
    blend: maskBlendState,
  }
}

/** Create spec for rect mask + grid texture */
export function createRectGridSpec(
  color1: RGBA,
  color2: RGBA,
  mask: RectMaskConfig,
  texture: GridTextureConfig,
  viewport: Viewport
): TextureRenderSpec {
  const aspectRatio = viewport.width / viewport.height
  const cutout = mask.cutout ?? true
  const data = new Float32Array([
    ...color1,
    ...color2,
    mask.left,
    mask.right,
    mask.top,
    mask.bottom,
    mask.radiusTopLeft ?? 0,
    mask.radiusTopRight ?? 0,
    mask.radiusBottomLeft ?? 0,
    mask.radiusBottomRight ?? 0,
    aspectRatio,
    texture.lineWidth,
    texture.cellSize,
    viewport.width,
    viewport.height,
    cutout ? 1.0 : 0.0,
    0, // padding
    0, // padding
  ])
  return {
    shader: rectGridShader,
    uniforms: data.buffer,
    bufferSize: RECT_GRID_BUFFER_SIZE,
    blend: maskBlendState,
  }
}

/** Create spec for rect mask + polka dot texture */
export function createRectPolkaDotSpec(
  color1: RGBA,
  color2: RGBA,
  mask: RectMaskConfig,
  texture: PolkaDotTextureConfig,
  viewport: Viewport
): TextureRenderSpec {
  const aspectRatio = viewport.width / viewport.height
  const cutout = mask.cutout ?? true
  const data = new Float32Array([
    ...color1,
    ...color2,
    mask.left,
    mask.right,
    mask.top,
    mask.bottom,
    mask.radiusTopLeft ?? 0,
    mask.radiusTopRight ?? 0,
    mask.radiusBottomLeft ?? 0,
    mask.radiusBottomRight ?? 0,
    aspectRatio,
    texture.dotRadius,
    texture.spacing,
    texture.rowOffset,
    viewport.width,
    viewport.height,
    cutout ? 1.0 : 0.0,
    0, // padding
  ])
  return {
    shader: rectPolkaDotShader,
    uniforms: data.buffer,
    bufferSize: RECT_POLKA_DOT_BUFFER_SIZE,
    blend: maskBlendState,
  }
}

/** Rect mask + checker texture shader */
export const rectCheckerShader = /* wgsl */ `
${fullscreenVertex}

${aaUtils}

${checkerPatternFn}

${rectMaskFn}

struct Params {
  color1: vec4f,
  color2: vec4f,
  // mask params
  maskLeft: f32,
  maskRight: f32,
  maskTop: f32,
  maskBottom: f32,
  maskRadiusTL: f32,
  maskRadiusTR: f32,
  maskRadiusBL: f32,
  maskRadiusBR: f32,
  aspectRatio: f32,
  // texture params
  cellSize: f32,
  angle: f32,
  // viewport
  viewportWidth: f32,
  viewportHeight: f32,
  cutout: f32,
  _padding1: f32,
  _padding2: f32,
}

@group(0) @binding(0) var<uniform> params: Params;

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = vec2f(pos.x / params.viewportWidth, pos.y / params.viewportHeight);

  let sdf = rectMaskSDF(
    uv,
    params.maskLeft, params.maskRight, params.maskTop, params.maskBottom,
    params.maskRadiusTL, params.maskRadiusTR, params.maskRadiusBL, params.maskRadiusBR,
    params.aspectRatio
  );
  let pixelSize = 1.0 / min(params.viewportWidth, params.viewportHeight);
  let rawMaskAlpha = smoothstep(-pixelSize, pixelSize, sdf);
  let maskAlpha = mix(1.0 - rawMaskAlpha, rawMaskAlpha, params.cutout);

  let textureColor = checkerPattern(pos.xy, params.color1, params.color2, params.cellSize, params.angle);

  return vec4f(textureColor.rgb, textureColor.a * maskAlpha);
}
`

/** Create spec for rect mask + checker texture */
export function createRectCheckerSpec(
  color1: RGBA,
  color2: RGBA,
  mask: RectMaskConfig,
  texture: CheckerTextureConfig,
  viewport: Viewport
): TextureRenderSpec {
  const aspectRatio = viewport.width / viewport.height
  const cutout = mask.cutout ?? true
  const data = new Float32Array([
    ...color1,
    ...color2,
    mask.left,
    mask.right,
    mask.top,
    mask.bottom,
    mask.radiusTopLeft ?? 0,
    mask.radiusTopRight ?? 0,
    mask.radiusBottomLeft ?? 0,
    mask.radiusBottomRight ?? 0,
    aspectRatio,
    texture.cellSize,
    texture.angle,
    viewport.width,
    viewport.height,
    cutout ? 1.0 : 0.0,
    0, // padding
    0, // padding
  ])
  return {
    shader: rectCheckerShader,
    uniforms: data.buffer,
    bufferSize: RECT_CHECKER_BUFFER_SIZE,
    blend: maskBlendState,
  }
}
