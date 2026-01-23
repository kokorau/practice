/**
 * Clip Mask Shaders
 *
 * SDFベースのクリッピングマスクシェーダー
 * 入力テクスチャをマスク形状でクリップする
 */

import { fullscreenVertex, maskBlendState } from './common'
import type { TextureRenderSpec, Viewport } from '../Domain'

// ============================================================
// Types
// ============================================================

/** クリップマスクの基本パラメータ */
export interface ClipMaskBaseParams {
  /** 内側/外側の反転 (true: 外側を表示) */
  invert: boolean
  /** エッジのフェード量 (0-1, 0=シャープ, 1=最大フェード) */
  feather: number
}

/** 円形クリップマスクのパラメータ */
export interface CircleClipParams extends ClipMaskBaseParams {
  type: 'circle'
  /** 中心X座標 (0.0-1.0, 正規化座標) */
  centerX: number
  /** 中心Y座標 (0.0-1.0, 正規化座標) */
  centerY: number
  /** 半径 (0.0-1.0, 画面の短辺に対する比率) */
  radius: number
}

/** 矩形クリップマスクのパラメータ */
export interface RectClipParams extends ClipMaskBaseParams {
  type: 'rect'
  /** 中心X座標 (0.0-1.0, 正規化座標) */
  centerX: number
  /** 中心Y座標 (0.0-1.0, 正規化座標) */
  centerY: number
  /** 幅 (0.0-1.0, 正規化) */
  width: number
  /** 高さ (0.0-1.0, 正規化) */
  height: number
  /** 角丸半径 [top-left, top-right, bottom-right, bottom-left] */
  cornerRadius: [number, number, number, number]
  /** 回転角度 (0-360度) */
  rotation?: number
  /** X軸パースペクティブ (-0.5〜0.5) */
  perspectiveX?: number
  /** Y軸パースペクティブ (-0.5〜0.5) */
  perspectiveY?: number
}

/** Blobクリップマスクのパラメータ */
export interface BlobClipParams extends ClipMaskBaseParams {
  type: 'blob'
  /** 中心X座標 (0.0-1.0, 正規化座標) */
  centerX: number
  /** 中心Y座標 (0.0-1.0, 正規化座標) */
  centerY: number
  /** 基本半径 (0.0-1.0, 画面の短辺に対する比率) */
  baseRadius: number
  /** 揺らぎの振幅 (0.0-1.0, baseRadiusに対する比率) */
  amplitude: number
  /** 波の重ね数 (2-4程度) */
  octaves: number
  /** 乱数シード */
  seed: number
}

/** Perlinクリップマスクのパラメータ */
export interface PerlinClipParams extends ClipMaskBaseParams {
  type: 'perlin'
  /** ノイズスケール */
  scale: number
  /** fBmオクターブ数 (1-8) */
  octaves: number
  /** 閾値 (0.0-1.0) */
  threshold: number
  /** 乱数シード */
  seed: number
}

/** LinearGradientクリップマスクのパラメータ */
export interface LinearGradientClipParams extends ClipMaskBaseParams {
  type: 'linearGradient'
  /** グラデーション方向 (0-360度) */
  angle: number
  /** 開始位置 (0.0-1.0, 正規化座標) */
  startOffset: number
  /** 終了位置 (0.0-1.0, 正規化座標) */
  endOffset: number
}

/** RadialGradientクリップマスクのパラメータ */
export interface RadialGradientClipParams extends ClipMaskBaseParams {
  type: 'radialGradient'
  /** 中心X座標 (0.0-1.0, 正規化座標) */
  centerX: number
  /** 中心Y座標 (0.0-1.0, 正規化座標) */
  centerY: number
  /** 内側半径 (完全不透明) */
  innerRadius: number
  /** 外側半径 (完全透明) */
  outerRadius: number
  /** 楕円形対応 (1.0 = 真円) */
  aspectRatio: number
}

/** BoxGradientクリップマスクのパラメータ */
export interface BoxGradientClipParams extends ClipMaskBaseParams {
  type: 'boxGradient'
  /** 左辺からの減衰幅 (0.0-1.0, 正規化座標) */
  left: number
  /** 右辺からの減衰幅 (0.0-1.0, 正規化座標) */
  right: number
  /** 上辺からの減衰幅 (0.0-1.0, 正規化座標) */
  top: number
  /** 下辺からの減衰幅 (0.0-1.0, 正規化座標) */
  bottom: number
  /** 角丸半径 */
  cornerRadius: number
  /** フェードカーブタイプ (0=linear, 1=smooth, 2=easeIn, 3=easeOut) */
  curve: 'linear' | 'smooth' | 'easeIn' | 'easeOut'
}

