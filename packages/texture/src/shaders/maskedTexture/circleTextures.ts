/**
 * Circle Mask + Texture Shaders
 *
 * 円形マスクと各種テクスチャパターンの組み合わせ。
 */

import { fullscreenVertex, aaUtils, maskBlendState } from '../common'
import { stripePatternFn, gridPatternFn, polkaDotPatternFn } from './patterns'
import { circleMaskFn } from './masks'
import type { TextureRenderSpec, Viewport } from '../../Domain'
import type { CircleMaskConfig, StripeTextureConfig, GridTextureConfig, PolkaDotTextureConfig } from './types'

type RGBA = [number, number, number, number]

// ============================================================
// Buffer Sizes
// ============================================================

export const CIRCLE_STRIPE_BUFFER_SIZE = 80
export const CIRCLE_GRID_BUFFER_SIZE = 80  // 64 -> 80 (added cutout + padding)
export const CIRCLE_POLKA_DOT_BUFFER_SIZE = 80

// ============================================================
// Shaders
// ============================================================

/** Circle mask + stripe texture shader */
export const circleStripeShader = /* wgsl */ `
${fullscreenVertex}

${aaUtils}

${stripePatternFn}

${circleMaskFn}

struct Params {
  color1: vec4f,
  color2: vec4f,
  // mask params
  maskCenterX: f32,
  maskCenterY: f32,
  maskRadius: f32,
  aspectRatio: f32,
  // texture params
  stripeWidth1: f32,
  stripeWidth2: f32,
  stripeAngle: f32,
  // viewport
  viewportWidth: f32,
  viewportHeight: f32,
  cutout: f32,
}

@group(0) @binding(0) var<uniform> params: Params;

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = vec2f(pos.x / params.viewportWidth, pos.y / params.viewportHeight);

  // Mask SDF (negative = inside, positive = outside)
  let sdf = circleMaskSDF(uv, params.maskCenterX, params.maskCenterY, params.maskRadius, params.aspectRatio);

  // Antialiased mask (0 = inside/transparent, 1 = outside/texture for cutout mode)
  let pixelSize = 1.0 / min(params.viewportWidth, params.viewportHeight);
  let rawMaskAlpha = smoothstep(-pixelSize, pixelSize, sdf);
  // cutout=1: texture outside shape, cutout=0: texture inside shape (solid)
  let maskAlpha = mix(1.0 - rawMaskAlpha, rawMaskAlpha, params.cutout);

  // Texture color
  let textureColor = stripePattern(pos.xy, params.color1, params.color2, params.stripeWidth1, params.stripeWidth2, params.stripeAngle);

  return vec4f(textureColor.rgb, textureColor.a * maskAlpha);
}
`

/** Circle mask + grid texture shader */
export const circleGridShader = /* wgsl */ `
${fullscreenVertex}

${aaUtils}

${gridPatternFn}

${circleMaskFn}

struct Params {
  color1: vec4f,
  color2: vec4f,
  // mask params
  maskCenterX: f32,
  maskCenterY: f32,
  maskRadius: f32,
  aspectRatio: f32,
  // texture params
  gridLineWidth: f32,
  gridCellSize: f32,
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

  let sdf = circleMaskSDF(uv, params.maskCenterX, params.maskCenterY, params.maskRadius, params.aspectRatio);
  let pixelSize = 1.0 / min(params.viewportWidth, params.viewportHeight);
  let rawMaskAlpha = smoothstep(-pixelSize, pixelSize, sdf);
  let maskAlpha = mix(1.0 - rawMaskAlpha, rawMaskAlpha, params.cutout);

  let textureColor = gridPattern(pos.xy, params.color1, params.color2, params.gridLineWidth, params.gridCellSize);

  return vec4f(textureColor.rgb, textureColor.a * maskAlpha);
}
`

/** Circle mask + polka dot texture shader */
export const circlePolkaDotShader = /* wgsl */ `
${fullscreenVertex}

${aaUtils}

${polkaDotPatternFn}

${circleMaskFn}

struct Params {
  color1: vec4f,
  color2: vec4f,
  // mask params
  maskCenterX: f32,
  maskCenterY: f32,
  maskRadius: f32,
  aspectRatio: f32,
  // texture params
  dotRadius: f32,
  dotSpacing: f32,
  dotRowOffset: f32,
  // viewport
  viewportWidth: f32,
  viewportHeight: f32,
  cutout: f32,
}

@group(0) @binding(0) var<uniform> params: Params;

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = vec2f(pos.x / params.viewportWidth, pos.y / params.viewportHeight);

  let sdf = circleMaskSDF(uv, params.maskCenterX, params.maskCenterY, params.maskRadius, params.aspectRatio);
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

/** Create spec for circle mask + stripe texture */
export function createCircleStripeSpec(
  color1: RGBA,
  color2: RGBA,
  mask: CircleMaskConfig,
  texture: StripeTextureConfig,
  viewport: Viewport
): TextureRenderSpec {
  const aspectRatio = viewport.width / viewport.height
  const cutout = mask.cutout ?? true
  const data = new Float32Array([
    ...color1,
    ...color2,
    mask.centerX,
    mask.centerY,
    mask.radius,
    aspectRatio,
    texture.width1,
    texture.width2,
    texture.angle,
    viewport.width,
    viewport.height,
    cutout ? 1.0 : 0.0,
    0, // padding to 80 bytes
    0, // padding to 80 bytes
  ])
  return {
    shader: circleStripeShader,
    uniforms: data.buffer,
    bufferSize: CIRCLE_STRIPE_BUFFER_SIZE,
    blend: maskBlendState,
  }
}

/** Create spec for circle mask + grid texture */
export function createCircleGridSpec(
  color1: RGBA,
  color2: RGBA,
  mask: CircleMaskConfig,
  texture: GridTextureConfig,
  viewport: Viewport
): TextureRenderSpec {
  const aspectRatio = viewport.width / viewport.height
  const cutout = mask.cutout ?? true
  const data = new Float32Array([
    ...color1,
    ...color2,
    mask.centerX,
    mask.centerY,
    mask.radius,
    aspectRatio,
    texture.lineWidth,
    texture.cellSize,
    viewport.width,
    viewport.height,
    cutout ? 1.0 : 0.0,
    0, // padding
  ])
  return {
    shader: circleGridShader,
    uniforms: data.buffer,
    bufferSize: CIRCLE_GRID_BUFFER_SIZE,
    blend: maskBlendState,
  }
}

/** Create spec for circle mask + polka dot texture */
export function createCirclePolkaDotSpec(
  color1: RGBA,
  color2: RGBA,
  mask: CircleMaskConfig,
  texture: PolkaDotTextureConfig,
  viewport: Viewport
): TextureRenderSpec {
  const aspectRatio = viewport.width / viewport.height
  const cutout = mask.cutout ?? true
  const data = new Float32Array([
    ...color1,
    ...color2,
    mask.centerX,
    mask.centerY,
    mask.radius,
    aspectRatio,
    texture.dotRadius,
    texture.spacing,
    texture.rowOffset,
    viewport.width,
    viewport.height,
    cutout ? 1.0 : 0.0,
    0, // padding to 80 bytes
    0, // padding to 80 bytes
  ])
  return {
    shader: circlePolkaDotShader,
    uniforms: data.buffer,
    bufferSize: CIRCLE_POLKA_DOT_BUFFER_SIZE,
    blend: maskBlendState,
  }
}
