import { fullscreenVertex, aaUtils } from './common'
import type { TextureRenderSpec, Viewport } from '../Domain'

// ============================================================
// Grayscale Mask Shaders
// Output: vec4(value, value, value, 1.0) where value is 0.0-1.0
// These shaders generate grayscale maps that can be used with maskCutout
// ============================================================

/** 円形グレースケールマスクのパラメータ */
export interface CircleGrayscaleMaskParams {
  /** 中心X座標 (0.0-1.0, 正規化座標) */
  centerX: number
  /** 中心Y座標 (0.0-1.0, 正規化座標) */
  centerY: number
  /** 半径 (0.0-1.0, 画面の短辺に対する比率) */
  radius: number
  /** 内側のグレースケール値 (0.0-1.0, 0=黒/切り抜き, 1=白/残す) */
  innerValue: number
  /** 外側のグレースケール値 (0.0-1.0) */
  outerValue: number
}

/** 長方形グレースケールマスクの基本パラメータ */
interface RectGrayscaleMaskBaseParams {
  /** 左端 (0.0-1.0) */
  left: number
  /** 右端 (0.0-1.0) */
  right: number
  /** 上端 (0.0-1.0) */
  top: number
  /** 下端 (0.0-1.0) */
  bottom: number
  /** 内側のグレースケール値 (0.0-1.0) */
  innerValue: number
  /** 外側のグレースケール値 (0.0-1.0) */
  outerValue: number
}

/** 全角に同じ角丸を適用 */
interface RectGrayscaleMaskUniformRadius extends RectGrayscaleMaskBaseParams {
  /** 角丸の半径 (全角に適用) */
  radius?: number
}

/** 各角に個別の角丸を適用 */
interface RectGrayscaleMaskIndividualRadius extends RectGrayscaleMaskBaseParams {
  /** 左上の角丸半径 */
  radiusTopLeft: number
  /** 右上の角丸半径 */
  radiusTopRight: number
  /** 左下の角丸半径 */
  radiusBottomLeft: number
  /** 右下の角丸半径 */
  radiusBottomRight: number
}

/** 長方形グレースケールマスクのパラメータ */
export type RectGrayscaleMaskParams =
  | RectGrayscaleMaskUniformRadius
  | RectGrayscaleMaskIndividualRadius

/** Blobグレースケールマスクのパラメータ */
export interface BlobGrayscaleMaskParams {
  /** 中心X座標 (0.0-1.0, 正規化座標) */
  centerX: number
  /** 中心Y座標 (0.0-1.0, 正規化座標) */
  centerY: number
  /** 基本半径 (0.0-1.0, 画面の短辺に対する比率) */
  baseRadius: number
  /** 揺らぎの振幅 (0.0-1.0, baseRadiusに対する比率) */
  amplitude: number
  /** 未使用（互換性のため残存） */
  frequency: number
  /** 波の重ね数 (2-4程度、多いほど複雑な形状) */
  octaves: number
  /** 乱数シード（形状のバリエーション） */
  seed: number
  /** 内側のグレースケール値 (0.0-1.0) */
  innerValue: number
  /** 外側のグレースケール値 (0.0-1.0) */
  outerValue: number
}

/** Perlin noiseグレースケールマスクのパラメータ */
export interface PerlinGrayscaleMaskParams {
  /** Random seed */
  seed: number
  /** Threshold for binarization (0.0-1.0) */
  threshold: number
  /** Noise scale */
  scale: number
  /** fBm octaves (1-8) */
  octaves: number
  /** 内側のグレースケール値 (noise > threshold の領域) */
  innerValue: number
  /** 外側のグレースケール値 (noise <= threshold の領域) */
  outerValue: number
}

// ============================================================
// Circle Grayscale Mask
// ============================================================

