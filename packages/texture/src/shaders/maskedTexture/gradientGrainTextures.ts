/**
 * Masked GradientGrain Textures
 *
 * GradientGrain pattern with circle/rect/blob mask shapes.
 * Integrates mask SDF with gradient grain effect in a single pass.
 */

import { fullscreenVertex, aaUtils, maskBlendState, hash21, depthMapUtils, depthMapTypeToNumber, oklabUtils, type DepthMapType } from '../common'
import { circleMaskFn, rectMaskFn, blobMaskFn } from './masks'
import type { TextureRenderSpec, Viewport } from '../../Domain'
import type { CircleMaskConfig, RectMaskConfig, BlobMaskConfig } from './types'

type RGBA = [number, number, number, number]

// ============================================================
// Parameter Types
// ============================================================

export interface GradientGrainTextureConfig {
  depthMapType: DepthMapType
  angle: number
  centerX: number
  centerY: number
  circularInvert?: boolean
  radialStartAngle: number
  radialSweepAngle: number
  perlinScale: number
  perlinOctaves: number
  perlinSeed: number
  perlinContrast: number
  perlinOffset: number
  seed: number
  sparsity: number
  curvePoints: number[]
}

// ============================================================
// Buffer Sizes
// ============================================================

// Layout for circle mask + gradient grain:
// color1/color2: 32 bytes (2x vec4f)
// mask params: 16 bytes (centerX, centerY, radius, aspectRatio)
// depthType, angle, center, circularInvert: 16 bytes
// radial + perlin params: 16 bytes
// perlin continued + seed + sparsity: 16 bytes
// curvePoints: 32 bytes (2x vec4f)
// viewport + cutout + padding: 16 bytes
// Total: 144 bytes
export const CIRCLE_GRADIENT_GRAIN_BUFFER_SIZE = 144

// Rect mask has more params (8 for rect bounds + 4 for corner radii)
// Total: 176 bytes
export const RECT_GRADIENT_GRAIN_BUFFER_SIZE = 176

// Blob mask: centerX, centerY, baseRadius, amplitude, octaves, seed, aspectRatio, cutout
// Total: 160 bytes
export const BLOB_GRADIENT_GRAIN_BUFFER_SIZE = 160

// ============================================================
// Common Shader Parts
// ============================================================