/** クリップマスクパラメータのUnion型 */
export type ClipMaskParams =
  | CircleClipParams
  | RectClipParams
  | BlobClipParams
  | PerlinClipParams
  | LinearGradientClipParams
  | RadialGradientClipParams
  | BoxGradientClipParams

// ============================================================
// Common WGSL Utilities
// ============================================================

const clipMaskUtils = /* wgsl */ `
// Smooth blob shape using layered sine waves
fn hash11(p: f32) -> f32 {
  return fract(sin(p * 127.1) * 43758.5453);
}

// Continuous blob deformation using circular noise sampling
// Samples noise on a circular path to ensure seamless wrapping at ±π
fn smoothBlob(angle: f32, seed: f32, waves: u32) -> f32 {
  let noiseRadius = 3.0;
  let seedOffset = seed * 0.1;
  let noiseCoord = vec2f(
    cos(angle) * noiseRadius + seedOffset,
    sin(angle) * noiseRadius + seedOffset * 0.7
  );

  // Use layered noise for more organic shapes
  var value = 0.0;
  var amplitude = 0.5;
  var pos = noiseCoord;
  let octaves = clamp(i32(waves), 1, 4);

  for (var i = 0; i < octaves; i++) {
    // Use same hash function as in clipMaskUtils
    let i_floor = floor(pos);
    let f = fract(pos);
    let u = f * f * (3.0 - 2.0 * f);
    let a = hash11(i_floor.x + i_floor.y * 57.0);
    let b = hash11(i_floor.x + 1.0 + i_floor.y * 57.0);
    let c = hash11(i_floor.x + (i_floor.y + 1.0) * 57.0);
    let d = hash11(i_floor.x + 1.0 + (i_floor.y + 1.0) * 57.0);
    let noise = mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
    value += amplitude * noise;
    pos *= 2.0;
    amplitude *= 0.5;
  }

  // Center around 0 for symmetric deformation
  return (value - 0.5) * 2.0;
}

// Perlin noise functions
fn perlinHash21(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

fn perlinValueNoise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);

  let a = perlinHash21(i);
  let b = perlinHash21(i + vec2f(1.0, 0.0));
  let c = perlinHash21(i + vec2f(0.0, 1.0));
  let d = perlinHash21(i + vec2f(1.0, 1.0));

  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

fn perlinFbm(p: vec2f, octaves: i32) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var pos = p;

  for (var i = 0; i < octaves; i++) {
    value += amplitude * perlinValueNoise(pos);
    pos *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

// Signed distance function for rounded rectangle with per-corner radii
fn sdRoundedRectVar(p: vec2f, halfSize: vec2f, radii: vec4f) -> f32 {
  var r: f32;
  if (p.x < 0.0) {
    if (p.y < 0.0) {
      r = radii.x; // top-left
    } else {
      r = radii.w; // bottom-left
    }
  } else {
    if (p.y < 0.0) {
      r = radii.y; // top-right
    } else {
      r = radii.z; // bottom-right
    }
  }

  let q = abs(p) - halfSize + r;
  return length(max(q, vec2f(0.0))) + min(max(q.x, q.y), 0.0) - r;
}
`

// ============================================================
// Circle Clip Shader
// ============================================================

export const circleClipShader = /* wgsl */ `
${fullscreenVertex}

${clipMaskUtils}

struct CircleClipParams {
  centerX: f32,
  centerY: f32,
  radius: f32,
  feather: f32,
  invert: f32,
  aspectRatio: f32,
  viewportWidth: f32,
  viewportHeight: f32,
}

@group(0) @binding(0) var<uniform> params: CircleClipParams;
@group(0) @binding(1) var inputSampler: sampler;
@group(0) @binding(2) var inputTexture: texture_2d<f32>;

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = vec2f(pos.x / params.viewportWidth, pos.y / params.viewportHeight);

  // Sample input texture
  let texColor = textureSample(inputTexture, inputSampler, uv);

  // Calculate distance from center with aspect ratio correction
  let center = vec2f(params.centerX, params.centerY);
  var delta = uv - center;

  if (params.aspectRatio > 1.0) {
    delta.x *= params.aspectRatio;
  } else {
    delta.y /= params.aspectRatio;
  }

  let dist = length(delta);

  // Calculate mask with feather
  let pixelSize = 1.0 / min(params.viewportWidth, params.viewportHeight);
  let featherAmount = max(params.feather * 0.1, pixelSize); // Scale feather, minimum 1px
  let edge = params.radius;

  // SDF: positive outside, negative inside
  let sdf = dist - edge;

  // Apply feather
  let mask = 1.0 - smoothstep(-featherAmount, featherAmount, sdf);

  // Apply invert
  let finalMask = select(mask, 1.0 - mask, params.invert > 0.5);

  return vec4f(texColor.rgb, texColor.a * finalMask);
}
`

