/**
 * Perlin Mask + Texture Shaders
 *
 * パーリンノイズ2値化マスクと各種テクスチャパターンの組み合わせ。
 */

import { fullscreenVertex, aaUtils, maskBlendState } from '../common'
import { stripePatternFn, gridPatternFn, polkaDotPatternFn, checkerPatternFn } from './patterns'
import { perlinMaskUtils, perlinMaskFn } from './masks'
import type { TextureRenderSpec, Viewport } from '../../Domain'
import type { PerlinMaskConfig, StripeTextureConfig, GridTextureConfig, PolkaDotTextureConfig, CheckerTextureConfig } from './types'

type RGBA = [number, number, number, number]

// ============================================================
// Buffer Sizes
// ============================================================

export const PERLIN_STRIPE_BUFFER_SIZE = 80
export const PERLIN_GRID_BUFFER_SIZE = 80
export const PERLIN_POLKA_DOT_BUFFER_SIZE = 80
export const PERLIN_CHECKER_BUFFER_SIZE = 80

// ============================================================
// Shaders
// ============================================================

/** Perlin mask + stripe texture shader */
export const perlinStripeShader = /* wgsl */ `
${fullscreenVertex}

${aaUtils}

${stripePatternFn}

${perlinMaskUtils}

${perlinMaskFn}

struct Params {
  color1: vec4f,
  color2: vec4f,
  // mask params
  maskSeed: f32,
  maskThreshold: f32,
  maskScale: f32,
  maskOctaves: f32,
  // texture params
  stripeWidth1: f32,
  stripeWidth2: f32,
  stripeAngle: f32,
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

  let octaves = clamp(i32(params.maskOctaves), 1, 8);
  let rawMaskAlpha = perlinMaskValue(uv, params.maskSeed, params.maskScale, octaves, params.maskThreshold);
  let maskAlpha = mix(1.0 - rawMaskAlpha, rawMaskAlpha, params.cutout);

  let textureColor = stripePattern(pos.xy, params.color1, params.color2, params.stripeWidth1, params.stripeWidth2, params.stripeAngle);

  return vec4f(textureColor.rgb, textureColor.a * maskAlpha);
}
`

/** Perlin mask + grid texture shader */
export const perlinGridShader = /* wgsl */ `
${fullscreenVertex}

${aaUtils}

${gridPatternFn}

${perlinMaskUtils}

${perlinMaskFn}

struct Params {
  color1: vec4f,
  color2: vec4f,
  // mask params
  maskSeed: f32,
  maskThreshold: f32,
  maskScale: f32,
  maskOctaves: f32,
  // texture params
  gridLineWidth: f32,
  gridCellSize: f32,
  // viewport
  viewportWidth: f32,
  viewportHeight: f32,
  cutout: f32,
  _padding1: f32,
  _padding2: f32,
  _padding3: f32,
}

@group(0) @binding(0) var<uniform> params: Params;

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = vec2f(pos.x / params.viewportWidth, pos.y / params.viewportHeight);

  let octaves = clamp(i32(params.maskOctaves), 1, 8);
  let rawMaskAlpha = perlinMaskValue(uv, params.maskSeed, params.maskScale, octaves, params.maskThreshold);
  let maskAlpha = mix(1.0 - rawMaskAlpha, rawMaskAlpha, params.cutout);

  let textureColor = gridPattern(pos.xy, params.color1, params.color2, params.gridLineWidth, params.gridCellSize);

  return vec4f(textureColor.rgb, textureColor.a * maskAlpha);
}
`

/** Perlin mask + polka dot texture shader */
export const perlinPolkaDotShader = /* wgsl */ `
${fullscreenVertex}

${aaUtils}

${polkaDotPatternFn}

${perlinMaskUtils}

${perlinMaskFn}

struct Params {
  color1: vec4f,
  color2: vec4f,
  // mask params
  maskSeed: f32,
  maskThreshold: f32,
  maskScale: f32,
  maskOctaves: f32,
  // texture params
  dotRadius: f32,
  dotSpacing: f32,
  dotRowOffset: f32,
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

  let octaves = clamp(i32(params.maskOctaves), 1, 8);
  let rawMaskAlpha = perlinMaskValue(uv, params.maskSeed, params.maskScale, octaves, params.maskThreshold);
  let maskAlpha = mix(1.0 - rawMaskAlpha, rawMaskAlpha, params.cutout);

  let textureColor = polkaDotPattern(pos.xy, params.color1, params.color2, params.dotRadius, params.dotSpacing, params.dotRowOffset);

  return vec4f(textureColor.rgb, textureColor.a * maskAlpha);
}
`

