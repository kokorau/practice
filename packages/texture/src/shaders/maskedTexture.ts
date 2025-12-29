import { fullscreenVertex, aaUtils, maskBlendState } from './common'
import type { TextureRenderSpec, Viewport } from '../Domain'

// ============================================================
// Texture Pattern Functions (WGSL)
// ============================================================

/** Stripe texture pattern function */
const stripePatternFn = /* wgsl */ `
fn stripePattern(pos: vec2f, color1: vec4f, color2: vec4f, width1: f32, width2: f32, angle: f32) -> vec4f {
  let cosA = cos(angle);
  let sinA = sin(angle);
  let rotatedX = pos.x * cosA + pos.y * sinA;

  let period = width1 + width2;
  let t = rotatedX % period;
  let normalizedT = select(t, t + period, t < 0.0);

  let edge1 = aaStep(width1, normalizedT);
  let edge2 = aaStep(period, normalizedT);
  let blend = edge1 - edge2;

  return mix(color1, color2, blend);
}
`

/** Grid texture pattern function */
const gridPatternFn = /* wgsl */ `
fn gridPattern(pos: vec2f, lineColor: vec4f, bgColor: vec4f, lineWidth: f32, cellSize: f32) -> vec4f {
  let x = pos.x % cellSize;
  let y = pos.y % cellSize;

  let halfLine = lineWidth * 0.5;
  let distX = min(x, cellSize - x);
  let distY = min(y, cellSize - y);

  let lineX = 1.0 - aaStep(halfLine, distX);
  let lineY = 1.0 - aaStep(halfLine, distY);

  let onLine = max(lineX, lineY);
  return mix(bgColor, lineColor, onLine);
}
`

/** Polka dot texture pattern function */
const polkaDotPatternFn = /* wgsl */ `
fn polkaDotPattern(pos: vec2f, dotColor: vec4f, bgColor: vec4f, dotRadius: f32, spacing: f32, rowOffset: f32) -> vec4f {
  let row = floor(pos.y / spacing);
  let xOffset = row * spacing * rowOffset;

  let cellX = (pos.x + xOffset) % spacing;
  let cellY = pos.y % spacing;

  let center = spacing * 0.5;
  let dx = cellX - center;
  let dy = cellY - center;
  let dist = sqrt(dx * dx + dy * dy);

  let dotMask = 1.0 - aaStep(dotRadius, dist);
  return mix(bgColor, dotColor, dotMask);
}
`

// ============================================================
// Mask Shape Functions (WGSL)
// ============================================================

/** Circle mask SDF function */
const circleMaskFn = /* wgsl */ `
fn circleMaskSDF(uv: vec2f, centerX: f32, centerY: f32, radius: f32, aspectRatio: f32) -> f32 {
  let center = vec2f(centerX, centerY);
  var delta = uv - center;

  if (aspectRatio > 1.0) {
    delta.x *= aspectRatio;
  } else {
    delta.y /= aspectRatio;
  }

  let dist = length(delta);
  return dist - radius;
}
`

/** Rect mask SDF function with per-corner radii */
const rectMaskFn = /* wgsl */ `
fn sdRoundedRectMasked(p: vec2f, halfSize: vec2f, radii: vec4f) -> f32 {
  var r: f32;
  if (p.x < 0.0) {
    if (p.y < 0.0) {
      r = radii.x;
    } else {
      r = radii.w;
    }
  } else {
    if (p.y < 0.0) {
      r = radii.y;
    } else {
      r = radii.z;
    }
  }

  let q = abs(p) - halfSize + r;
  return length(max(q, vec2f(0.0))) + min(max(q.x, q.y), 0.0) - r;
}

fn rectMaskSDF(
  uv: vec2f,
  left: f32, right: f32, top: f32, bottom: f32,
  radiusTL: f32, radiusTR: f32, radiusBL: f32, radiusBR: f32,
  aspectRatio: f32
) -> f32 {
  let center = vec2f((left + right) / 2.0, (top + bottom) / 2.0);
  let halfSize = vec2f((right - left) / 2.0, (bottom - top) / 2.0);

  var p = uv - center;
  var correctedHalfSize = halfSize;
  var radii = vec4f(radiusTL, radiusTR, radiusBR, radiusBL);

  if (aspectRatio > 1.0) {
    p.x *= aspectRatio;
    correctedHalfSize.x *= aspectRatio;
    radii *= aspectRatio;
  } else {
    p.y /= aspectRatio;
    correctedHalfSize.y /= aspectRatio;
    radii /= aspectRatio;
  }

  let maxRadius = min(correctedHalfSize.x, correctedHalfSize.y);
  radii = min(radii, vec4f(maxRadius));

  return sdRoundedRectMasked(p, correctedHalfSize, radii);
}
`