/** 円形グレースケールマスクシェーダー */
export const circleGrayscaleMaskShader = /* wgsl */ `
${fullscreenVertex}

${aaUtils}

struct CircleGrayscaleMaskParams {
  centerX: f32,
  centerY: f32,
  radius: f32,
  innerValue: f32,
  outerValue: f32,
  aspectRatio: f32,
  viewportWidth: f32,
  viewportHeight: f32,
}

@group(0) @binding(0) var<uniform> params: CircleGrayscaleMaskParams;

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let aspectRatio = params.aspectRatio;
  let viewportWidth = params.viewportWidth;
  let viewportHeight = params.viewportHeight;

  let uv = vec2f(pos.x / viewportWidth, pos.y / viewportHeight);

  // 中心からの距離を計算（アスペクト比を考慮）
  let center = vec2f(params.centerX, params.centerY);
  var delta = uv - center;

  // アスペクト比補正（分岐なしで統一的に処理）
  delta.x *= max(aspectRatio, 1.0);
  delta.y *= max(1.0 / aspectRatio, 1.0);

  let dist = length(delta);

  // アンチエイリアス付きの円形マスク
  let pixelSize = 1.0 / min(viewportWidth, viewportHeight);
  let edge = params.radius;
  let aa = smoothstep(edge - pixelSize, edge + pixelSize, dist);

  let value = mix(params.innerValue, params.outerValue, aa);
  return vec4f(value, value, value, 1.0);
}
`

/**
 * Create render spec for circle grayscale mask
 */
export function createCircleGrayscaleMaskSpec(
  params: CircleGrayscaleMaskParams,
  viewport: Viewport
): TextureRenderSpec {
  const aspectRatio = viewport.width / viewport.height
  const data = new Float32Array([
    params.centerX,
    params.centerY,
    params.radius,
    params.innerValue,
    params.outerValue,
    aspectRatio,
    viewport.width,
    viewport.height,
  ])
  return {
    shader: circleGrayscaleMaskShader,
    uniforms: data.buffer,
    bufferSize: 32,
  }
}

// ============================================================
// Rect Grayscale Mask
// ============================================================

/** 長方形グレースケールマスクシェーダー */
export const rectGrayscaleMaskShader = /* wgsl */ `
${fullscreenVertex}

${aaUtils}

struct RectGrayscaleMaskParams {
  left: f32,
  right: f32,
  top: f32,
  bottom: f32,
  radiusTopLeft: f32,
  radiusTopRight: f32,
  radiusBottomLeft: f32,
  radiusBottomRight: f32,
  innerValue: f32,
  outerValue: f32,
  aspectRatio: f32,
  viewportWidth: f32,
  viewportHeight: f32,
  _padding1: f32,
  _padding2: f32,
  _padding3: f32,
}

@group(0) @binding(0) var<uniform> params: RectGrayscaleMaskParams;

// Signed distance function for rounded rectangle with per-corner radii
fn sdRoundedRectVar(p: vec2f, halfSize: vec2f, radii: vec4f) -> f32 {
  let sx = step(0.0, p.x);
  let sy = step(0.0, p.y);
  let r = mix(
    mix(radii.x, radii.y, sx),
    mix(radii.w, radii.z, sx),
    sy
  );

  let q = abs(p) - halfSize + r;
  return length(max(q, vec2f(0.0))) + min(max(q.x, q.y), 0.0) - r;
}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let viewportWidth = params.viewportWidth;
  let viewportHeight = params.viewportHeight;
  let aspectRatio = params.aspectRatio;

  let uv = vec2f(pos.x / viewportWidth, pos.y / viewportHeight);

  // 矩形の中心と半サイズを計算
  let center = vec2f((params.left + params.right) / 2.0, (params.top + params.bottom) / 2.0);
  let halfSize = vec2f((params.right - params.left) / 2.0, (params.bottom - params.top) / 2.0);

  // uvから中心への距離
  var p = uv - center;
  var correctedHalfSize = halfSize;
  var radii = vec4f(params.radiusTopLeft, params.radiusTopRight, params.radiusBottomRight, params.radiusBottomLeft);

  // アスペクト比補正
  let scaleX = max(aspectRatio, 1.0);
  let scaleY = max(1.0 / aspectRatio, 1.0);
  p.x *= scaleX;
  p.y *= scaleY;
  correctedHalfSize.x *= scaleX;
  correctedHalfSize.y *= scaleY;
  radii *= max(aspectRatio, 1.0 / aspectRatio);

  // 各radiusを矩形の短辺の半分までにクランプ
  let maxRadius = min(correctedHalfSize.x, correctedHalfSize.y);
  radii = min(radii, vec4f(maxRadius));

  // SDFで距離を計算
  let dist = sdRoundedRectVar(p, correctedHalfSize, radii);

  // アンチエイリアス
  let pixelSize = 1.0 / min(viewportWidth, viewportHeight);
  let inside = 1.0 - smoothstep(-pixelSize, pixelSize, dist);

  let value = mix(params.outerValue, params.innerValue, inside);
  return vec4f(value, value, value, 1.0);
}
`