// ============================================================
// Rect Clip Shader
// ============================================================

export const rectClipShader = /* wgsl */ `
${fullscreenVertex}

${clipMaskUtils}

struct RectClipParams {
  centerX: f32,
  centerY: f32,
  width: f32,
  height: f32,
  radiusTL: f32,
  radiusTR: f32,
  radiusBR: f32,
  radiusBL: f32,
  feather: f32,
  invert: f32,
  aspectRatio: f32,
  viewportWidth: f32,
  viewportHeight: f32,
  rotation: f32,
  perspectiveX: f32,
  perspectiveY: f32,
}

@group(0) @binding(0) var<uniform> params: RectClipParams;
@group(0) @binding(1) var inputSampler: sampler;
@group(0) @binding(2) var inputTexture: texture_2d<f32>;

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = vec2f(pos.x / params.viewportWidth, pos.y / params.viewportHeight);

  // Sample input texture
  let texColor = textureSample(inputTexture, inputSampler, uv);

  // Calculate SDF
  let center = vec2f(params.centerX, params.centerY);
  let halfSize = vec2f(params.width / 2.0, params.height / 2.0);

  var p = uv - center;
  var correctedHalfSize = halfSize;
  var radii = vec4f(params.radiusTL, params.radiusTR, params.radiusBR, params.radiusBL);

  // Aspect ratio correction
  if (params.aspectRatio > 1.0) {
    p.x *= params.aspectRatio;
    correctedHalfSize.x *= params.aspectRatio;
    radii *= params.aspectRatio;
  } else {
    p.y /= params.aspectRatio;
    correctedHalfSize.y /= params.aspectRatio;
    radii /= params.aspectRatio;
  }

  // Apply perspective transformation
  if (params.perspectiveX != 0.0 || params.perspectiveY != 0.0) {
    // Use center-relative coordinates for perspective
    let perspX = params.perspectiveX;
    let perspY = params.perspectiveY;

    // Simple perspective: scale based on position
    let perspFactorX = 1.0 + p.y * perspX * 2.0;
    let perspFactorY = 1.0 + p.x * perspY * 2.0;

    p.x = p.x / perspFactorX;
    p.y = p.y / perspFactorY;
  }

  // Apply rotation
  if (params.rotation != 0.0) {
    let angle = params.rotation * 3.14159265359 / 180.0;
    let cosA = cos(angle);
    let sinA = sin(angle);
    let rotatedP = vec2f(
      p.x * cosA + p.y * sinA,
      -p.x * sinA + p.y * cosA
    );
    p = rotatedP;
  }

  // Clamp radii
  let maxRadius = min(correctedHalfSize.x, correctedHalfSize.y);
  radii = min(radii, vec4f(maxRadius));

  // SDF
  let sdf = sdRoundedRectVar(p, correctedHalfSize, radii);

  // Calculate mask with feather
  let pixelSize = 1.0 / min(params.viewportWidth, params.viewportHeight);
  let featherAmount = max(params.feather * 0.1, pixelSize);

  let mask = 1.0 - smoothstep(-featherAmount, featherAmount, sdf);

  // Apply invert
  let finalMask = select(mask, 1.0 - mask, params.invert > 0.5);

  return vec4f(texColor.rgb, texColor.a * finalMask);
}
`

// ============================================================
// Blob Clip Shader
// ============================================================