// ============================================================
// Masked Texture Types
// ============================================================

export type MaskType = 'circle' | 'rect'
export type TextureType = 'stripe' | 'grid' | 'polkaDot'

/** Parameters for circle mask */
export interface CircleMaskConfig {
  type: 'circle'
  centerX: number
  centerY: number
  radius: number
}

/** Parameters for rect mask */
export interface RectMaskConfig {
  type: 'rect'
  left: number
  right: number
  top: number
  bottom: number
  radiusTopLeft?: number
  radiusTopRight?: number
  radiusBottomLeft?: number
  radiusBottomRight?: number
}

export type MaskConfig = CircleMaskConfig | RectMaskConfig

/** Parameters for stripe texture */
export interface StripeTextureConfig {
  type: 'stripe'
  width1: number
  width2: number
  angle: number
}

/** Parameters for grid texture */
export interface GridTextureConfig {
  type: 'grid'
  lineWidth: number
  cellSize: number
}

/** Parameters for polka dot texture */
export interface PolkaDotTextureConfig {
  type: 'polkaDot'
  dotRadius: number
  spacing: number
  rowOffset: number
}

export type TextureConfig = StripeTextureConfig | GridTextureConfig | PolkaDotTextureConfig

/** Combined parameters for masked texture */
export interface MaskedTextureParams {
  color1: [number, number, number, number]
  color2: [number, number, number, number]
  mask: MaskConfig
  texture: TextureConfig
}

// ============================================================
// Shader Generation
// ============================================================

/** Generate shader for circle mask + stripe texture */
const circleStripeShader = /* wgsl */ `
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
  _padding: f32,
}

@group(0) @binding(0) var<uniform> params: Params;

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = vec2f(pos.x / params.viewportWidth, pos.y / params.viewportHeight);

  // Mask SDF (negative = inside, positive = outside)
  let sdf = circleMaskSDF(uv, params.maskCenterX, params.maskCenterY, params.maskRadius, params.aspectRatio);

  // Antialiased mask (0 = inside/transparent, 1 = outside/texture)
  let pixelSize = 1.0 / min(params.viewportWidth, params.viewportHeight);
  let maskAlpha = smoothstep(-pixelSize, pixelSize, sdf);

  // Texture color
  let textureColor = stripePattern(pos.xy, params.color1, params.color2, params.stripeWidth1, params.stripeWidth2, params.stripeAngle);

  return vec4f(textureColor.rgb, textureColor.a * maskAlpha);
}
`

/** Generate shader for circle mask + grid texture */
const circleGridShader = /* wgsl */ `
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
}

@group(0) @binding(0) var<uniform> params: Params;

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = vec2f(pos.x / params.viewportWidth, pos.y / params.viewportHeight);

  let sdf = circleMaskSDF(uv, params.maskCenterX, params.maskCenterY, params.maskRadius, params.aspectRatio);
  let pixelSize = 1.0 / min(params.viewportWidth, params.viewportHeight);
  let maskAlpha = smoothstep(-pixelSize, pixelSize, sdf);

  let textureColor = gridPattern(pos.xy, params.color1, params.color2, params.gridLineWidth, params.gridCellSize);

  return vec4f(textureColor.rgb, textureColor.a * maskAlpha);
}
`

/** Generate shader for circle mask + polka dot texture */
const circlePolkaDotShader = /* wgsl */ `
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
  _padding: f32,
}

@group(0) @binding(0) var<uniform> params: Params;

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = vec2f(pos.x / params.viewportWidth, pos.y / params.viewportHeight);

  let sdf = circleMaskSDF(uv, params.maskCenterX, params.maskCenterY, params.maskRadius, params.aspectRatio);
  let pixelSize = 1.0 / min(params.viewportWidth, params.viewportHeight);
  let maskAlpha = smoothstep(-pixelSize, pixelSize, sdf);

  let textureColor = polkaDotPattern(pos.xy, params.color1, params.color2, params.dotRadius, params.dotSpacing, params.dotRowOffset);

  return vec4f(textureColor.rgb, textureColor.a * maskAlpha);
}
`