/**
 * Create render spec for rect grayscale mask
 */
export function createRectGrayscaleMaskSpec(
  params: RectGrayscaleMaskParams,
  viewport: Viewport
): TextureRenderSpec {
  const aspectRatio = viewport.width / viewport.height

  // 個別指定か全角指定かを判別
  const isIndividual = 'radiusTopLeft' in params
  const radiusTopLeft = isIndividual ? params.radiusTopLeft : (params.radius ?? 0)
  const radiusTopRight = isIndividual ? params.radiusTopRight : (params.radius ?? 0)
  const radiusBottomLeft = isIndividual ? params.radiusBottomLeft : (params.radius ?? 0)
  const radiusBottomRight = isIndividual ? params.radiusBottomRight : (params.radius ?? 0)

  const data = new Float32Array([
    params.left,
    params.right,
    params.top,
    params.bottom,
    radiusTopLeft,
    radiusTopRight,
    radiusBottomLeft,
    radiusBottomRight,
    params.innerValue,
    params.outerValue,
    aspectRatio,
    viewport.width,
    viewport.height,
    0, // padding
    0, // padding
    0, // padding
  ])
  return {
    shader: rectGrayscaleMaskShader,
    uniforms: data.buffer,
    bufferSize: 64,
  }
}

// ============================================================
// Blob Grayscale Mask
// ============================================================

/** Smooth wave-based blob deformation */
const waveUtils = /* wgsl */ `
fn hash11(p: f32) -> f32 {
  return fract(sin(p * 127.1) * 43758.5453);
}

fn smoothBlob(angle: f32, seed: f32, waves: u32) -> f32 {
  var value = 0.0;
  var totalWeight = 0.0;

  for (var i = 0u; i < waves; i++) {
    let fi = f32(i);
    let freq = fi + 2.0;
    let phase = hash11(seed + fi * 17.3) * 6.283;
    let weight = 1.0 / (fi + 1.0);

    value += sin(angle * freq + phase) * weight;
    totalWeight += weight;
  }

  return value / totalWeight;
}
`

/** Blobグレースケールマスクシェーダー */
export const blobGrayscaleMaskShader = /* wgsl */ `
${fullscreenVertex}

${aaUtils}

${waveUtils}

struct BlobGrayscaleMaskParams {
  centerX: f32,
  centerY: f32,
  baseRadius: f32,
  amplitude: f32,
  frequency: f32,
  octaves: u32,
  seed: f32,
  innerValue: f32,
  outerValue: f32,
  aspectRatio: f32,
  viewportWidth: f32,
  viewportHeight: f32,
}

@group(0) @binding(0) var<uniform> params: BlobGrayscaleMaskParams;

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let aspectRatio = params.aspectRatio;
  let viewportWidth = params.viewportWidth;
  let viewportHeight = params.viewportHeight;

  let uv = vec2f(pos.x / viewportWidth, pos.y / viewportHeight);

  // 中心からの差分を計算
  let center = vec2f(params.centerX, params.centerY);
  var delta = uv - center;

  // アスペクト比補正
  if (aspectRatio > 1.0) {
    delta.x *= aspectRatio;
  } else {
    delta.y /= aspectRatio;
  }

  // ピクセルの角度を計算
  let angle = atan2(delta.y, delta.x);

  // 滑らかな波形で半径を変調
  let waveValue = smoothBlob(angle, params.seed, params.octaves);

  // 半径に揺らぎを加える
  let radius = params.baseRadius * (1.0 + waveValue * params.amplitude);

  // 中心からの距離
  let dist = length(delta);

  // アンチエイリアス付きのマスク
  let pixelSize = 1.0 / min(viewportWidth, viewportHeight);
  let aa = smoothstep(radius - pixelSize, radius + pixelSize, dist);

  let value = mix(params.innerValue, params.outerValue, aa);
  return vec4f(value, value, value, 1.0);
}
`