export const blobClipShader = /* wgsl */ `
${fullscreenVertex}

${clipMaskUtils}

struct BlobClipParams {
  centerX: f32,
  centerY: f32,
  baseRadius: f32,
  amplitude: f32,
  octaves: u32,
  seed: f32,
  feather: f32,
  invert: f32,
  aspectRatio: f32,
  viewportWidth: f32,
  viewportHeight: f32,
  _padding: f32,
}

@group(0) @binding(0) var<uniform> params: BlobClipParams;
@group(0) @binding(1) var inputSampler: sampler;
@group(0) @binding(2) var inputTexture: texture_2d<f32>;

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = vec2f(pos.x / params.viewportWidth, pos.y / params.viewportHeight);

  // Sample input texture
  let texColor = textureSample(inputTexture, inputSampler, uv);

  // Calculate distance with aspect correction
  let center = vec2f(params.centerX, params.centerY);
  var delta = uv - center;

  if (params.aspectRatio > 1.0) {
    delta.x *= params.aspectRatio;
  } else {
    delta.y /= params.aspectRatio;
  }

  // Calculate angle and wave-modulated radius
  let angle = atan2(delta.y, delta.x);
  let waveValue = smoothBlob(angle, params.seed, params.octaves);
  let radius = params.baseRadius * (1.0 + waveValue * params.amplitude);

  let dist = length(delta);

  // SDF
  let sdf = dist - radius;

  // Calculate mask with feather
  let pixelSize = 1.0 / min(params.viewportWidth, params.viewportHeight);
  let featherAmount = max(params.feather * 0.1, pixelSize);

  let mask = 1.0 - smoothstep(-featherAmount, featherAmount, sdf);

  // Apply invert
  let finalMask = select(mask, 1.0 - mask, params.invert > 0.5);

  return vec4f(texColor.rgb, texColor.a * finalMask);
}
`

// ============================================================
// Perlin Clip Shader
// ============================================================

export const perlinClipShader = /* wgsl */ `
${fullscreenVertex}

${clipMaskUtils}

struct PerlinClipParams {
  scale: f32,
  octaves: f32,
  threshold: f32,
  seed: f32,
  feather: f32,
  invert: f32,
  viewportWidth: f32,
  viewportHeight: f32,
}

@group(0) @binding(0) var<uniform> params: PerlinClipParams;
@group(0) @binding(1) var inputSampler: sampler;
@group(0) @binding(2) var inputTexture: texture_2d<f32>;

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = vec2f(pos.x / params.viewportWidth, pos.y / params.viewportHeight);

  // Sample input texture
  let texColor = textureSample(inputTexture, inputSampler, uv);

  // Calculate perlin noise
  let noisePos = uv * params.scale + vec2f(params.seed * 0.1, params.seed * 0.073);
  let octaves = clamp(i32(params.octaves), 1, 8);
  let noise = perlinFbm(noisePos, octaves);

  // SDF-like value: positive when below threshold
  let sdf = params.threshold - noise;

  // Calculate mask with feather
  let featherAmount = max(params.feather * 0.1, 0.01);

  let mask = 1.0 - smoothstep(-featherAmount, featherAmount, sdf);

  // Apply invert
  let finalMask = select(mask, 1.0 - mask, params.invert > 0.5);

  return vec4f(texColor.rgb, texColor.a * finalMask);
}
`

// ============================================================
// Spec Creation Functions
// ============================================================

/**
 * Create render spec for circle clip mask
 */
export function createCircleClipSpec(
  params: CircleClipParams,
  viewport: Viewport
): TextureRenderSpec {
  const aspectRatio = viewport.width / viewport.height
  const data = new Float32Array([
    params.centerX,
    params.centerY,
    params.radius,
    params.feather,
    params.invert ? 1.0 : 0.0,
    aspectRatio,
    viewport.width,
    viewport.height,
  ])
  return {
    shader: circleClipShader,
    uniforms: data.buffer,
    bufferSize: 32,
    blend: maskBlendState,
    requiresTexture: true,
  }
}

/**
 * Create render spec for rect clip mask
 */
export function createRectClipSpec(
  params: RectClipParams,
  viewport: Viewport
): TextureRenderSpec {
  const aspectRatio = viewport.width / viewport.height
  const rotation = params.rotation ?? 0
  const perspectiveX = params.perspectiveX ?? 0
  const perspectiveY = params.perspectiveY ?? 0

  const data = new Float32Array([
    params.centerX,
    params.centerY,
    params.width,
    params.height,
    params.cornerRadius[0],
    params.cornerRadius[1],
    params.cornerRadius[2],
    params.cornerRadius[3],
    params.feather,
    params.invert ? 1.0 : 0.0,
    aspectRatio,
    viewport.width,
    viewport.height,
    rotation,
    perspectiveX,
    perspectiveY,
  ])
  return {
    shader: rectClipShader,
    uniforms: data.buffer,
    bufferSize: 64,
    blend: maskBlendState,
    requiresTexture: true,
  }
}