const gradientGrainUtils = /* wgsl */ `
${hash21}

${depthMapUtils}

${oklabUtils}

// Catmull-Rom spline interpolation
fn catmullRom(p0: f32, p1: f32, p2: f32, p3: f32, t: f32) -> f32 {
  let t2 = t * t;
  let t3 = t2 * t;
  return 0.5 * (
    (2.0 * p1) +
    (-p0 + p2) * t +
    (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * t2 +
    (-p0 + 3.0 * p1 - 3.0 * p2 + p3) * t3
  );
}

fn getPoint(curvePoints0: vec4f, curvePoints1: vec4f, idx: i32) -> f32 {
  switch(idx) {
    case 0: { return curvePoints0.x; }
    case 1: { return curvePoints0.y; }
    case 2: { return curvePoints0.z; }
    case 3: { return curvePoints0.w; }
    case 4: { return curvePoints1.x; }
    case 5: { return curvePoints1.y; }
    case 6: { return curvePoints1.z; }
    default: { return 0.0; }
  }
}

fn evaluateCurve(curvePoints0: vec4f, curvePoints1: vec4f, x: f32) -> f32 {
  if (x >= 1.0) {
    return getPoint(curvePoints0, curvePoints1, 6);
  }
  if (x <= 0.0) {
    return getPoint(curvePoints0, curvePoints1, 0);
  }

  let segmentF = x * 6.0;
  let segment = i32(floor(segmentF));
  let t = fract(segmentF);
  let i = clamp(segment, 0, 5);
  let p0 = getPoint(curvePoints0, curvePoints1, max(i - 1, 0));
  let p1 = getPoint(curvePoints0, curvePoints1, i);
  let p2 = getPoint(curvePoints0, curvePoints1, min(i + 1, 6));
  let p3 = getPoint(curvePoints0, curvePoints1, min(i + 2, 6));
  return clamp(catmullRom(p0, p1, p2, p3, t), 0.0, 1.0);
}

fn gradientGrainColor(
  pos: vec2f,
  viewport: vec2f,
  colorA: vec4f,
  colorB: vec4f,
  depthType: f32,
  angle: f32,
  center: vec2f,
  circularInvert: f32,
  radialStartAngle: f32,
  radialSweepAngle: f32,
  perlinScale: f32,
  perlinOctaves: f32,
  perlinSeed: f32,
  perlinContrast: f32,
  perlinOffset: f32,
  seed: f32,
  sparsity: f32,
  curvePoints0: vec4f,
  curvePoints1: vec4f
) -> vec4f {
  let uv = pos / viewport;
  let aspect = viewport.x / viewport.y;

  // Calculate depth based on type (with perlin support)
  let t = calculateDepthEx(
    uv,
    depthType,
    angle,
    center,
    aspect,
    circularInvert,
    radialStartAngle,
    radialSweepAngle,
    perlinScale,
    perlinOctaves,
    perlinSeed,
    perlinContrast,
    perlinOffset
  );

  // Base gradient color (interpolated in OKLAB space for perceptually correct midtones)
  let baseColor = mixOklabVec4(colorA, colorB, t);

  // Two independent noises (different seeds)
  let noiseA = hash21(pos + seed);
  let noiseB = hash21(pos + seed + 1000.0);

  // Apply curve
  let curvedT = evaluateCurve(curvePoints0, curvePoints1, t);
  let curvedInvT = evaluateCurve(curvePoints0, curvePoints1, 1.0 - t);

  // Grain(ColorA, LR): more at t=0, less at t=1
  let thresholdA = 1.0 - curvedInvT * (1.0 - sparsity);
  let showA = noiseA >= thresholdA;

  // Grain(ColorB, RL): more at t=1, less at t=0
  let thresholdB = 1.0 - curvedT * (1.0 - sparsity);
  let showB = noiseB >= thresholdB;

  // Composite: ColorA grain -> ColorB grain -> Base gradient
  var finalColor = baseColor;
  if (showB) {
    finalColor = colorB;
  }
  if (showA) {
    finalColor = colorA;
  }

  return finalColor;
}
`

// ============================================================
// Circle Mask + GradientGrain Shader
// ============================================================

export const circleGradientGrainShader = /* wgsl */ `
${fullscreenVertex}

${aaUtils}

${circleMaskFn}

${gradientGrainUtils}

struct Params {
  colorA: vec4f,
  colorB: vec4f,
  // mask params
  maskCenterX: f32,
  maskCenterY: f32,
  maskRadius: f32,
  aspectRatio: f32,
  // gradient grain params
  depthType: f32,
  angle: f32,
  gradCenter: vec2f,
  circularInvert: f32,
  radialStartAngle: f32,
  radialSweepAngle: f32,
  perlinScale: f32,
  perlinOctaves: f32,
  perlinSeed: f32,
  perlinContrast: f32,
  perlinOffset: f32,
  seed: f32,
  sparsity: f32,
  _pad1: f32,
  curvePoints0: vec4f,
  curvePoints1: vec4f,
  // viewport + cutout
  viewportWidth: f32,
  viewportHeight: f32,
  cutout: f32,
  _pad2: f32,
}

@group(0) @binding(0) var<uniform> params: Params;

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = vec2f(pos.x / params.viewportWidth, pos.y / params.viewportHeight);

  // Mask SDF
  let sdf = circleMaskSDF(uv, params.maskCenterX, params.maskCenterY, params.maskRadius, params.aspectRatio);
  let pixelSize = 1.0 / min(params.viewportWidth, params.viewportHeight);
  let rawMaskAlpha = smoothstep(-pixelSize, pixelSize, sdf);
  let maskAlpha = mix(1.0 - rawMaskAlpha, rawMaskAlpha, params.cutout);

  // GradientGrain color
  let textureColor = gradientGrainColor(
    pos.xy,
    vec2f(params.viewportWidth, params.viewportHeight),
    params.colorA,
    params.colorB,
    params.depthType,
    params.angle,
    params.gradCenter,
    params.circularInvert,
    params.radialStartAngle,
    params.radialSweepAngle,
    params.perlinScale,
    params.perlinOctaves,
    params.perlinSeed,
    params.perlinContrast,
    params.perlinOffset,
    params.seed,
    params.sparsity,
    params.curvePoints0,
    params.curvePoints1
  );

  return vec4f(textureColor.rgb, textureColor.a * maskAlpha);
}
`