/**
 * Create render spec for blob grayscale mask
 */
export function createBlobGrayscaleMaskSpec(
  params: BlobGrayscaleMaskParams,
  viewport: Viewport
): TextureRenderSpec {
  const aspectRatio = viewport.width / viewport.height

  // Build uniform buffer manually due to mixed types (f32 + u32)
  const buffer = new ArrayBuffer(48)
  const floatView = new Float32Array(buffer)
  const uintView = new Uint32Array(buffer)

  // centerX (f32) - offset 0
  floatView[0] = params.centerX
  // centerY (f32) - offset 4
  floatView[1] = params.centerY
  // baseRadius (f32) - offset 8
  floatView[2] = params.baseRadius
  // amplitude (f32) - offset 12
  floatView[3] = params.amplitude
  // frequency (f32) - offset 16
  floatView[4] = params.frequency
  // octaves (u32) - offset 20
  uintView[5] = params.octaves
  // seed (f32) - offset 24
  floatView[6] = params.seed
  // innerValue (f32) - offset 28
  floatView[7] = params.innerValue
  // outerValue (f32) - offset 32
  floatView[8] = params.outerValue
  // aspectRatio (f32) - offset 36
  floatView[9] = aspectRatio
  // viewportWidth (f32) - offset 40
  floatView[10] = viewport.width
  // viewportHeight (f32) - offset 44
  floatView[11] = viewport.height

  return {
    shader: blobGrayscaleMaskShader,
    uniforms: buffer,
    bufferSize: 48,
  }
}

// ============================================================
// Perlin Grayscale Mask
// ============================================================

/** Perlin noiseグレースケールマスクシェーダー */
export const perlinGrayscaleMaskShader = /* wgsl */ `
${fullscreenVertex}

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

struct PerlinGrayscaleMaskParams {
  seed: f32,
  threshold: f32,
  scale: f32,
  octaves: f32,
  innerValue: f32,
  outerValue: f32,
  viewportWidth: f32,
  viewportHeight: f32,
}

@group(0) @binding(0) var<uniform> params: PerlinGrayscaleMaskParams;

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = vec2f(pos.x / params.viewportWidth, pos.y / params.viewportHeight);
  let noisePos = uv * params.scale + vec2f(params.seed * 0.1, params.seed * 0.073);

  let octaves = clamp(i32(params.octaves), 1, 8);
  let noise = perlinFbm(noisePos, octaves);

  // Binarize: noise > threshold -> inner, else -> outer
  let mask = select(0.0, 1.0, noise > params.threshold);

  let value = mix(params.outerValue, params.innerValue, mask);
  return vec4f(value, value, value, 1.0);
}
`

/**
 * Create render spec for perlin grayscale mask
 */
export function createPerlinGrayscaleMaskSpec(
  params: PerlinGrayscaleMaskParams,
  viewport: Viewport
): TextureRenderSpec {
  const data = new Float32Array([
    params.seed,
    params.threshold,
    params.scale,
    params.octaves,
    params.innerValue,
    params.outerValue,
    viewport.width,
    viewport.height,
  ])
  return {
    shader: perlinGrayscaleMaskShader,
    uniforms: data.buffer,
    bufferSize: 32,
  }
}

// ============================================================
// Union Type for Grayscale Mask Params
// ============================================================

export type GrayscaleMaskParams =
  | ({ type: 'circle' } & CircleGrayscaleMaskParams)
  | ({ type: 'rect' } & RectGrayscaleMaskParams)
  | ({ type: 'blob' } & BlobGrayscaleMaskParams)
  | ({ type: 'perlin' } & PerlinGrayscaleMaskParams)

/**
 * Create render spec for any grayscale mask type
 */
export function createGrayscaleMaskSpec(
  params: GrayscaleMaskParams,
  viewport: Viewport
): TextureRenderSpec {
  switch (params.type) {
    case 'circle':
      return createCircleGrayscaleMaskSpec(params, viewport)
    case 'rect':
      return createRectGrayscaleMaskSpec(params, viewport)
    case 'blob':
      return createBlobGrayscaleMaskSpec(params, viewport)
    case 'perlin':
      return createPerlinGrayscaleMaskSpec(params, viewport)
  }
}
