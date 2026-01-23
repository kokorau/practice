import { fullscreenVertex, aaUtils, maskBlendState } from './common'
import type { TextureRenderSpec, Viewport } from '../Domain'

/** Blobマスクのパラメータ */
export interface BlobMaskParams {
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
  /** 内側の色 */
  innerColor: [number, number, number, number]
  /** 外側の色 */
  outerColor: [number, number, number, number]
  /** If true (default), texture is rendered outside the shape (cutout). If false, texture fills the shape (solid). */
  cutout?: boolean
}

/** Smooth wave-based blob deformation */
const waveUtils = /* wgsl */ `
// 2D hash function for noise generation
fn blobHash21(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// 2D value noise with smooth interpolation
fn blobValueNoise2D(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);

  let a = blobHash21(i);
  let b = blobHash21(i + vec2f(1.0, 0.0));
  let c = blobHash21(i + vec2f(0.0, 1.0));
  let d = blobHash21(i + vec2f(1.0, 1.0));

  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// Get Fourier coefficient for frequency n, varying smoothly with seed
// Seed is sampled on a circle for seamless 0-100 looping
fn getFourierCoeff(seed: f32, n: u32) -> f32 {
  let tau = 6.283185307;
  let theta = seed * tau / 100.0;

  // Sample on circle in noise space (guarantees seed loop)
  let radius = 2.0;
  let x = cos(theta) * radius + f32(n) * 7.0;  // Offset per frequency
  let y = sin(theta) * radius;

  return blobValueNoise2D(vec2f(x, y)) * 2.0 - 1.0;
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
    value += amplitude * blobValueNoise2D(pos);
    pos *= 2.0;
    amplitude *= 0.5;
  }

  // Center around 0 for symmetric deformation
  return (value - 0.5) * 2.0;
}
`

/** Blobマスクシェーダー */
export const blobMaskShader = /* wgsl */ `
${fullscreenVertex}

${aaUtils}

${waveUtils}

struct BlobMaskParams {
  innerColor: vec4f,
  outerColor: vec4f,
  centerX: f32,
  centerY: f32,
  baseRadius: f32,
  amplitude: f32,
  frequency: f32,
  octaves: u32,
  seed: f32,
  aspectRatio: f32,
  viewportWidth: f32,
  viewportHeight: f32,
}

@group(0) @binding(0) var<uniform> params: BlobMaskParams;

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let aspectRatio = params.aspectRatio;
  let viewportWidth = params.viewportWidth;
  let viewportHeight = params.viewportHeight;

  let uv = vec2f(pos.x / viewportWidth, pos.y / viewportHeight);

  // 中心からの差分を計算
  let center = vec2f(params.centerX, params.centerY);
  var delta = uv - center;

  // アスペクト比補正（横長の場合はXを縮める）
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

  return mix(params.innerColor, params.outerColor, aa);
}
`

/**
 * Create render spec for blob mask
 */
export function createBlobMaskSpec(
  params: BlobMaskParams,
  viewport: Viewport
): TextureRenderSpec {
  const aspectRatio = viewport.width / viewport.height
  const cutout = params.cutout ?? true
  // When cutout=false (solid), swap inner/outer colors to fill the shape
  const innerColor = cutout ? params.innerColor : params.outerColor
  const outerColor = cutout ? params.outerColor : params.innerColor

  // Build uniform buffer manually due to mixed types (f32 + u32)
  const buffer = new ArrayBuffer(80)
  const floatView = new Float32Array(buffer)
  const uintView = new Uint32Array(buffer)

  // innerColor (vec4f) - offset 0
  floatView[0] = innerColor[0]
  floatView[1] = innerColor[1]
  floatView[2] = innerColor[2]
  floatView[3] = innerColor[3]
  // outerColor (vec4f) - offset 16
  floatView[4] = outerColor[0]
  floatView[5] = outerColor[1]
  floatView[6] = outerColor[2]
  floatView[7] = outerColor[3]
  // centerX (f32) - offset 32
  floatView[8] = params.centerX
  // centerY (f32) - offset 36
  floatView[9] = params.centerY
  // baseRadius (f32) - offset 40
  floatView[10] = params.baseRadius
  // amplitude (f32) - offset 44
  floatView[11] = params.amplitude
  // frequency (f32) - offset 48
  floatView[12] = params.frequency
  // octaves (u32) - offset 52
  uintView[13] = params.octaves
  // seed (f32) - offset 56
  floatView[14] = params.seed
  // aspectRatio (f32) - offset 60
  floatView[15] = aspectRatio
  // viewportWidth (f32) - offset 64
  floatView[16] = viewport.width
  // viewportHeight (f32) - offset 68
  floatView[17] = viewport.height

  return {
    shader: blobMaskShader,
    uniforms: buffer,
    bufferSize: 80,
    blend: maskBlendState,
  }
}