/**
 * Create render spec for blob clip mask
 */
export function createBlobClipSpec(
  params: BlobClipParams,
  viewport: Viewport
): TextureRenderSpec {
  const aspectRatio = viewport.width / viewport.height

  // Build uniform buffer manually due to mixed types (f32 + u32)
  const buffer = new ArrayBuffer(48)
  const floatView = new Float32Array(buffer)
  const uintView = new Uint32Array(buffer)

  floatView[0] = params.centerX
  floatView[1] = params.centerY
  floatView[2] = params.baseRadius
  floatView[3] = params.amplitude
  uintView[4] = params.octaves
  floatView[5] = params.seed
  floatView[6] = params.feather
  floatView[7] = params.invert ? 1.0 : 0.0
  floatView[8] = aspectRatio
  floatView[9] = viewport.width
  floatView[10] = viewport.height
  floatView[11] = 0 // padding

  return {
    shader: blobClipShader,
    uniforms: buffer,
    bufferSize: 48,
    blend: maskBlendState,
    requiresTexture: true,
  }
}

/**
 * Create render spec for perlin clip mask
 */
export function createPerlinClipSpec(
  params: PerlinClipParams,
  viewport: Viewport
): TextureRenderSpec {
  const data = new Float32Array([
    params.scale,
    params.octaves,
    params.threshold,
    params.seed,
    params.feather,
    params.invert ? 1.0 : 0.0,
    viewport.width,
    viewport.height,
  ])
  return {
    shader: perlinClipShader,
    uniforms: data.buffer,
    bufferSize: 32,
    blend: maskBlendState,
    requiresTexture: true,
  }
}

// ============================================================
// Linear Gradient Clip Shader
// ============================================================

export const linearGradientClipShader = /* wgsl */ `
${fullscreenVertex}

struct LinearGradientClipParams {
  angle: f32,
  startOffset: f32,
  endOffset: f32,
  feather: f32,
  invert: f32,
  viewportWidth: f32,
  viewportHeight: f32,
  _padding: f32,
}

@group(0) @binding(0) var<uniform> params: LinearGradientClipParams;
@group(0) @binding(1) var inputSampler: sampler;
@group(0) @binding(2) var inputTexture: texture_2d<f32>;

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = vec2f(pos.x / params.viewportWidth, pos.y / params.viewportHeight);

  // Sample input texture
  let texColor = textureSample(inputTexture, inputSampler, uv);

  // Convert angle from degrees to radians
  let angleRad = params.angle * 3.14159265359 / 180.0;

  // Calculate direction vector from angle
  let dir = vec2f(cos(angleRad), sin(angleRad));

  // Project UV onto gradient direction
  let projected = dot(uv - 0.5, dir) + 0.5;

  // Calculate feather range
  let featherAmount = max(params.feather * 0.1, 0.01);
  let start = params.startOffset;
  let end = params.endOffset;

  // Apply gradient with feather
  let mask = smoothstep(start - featherAmount, end + featherAmount, projected);

  // Apply invert
  let finalMask = select(mask, 1.0 - mask, params.invert > 0.5);

  return vec4f(texColor.rgb, texColor.a * finalMask);
}
`

/**
 * Create render spec for linear gradient clip mask
 */
export function createLinearGradientClipSpec(
  params: LinearGradientClipParams,
  viewport: Viewport
): TextureRenderSpec {
  const data = new Float32Array([
    params.angle,
    params.startOffset,
    params.endOffset,
    params.feather,
    params.invert ? 1.0 : 0.0,
    viewport.width,
    viewport.height,
    0, // padding
  ])
  return {
    shader: linearGradientClipShader,
    uniforms: data.buffer,
    bufferSize: 32,
    blend: maskBlendState,
    requiresTexture: true,
  }
}

// ============================================================
// Radial Gradient Clip Shader
// ============================================================