// ============================================================
// Rect Mask + GradientGrain Shader
// ============================================================

export const rectGradientGrainShader = /* wgsl */ `
${fullscreenVertex}

${aaUtils}

${rectMaskFn}

${gradientGrainUtils}

struct Params {
  colorA: vec4f,
  colorB: vec4f,
  // mask params (rect bounds)
  maskLeft: f32,
  maskRight: f32,
  maskTop: f32,
  maskBottom: f32,
  // corner radii
  radiusTL: f32,
  radiusTR: f32,
  radiusBL: f32,
  radiusBR: f32,
  aspectRatio: f32,
  // gradient grain params
  depthType: f32,
  angle: f32,
  gradCenterX: f32,
  gradCenterY: f32,
  circularInvert: f32,
  radialStartAngle: f32,
  radialSweepAngle: f32,
  perlinScale: f32,
  perlinOctaves: f32,
  perlinSeed: f32,
  perlinContrast: f32,
  perlinOffset: f32,
  seed: f32,
  sparsity: f32,
  curvePoints0: vec4f,
  curvePoints1: vec4f,
  // viewport + cutout
  viewportWidth: f32,
  viewportHeight: f32,
  cutout: f32,
  _pad: f32,
}

@group(0) @binding(0) var<uniform> params: Params;

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = vec2f(pos.x / params.viewportWidth, pos.y / params.viewportHeight);

  // Mask SDF
  let sdf = rectMaskSDF(
    uv,
    params.maskLeft, params.maskRight, params.maskTop, params.maskBottom,
    params.radiusTL, params.radiusTR, params.radiusBL, params.radiusBR,
    params.aspectRatio
  );
  let pixelSize = 1.0 / min(params.viewportWidth, params.viewportHeight);
  let rawMaskAlpha = smoothstep(-pixelSize, pixelSize, sdf);
  let maskAlpha = mix(1.0 - rawMaskAlpha, rawMaskAlpha, params.cutout);

  // GradientGrain color
  let textureColor = gradientGrainColor(
    pos.xy,
    vec2f(params.viewportWidth, params.viewportHeight),
    params.colorA,
    params.colorB,
    params.depthType,
    params.angle,
    vec2f(params.gradCenterX, params.gradCenterY),
    params.circularInvert,
    params.radialStartAngle,
    params.radialSweepAngle,
    params.perlinScale,
    params.perlinOctaves,
    params.perlinSeed,
    params.perlinContrast,
    params.perlinOffset,
    params.seed,
    params.sparsity,
    params.curvePoints0,
    params.curvePoints1
  );

  return vec4f(textureColor.rgb, textureColor.a * maskAlpha);
}
`

// ============================================================
// Blob Mask + GradientGrain Shader
// ============================================================

export const blobGradientGrainShader = /* wgsl */ `
${fullscreenVertex}

${aaUtils}

${blobMaskFn}

${gradientGrainUtils}

struct Params {
  colorA: vec4f,
  colorB: vec4f,
  // mask params (blob)
  blobCenterX: f32,
  blobCenterY: f32,
  blobBaseRadius: f32,
  blobAmplitude: f32,
  blobOctaves: f32,
  blobSeed: f32,
  aspectRatio: f32,
  // gradient grain params
  depthType: f32,
  angle: f32,
  gradCenterX: f32,
  gradCenterY: f32,
  circularInvert: f32,
  radialStartAngle: f32,
  radialSweepAngle: f32,
  perlinScale: f32,
  perlinOctaves: f32,
  perlinSeed: f32,
  perlinContrast: f32,
  perlinOffset: f32,
  seed: f32,
  sparsity: f32,
  _pad1: f32,
  curvePoints0: vec4f,
  curvePoints1: vec4f,
  // viewport + cutout
  viewportWidth: f32,
  viewportHeight: f32,
  cutout: f32,
  _pad2: f32,
}

@group(0) @binding(0) var<uniform> params: Params;

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = vec2f(pos.x / params.viewportWidth, pos.y / params.viewportHeight);

  // Mask SDF
  let sdf = blobMaskSDF(
    uv,
    params.blobCenterX, params.blobCenterY,
    params.blobBaseRadius, params.blobAmplitude,
    params.blobOctaves, params.blobSeed,
    params.aspectRatio
  );
  let pixelSize = 1.0 / min(params.viewportWidth, params.viewportHeight);
  let rawMaskAlpha = smoothstep(-pixelSize, pixelSize, sdf);
  let maskAlpha = mix(1.0 - rawMaskAlpha, rawMaskAlpha, params.cutout);

  // GradientGrain color
  let textureColor = gradientGrainColor(
    pos.xy,
    vec2f(params.viewportWidth, params.viewportHeight),
    params.colorA,
    params.colorB,
    params.depthType,
    params.angle,
    vec2f(params.gradCenterX, params.gradCenterY),
    params.circularInvert,
    params.radialStartAngle,
    params.radialSweepAngle,
    params.perlinScale,
    params.perlinOctaves,
    params.perlinSeed,
    params.perlinContrast,
    params.perlinOffset,
    params.seed,
    params.sparsity,
    params.curvePoints0,
    params.curvePoints1
  );

  return vec4f(textureColor.rgb, textureColor.a * maskAlpha);
}
`