/** Generate shader for rect mask + stripe texture */
const rectStripeShader = /* wgsl */ `
${fullscreenVertex}

${aaUtils}

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
  let maskAlpha = smoothstep(-pixelSize, pixelSize, sdf);

  let textureColor = stripePattern(pos.xy, params.color1, params.color2, params.stripeWidth1, params.stripeWidth2, params.stripeAngle);

  return vec4f(textureColor.rgb, textureColor.a * maskAlpha);
}
`

/** Generate shader for rect mask + grid texture */
const rectGridShader = /* wgsl */ `
${fullscreenVertex}

${aaUtils}

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
  _padding1: f32,
  _padding2: f32,
  _padding3: f32,
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
  let maskAlpha = smoothstep(-pixelSize, pixelSize, sdf);

  let textureColor = gridPattern(pos.xy, params.color1, params.color2, params.gridLineWidth, params.gridCellSize);

  return vec4f(textureColor.rgb, textureColor.a * maskAlpha);
}
`

/** Generate shader for rect mask + polka dot texture */
const rectPolkaDotShader = /* wgsl */ `
${fullscreenVertex}

${aaUtils}

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
  let maskAlpha = smoothstep(-pixelSize, pixelSize, sdf);

  let textureColor = polkaDotPattern(pos.xy, params.color1, params.color2, params.dotRadius, params.dotSpacing, params.dotRowOffset);

  return vec4f(textureColor.rgb, textureColor.a * maskAlpha);
}
`

// ============================================================
// Spec Creation Functions
// ============================================================

type RGBA = [number, number, number, number]

/** Create spec for circle mask + stripe texture */
export function createCircleStripeSpec(
  color1: RGBA,
  color2: RGBA,
  mask: CircleMaskConfig,
  texture: StripeTextureConfig,
  viewport: Viewport
): TextureRenderSpec {
  const aspectRatio = viewport.width / viewport.height
  // Struct: 2*vec4f (32) + 10*f32 (40) = 72 bytes, padded to 80
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
    0, // padding
    0, // padding to 80 bytes
    0, // padding to 80 bytes
  ])
  return {
    shader: circleStripeShader,
    uniforms: data.buffer,
    bufferSize: 80,
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
  // Struct: 2*vec4f (32) + 8*f32 (32) = 64 bytes
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
  ])
  return {
    shader: circleGridShader,
    uniforms: data.buffer,
    bufferSize: 64,
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
  // Struct: 2*vec4f (32) + 10*f32 (40) = 72 bytes, padded to 80
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
    0, // padding
    0, // padding to 80 bytes
    0, // padding to 80 bytes
  ])
  return {
    shader: circlePolkaDotShader,
    uniforms: data.buffer,
    bufferSize: 80,
    blend: maskBlendState,
  }
}

/** Create spec for rect mask + stripe texture */
export function createRectStripeSpec(
  color1: RGBA,
  color2: RGBA,
  mask: RectMaskConfig,
  texture: StripeTextureConfig,
  viewport: Viewport
): TextureRenderSpec {
  const aspectRatio = viewport.width / viewport.height
  // Struct: 2*vec4f (32) + 16*f32 (64) = 96 bytes
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
    0, // padding
    0, // padding
  ])
  return {
    shader: rectStripeShader,
    uniforms: data.buffer,
    bufferSize: 96,
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
  // Struct: 2*vec4f (32) + 16*f32 (64) = 96 bytes
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
    0, // padding
    0, // padding
    0, // padding
  ])
  return {
    shader: rectGridShader,
    uniforms: data.buffer,
    bufferSize: 96,
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
  // Struct: 2*vec4f (32) + 16*f32 (64) = 96 bytes
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
    0, // padding
    0, // padding
  ])
  return {
    shader: rectPolkaDotShader,
    uniforms: data.buffer,
    bufferSize: 96,
    blend: maskBlendState,
  }
}