export const radialGradientClipShader = /* wgsl */ `
${fullscreenVertex}

struct RadialGradientClipParams {
  centerX: f32,
  centerY: f32,
  innerRadius: f32,
  outerRadius: f32,
  aspectRatio: f32,
  feather: f32,
  invert: f32,
  viewportWidth: f32,
  viewportHeight: f32,
  viewportAspectRatio: f32,
  _padding1: f32,
  _padding2: f32,
}

@group(0) @binding(0) var<uniform> params: RadialGradientClipParams;
@group(0) @binding(1) var inputSampler: sampler;
@group(0) @binding(2) var inputTexture: texture_2d<f32>;

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = vec2f(pos.x / params.viewportWidth, pos.y / params.viewportHeight);

  // Sample input texture
  let texColor = textureSample(inputTexture, inputSampler, uv);

  // Calculate center
  let center = vec2f(params.centerX, params.centerY);

  // Apply aspect ratio correction for ellipse
  var scaledUV = uv;
  var scaledCenter = center;

  // Apply ellipse aspect ratio
  if (params.aspectRatio > 1.0) {
    scaledUV.x = (uv.x - center.x) * params.aspectRatio + center.x;
  } else {
    scaledUV.y = (uv.y - center.y) / params.aspectRatio + center.y;
  }

  // Also correct for viewport aspect ratio
  if (params.viewportAspectRatio > 1.0) {
    scaledUV.x = (scaledUV.x - scaledCenter.x) * params.viewportAspectRatio + scaledCenter.x;
  } else {
    scaledUV.y = (scaledUV.y - scaledCenter.y) / params.viewportAspectRatio + scaledCenter.y;
  }

  let dist = distance(scaledUV, scaledCenter);

  // Calculate feather range
  let featherAmount = max(params.feather * 0.1, 0.01);
  let inner = params.innerRadius;
  let outer = params.outerRadius;

  // Apply gradient with feather
  let mask = 1.0 - smoothstep(inner - featherAmount, outer + featherAmount, dist);

  // Apply invert
  let finalMask = select(mask, 1.0 - mask, params.invert > 0.5);

  return vec4f(texColor.rgb, texColor.a * finalMask);
}
`

/**
 * Create render spec for radial gradient clip mask
 */
export function createRadialGradientClipSpec(
  params: RadialGradientClipParams,
  viewport: Viewport
): TextureRenderSpec {
  const viewportAspectRatio = viewport.width / viewport.height
  const data = new Float32Array([
    params.centerX,
    params.centerY,
    params.innerRadius,
    params.outerRadius,
    params.aspectRatio,
    params.feather,
    params.invert ? 1.0 : 0.0,
    viewport.width,
    viewport.height,
    viewportAspectRatio,
    0, // padding
    0, // padding
  ])
  return {
    shader: radialGradientClipShader,
    uniforms: data.buffer,
    bufferSize: 48,
    blend: maskBlendState,
    requiresTexture: true,
  }
}

// ============================================================
// Box Gradient Clip Shader
// ============================================================

/** Convert curve type string to number for shader */
function curveTypeToNumber(curve: 'linear' | 'smooth' | 'easeIn' | 'easeOut'): number {
  switch (curve) {
    case 'linear': return 0
    case 'smooth': return 1
    case 'easeIn': return 2
    case 'easeOut': return 3
    default: return 1
  }
}