// ============================================================
// Spec Creation Functions
// ============================================================

/** Create spec for circle mask + gradient grain texture */
export function createCircleGradientGrainSpec(
  colorA: RGBA,
  colorB: RGBA,
  mask: CircleMaskConfig,
  texture: GradientGrainTextureConfig,
  viewport: Viewport
): TextureRenderSpec {
  const aspectRatio = viewport.width / viewport.height
  const cutout = mask.cutout ?? true
  const data = new Float32Array(CIRCLE_GRADIENT_GRAIN_BUFFER_SIZE / 4)

  // colorA, colorB
  data.set(colorA, 0)
  data.set(colorB, 4)

  // mask params
  data[8] = mask.centerX
  data[9] = mask.centerY
  data[10] = mask.radius
  data[11] = aspectRatio

  // gradient grain params
  data[12] = depthMapTypeToNumber(texture.depthMapType)
  data[13] = texture.angle
  data[14] = texture.centerX
  data[15] = texture.centerY
  data[16] = texture.circularInvert ? 1.0 : 0.0
  data[17] = texture.radialStartAngle
  data[18] = texture.radialSweepAngle
  data[19] = texture.perlinScale
  data[20] = texture.perlinOctaves
  data[21] = texture.perlinSeed
  data[22] = texture.perlinContrast
  data[23] = texture.perlinOffset
  data[24] = texture.seed
  data[25] = texture.sparsity
  data[26] = 0 // padding

  // curvePoints
  data[27] = 0 // padding for alignment
  data[28] = texture.curvePoints[0] ?? 0
  data[29] = texture.curvePoints[1] ?? 1/6
  data[30] = texture.curvePoints[2] ?? 2/6
  data[31] = texture.curvePoints[3] ?? 3/6
  data[32] = texture.curvePoints[4] ?? 4/6
  data[33] = texture.curvePoints[5] ?? 5/6
  data[34] = texture.curvePoints[6] ?? 1
  data[35] = 0 // padding

  // viewport + cutout
  data[36] = viewport.width
  data[37] = viewport.height
  data[38] = cutout ? 1.0 : 0.0
  data[39] = 0 // padding

  return {
    shader: circleGradientGrainShader,
    uniforms: data.buffer,
    bufferSize: CIRCLE_GRADIENT_GRAIN_BUFFER_SIZE,
    blend: maskBlendState,
  }
}