/** Perlin mask + checker texture shader */
export const perlinCheckerShader = /* wgsl */ `
${fullscreenVertex}

${aaUtils}

${checkerPatternFn}

${perlinMaskUtils}

${perlinMaskFn}

struct Params {
  color1: vec4f,
  color2: vec4f,
  // mask params
  maskSeed: f32,
  maskThreshold: f32,
  maskScale: f32,
  maskOctaves: f32,
  // texture params
  cellSize: f32,
  angle: f32,
  // viewport
  viewportWidth: f32,
  viewportHeight: f32,
  cutout: f32,
  _padding1: f32,
  _padding2: f32,
  _padding3: f32,
}

@group(0) @binding(0) var<uniform> params: Params;

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = vec2f(pos.x / params.viewportWidth, pos.y / params.viewportHeight);

  let octaves = clamp(i32(params.maskOctaves), 1, 8);
  let rawMaskAlpha = perlinMaskValue(uv, params.maskSeed, params.maskScale, octaves, params.maskThreshold);
  let maskAlpha = mix(1.0 - rawMaskAlpha, rawMaskAlpha, params.cutout);

  let textureColor = checkerPattern(pos.xy, params.color1, params.color2, params.cellSize, params.angle);

  return vec4f(textureColor.rgb, textureColor.a * maskAlpha);
}
`

// ============================================================
// Spec Creation Functions
// ============================================================

/** Create spec for perlin mask + stripe texture */
export function createPerlinStripeSpec(
  color1: RGBA,
  color2: RGBA,
  mask: PerlinMaskConfig,
  texture: StripeTextureConfig,
  viewport: Viewport
): TextureRenderSpec {
  const cutout = mask.cutout ?? true
  const data = new Float32Array([
    ...color1,
    ...color2,
    mask.seed,
    mask.threshold,
    mask.scale,
    mask.octaves,
    texture.width1,
    texture.width2,
    texture.angle,
    viewport.width,
    viewport.height,
    cutout ? 1.0 : 0.0,
    0, // padding
    0, // padding
  ])

  return {
    shader: perlinStripeShader,
    uniforms: data.buffer,
    bufferSize: PERLIN_STRIPE_BUFFER_SIZE,
    blend: maskBlendState,
  }
}

/** Create spec for perlin mask + grid texture */
export function createPerlinGridSpec(
  color1: RGBA,
  color2: RGBA,
  mask: PerlinMaskConfig,
  texture: GridTextureConfig,
  viewport: Viewport
): TextureRenderSpec {
  const cutout = mask.cutout ?? true
  const data = new Float32Array([
    ...color1,
    ...color2,
    mask.seed,
    mask.threshold,
    mask.scale,
    mask.octaves,
    texture.lineWidth,
    texture.cellSize,
    viewport.width,
    viewport.height,
    cutout ? 1.0 : 0.0,
    0, // padding
    0, // padding
    0, // padding
  ])

  return {
    shader: perlinGridShader,
    uniforms: data.buffer,
    bufferSize: PERLIN_GRID_BUFFER_SIZE,
    blend: maskBlendState,
  }
}

/** Create spec for perlin mask + polka dot texture */
export function createPerlinPolkaDotSpec(
  color1: RGBA,
  color2: RGBA,
  mask: PerlinMaskConfig,
  texture: PolkaDotTextureConfig,
  viewport: Viewport
): TextureRenderSpec {
  const cutout = mask.cutout ?? true
  const data = new Float32Array([
    ...color1,
    ...color2,
    mask.seed,
    mask.threshold,
    mask.scale,
    mask.octaves,
    texture.dotRadius,
    texture.spacing,
    texture.rowOffset,
    viewport.width,
    viewport.height,
    cutout ? 1.0 : 0.0,
    0, // padding
    0, // padding
  ])

  return {
    shader: perlinPolkaDotShader,
    uniforms: data.buffer,
    bufferSize: PERLIN_POLKA_DOT_BUFFER_SIZE,
    blend: maskBlendState,
  }
}

/** Create spec for perlin mask + checker texture */
export function createPerlinCheckerSpec(
  color1: RGBA,
  color2: RGBA,
  mask: PerlinMaskConfig,
  texture: CheckerTextureConfig,
  viewport: Viewport
): TextureRenderSpec {
  const cutout = mask.cutout ?? true
  const data = new Float32Array([
    ...color1,
    ...color2,
    mask.seed,
    mask.threshold,
    mask.scale,
    mask.octaves,
    texture.cellSize,
    texture.angle,
    viewport.width,
    viewport.height,
    cutout ? 1.0 : 0.0,
    0, // padding
    0, // padding
    0, // padding
  ])

  return {
    shader: perlinCheckerShader,
    uniforms: data.buffer,
    bufferSize: PERLIN_CHECKER_BUFFER_SIZE,
    blend: maskBlendState,
  }
}