export const boxGradientClipShader = /* wgsl */ `
${fullscreenVertex}

struct BoxGradientClipParams {
  left: f32,
  right: f32,
  top: f32,
  bottom: f32,
  cornerRadius: f32,
  curve: f32,
  feather: f32,
  invert: f32,
  viewportWidth: f32,
  viewportHeight: f32,
  _padding1: f32,
  _padding2: f32,
}

@group(0) @binding(0) var<uniform> params: BoxGradientClipParams;
@group(0) @binding(1) var inputSampler: sampler;
@group(0) @binding(2) var inputTexture: texture_2d<f32>;

// Apply curve function based on curve type
fn applyCurve(t: f32, curveType: f32) -> f32 {
  let curveInt = i32(curveType);
  if (curveInt == 0) {
    // linear
    return t;
  } else if (curveInt == 1) {
    // smooth (smoothstep-like)
    return t * t * (3.0 - 2.0 * t);
  } else if (curveInt == 2) {
    // easeIn (quadratic)
    return t * t;
  } else {
    // easeOut (inverse quadratic)
    return 1.0 - (1.0 - t) * (1.0 - t);
  }
}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = vec2f(pos.x / params.viewportWidth, pos.y / params.viewportHeight);

  // Sample input texture
  let texColor = textureSample(inputTexture, inputSampler, uv);

  // Calculate distance from each edge, inverted so t=0 at center, t=1 at edges
  var dLeft = 0.0;
  var dRight = 0.0;
  var dTop = 0.0;
  var dBottom = 0.0;

  if (params.left > 0.0) {
    dLeft = 1.0 - clamp(uv.x / params.left, 0.0, 1.0);
  }
  if (params.right > 0.0) {
    dRight = 1.0 - clamp((1.0 - uv.x) / params.right, 0.0, 1.0);
  }
  if (params.top > 0.0) {
    dTop = 1.0 - clamp(uv.y / params.top, 0.0, 1.0);
  }
  if (params.bottom > 0.0) {
    dBottom = 1.0 - clamp((1.0 - uv.y) / params.bottom, 0.0, 1.0);
  }

  // Maximum of all edges forms the box gradient (t=0 at center, t=1 at edges)
  var t = max(max(dLeft, dRight), max(dTop, dBottom));

  // Apply corner radius effect in corners
  if (params.cornerRadius > 0.0) {
    let cr = params.cornerRadius;

    // Check if we're in a corner region
    let inLeftTop = uv.x < params.left && uv.y < params.top;
    let inRightTop = uv.x > (1.0 - params.right) && uv.y < params.top;
    let inLeftBottom = uv.x < params.left && uv.y > (1.0 - params.bottom);
    let inRightBottom = uv.x > (1.0 - params.right) && uv.y > (1.0 - params.bottom);

    if (inLeftTop) {
      let cornerCenter = vec2f(params.left, params.top);
      let dist = length((uv - cornerCenter) / vec2f(params.left, params.top));
      let cornerT = clamp(dist, 0.0, 1.0);
      t = mix(t, cornerT, cr);
    } else if (inRightTop) {
      let cornerCenter = vec2f(1.0 - params.right, params.top);
      let dist = length((uv - cornerCenter) / vec2f(params.right, params.top));
      let cornerT = clamp(dist, 0.0, 1.0);
      t = mix(t, cornerT, cr);
    } else if (inLeftBottom) {
      let cornerCenter = vec2f(params.left, 1.0 - params.bottom);
      let dist = length((uv - cornerCenter) / vec2f(params.left, params.bottom));
      let cornerT = clamp(dist, 0.0, 1.0);
      t = mix(t, cornerT, cr);
    } else if (inRightBottom) {
      let cornerCenter = vec2f(1.0 - params.right, 1.0 - params.bottom);
      let dist = length((uv - cornerCenter) / vec2f(params.right, params.bottom));
      let cornerT = clamp(dist, 0.0, 1.0);
      t = mix(t, cornerT, cr);
    }
  }

  // Apply curve
  t = applyCurve(t, params.curve);

  // Apply feather - mask is 1 at center (t=0), 0 at edges (t=1)
  let featherAmount = max(params.feather * 0.1, 0.01);
  let mask = 1.0 - smoothstep(0.0, featherAmount, t);

  // Apply invert
  let finalMask = select(mask, 1.0 - mask, params.invert > 0.5);

  return vec4f(texColor.rgb, texColor.a * finalMask);
}
`

/**
 * Create render spec for box gradient clip mask
 */
export function createBoxGradientClipSpec(
  params: BoxGradientClipParams,
  viewport: Viewport
): TextureRenderSpec {
  const data = new Float32Array([
    params.left,
    params.right,
    params.top,
    params.bottom,
    params.cornerRadius,
    curveTypeToNumber(params.curve),
    params.feather,
    params.invert ? 1.0 : 0.0,
    viewport.width,
    viewport.height,
    0, // padding
    0, // padding
  ])
  return {
    shader: boxGradientClipShader,
    uniforms: data.buffer,
    bufferSize: 48,
    blend: maskBlendState,
    requiresTexture: true,
  }
}

/**
 * Create render spec for any clip mask type
 */
export function createClipMaskSpec(
  params: ClipMaskParams,
  viewport: Viewport
): TextureRenderSpec {
  switch (params.type) {
    case 'circle':
      return createCircleClipSpec(params, viewport)
    case 'rect':
      return createRectClipSpec(params, viewport)
    case 'blob':
      return createBlobClipSpec(params, viewport)
    case 'perlin':
      return createPerlinClipSpec(params, viewport)
    case 'linearGradient':
      return createLinearGradientClipSpec(params, viewport)
    case 'radialGradient':
      return createRadialGradientClipSpec(params, viewport)
    case 'boxGradient':
      return createBoxGradientClipSpec(params, viewport)
  }
}