/** Create spec for rect mask + gradient grain texture */
export function createRectGradientGrainSpec(
  colorA: RGBA,
  colorB: RGBA,
  mask: RectMaskConfig,
  texture: GradientGrainTextureConfig,
  viewport: Viewport
): TextureRenderSpec {
  const aspectRatio = viewport.width / viewport.height
  const cutout = mask.cutout ?? true
  const data = new Float32Array(RECT_GRADIENT_GRAIN_BUFFER_SIZE / 4)

  // colorA, colorB
  data.set(colorA, 0)
  data.set(colorB, 4)

  // mask params (rect bounds)
  data[8] = mask.left
  data[9] = mask.right
  data[10] = mask.top
  data[11] = mask.bottom

  // corner radii
  data[12] = mask.radiusTopLeft ?? 0
  data[13] = mask.radiusTopRight ?? 0
  data[14] = mask.radiusBottomLeft ?? 0
  data[15] = mask.radiusBottomRight ?? 0
  data[16] = aspectRatio

  // gradient grain params
  data[17] = depthMapTypeToNumber(texture.depthMapType)
  data[18] = texture.angle
  data[19] = texture.centerX
  data[20] = texture.centerY
  data[21] = texture.circularInvert ? 1.0 : 0.0
  data[22] = texture.radialStartAngle
  data[23] = texture.radialSweepAngle
  data[24] = texture.perlinScale
  data[25] = texture.perlinOctaves
  data[26] = texture.perlinSeed
  data[27] = texture.perlinContrast
  data[28] = texture.perlinOffset
  data[29] = texture.seed
  data[30] = texture.sparsity

  // curvePoints
  data[31] = 0 // padding for alignment
  data[32] = texture.curvePoints[0] ?? 0
  data[33] = texture.curvePoints[1] ?? 1/6
  data[34] = texture.curvePoints[2] ?? 2/6
  data[35] = texture.curvePoints[3] ?? 3/6
  data[36] = texture.curvePoints[4] ?? 4/6
  data[37] = texture.curvePoints[5] ?? 5/6
  data[38] = texture.curvePoints[6] ?? 1
  data[39] = 0 // padding

  // viewport + cutout
  data[40] = viewport.width
  data[41] = viewport.height
  data[42] = cutout ? 1.0 : 0.0
  data[43] = 0 // padding

  return {
    shader: rectGradientGrainShader,
    uniforms: data.buffer,
    bufferSize: RECT_GRADIENT_GRAIN_BUFFER_SIZE,
    blend: maskBlendState,
  }
}

/** Create spec for blob mask + gradient grain texture */
export function createBlobGradientGrainSpec(
  colorA: RGBA,
  colorB: RGBA,
  mask: BlobMaskConfig,
  texture: GradientGrainTextureConfig,
  viewport: Viewport
): TextureRenderSpec {
  const aspectRatio = viewport.width / viewport.height
  const cutout = mask.cutout ?? true
  const data = new Float32Array(BLOB_GRADIENT_GRAIN_BUFFER_SIZE / 4)

  // colorA, colorB
  data.set(colorA, 0)
  data.set(colorB, 4)

  // mask params (blob)
  data[8] = mask.centerX
  data[9] = mask.centerY
  data[10] = mask.baseRadius
  data[11] = mask.amplitude
  data[12] = mask.octaves
  data[13] = mask.seed
  data[14] = aspectRatio

  // gradient grain params
  data[15] = depthMapTypeToNumber(texture.depthMapType)
  data[16] = texture.angle
  data[17] = texture.centerX
  data[18] = texture.centerY
  data[19] = texture.circularInvert ? 1.0 : 0.0
  data[20] = texture.radialStartAngle
  data[21] = texture.radialSweepAngle
  data[22] = texture.perlinScale
  data[23] = texture.perlinOctaves
  data[24] = texture.perlinSeed
  data[25] = texture.perlinContrast
  data[26] = texture.perlinOffset
  data[27] = texture.seed
  data[28] = texture.sparsity
  data[29] = 0 // padding

  // curvePoints
  data[30] = texture.curvePoints[0] ?? 0
  data[31] = texture.curvePoints[1] ?? 1/6
  data[32] = texture.curvePoints[2] ?? 2/6
  data[33] = texture.curvePoints[3] ?? 3/6
  data[34] = texture.curvePoints[4] ?? 4/6
  data[35] = texture.curvePoints[5] ?? 5/6
  data[36] = texture.curvePoints[6] ?? 1
  data[37] = 0 // padding

  // viewport + cutout
  data[38] = viewport.width
  data[39] = viewport.height
  data[40] = cutout ? 1.0 : 0.0
  data[41] = 0 // padding

  return {
    shader: blobGradientGrainShader,
    uniforms: data.buffer,
    bufferSize: BLOB_GRADIENT_GRAIN_BUFFER_SIZE,
    blend: maskBlendState,
  }
}
