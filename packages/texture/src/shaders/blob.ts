import { fullscreenVertex, aaUtils } from './common'

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
  /** 揺らぎの周波数 (うねりの数、2-8程度) */
  frequency: number
  /** 詳細度のオクターブ数 (1-4) */
  octaves: number
  /** 乱数シード */
  seed: number
  /** 内側の色 */
  innerColor: [number, number, number, number]
  /** 外側の色 */
  outerColor: [number, number, number, number]
}

/** 2D Value Noise + fBm 実装 */
const noiseUtils = /* wgsl */ `
// Hash function for 2D -> 1D
fn hash21(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// 2D Value Noise
fn valueNoise2D(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);

  // Cubic interpolation (smoother than linear)
  let u = f * f * (3.0 - 2.0 * f);

  // Four corners
  let a = hash21(i + vec2f(0.0, 0.0));
  let b = hash21(i + vec2f(1.0, 0.0));
  let c = hash21(i + vec2f(0.0, 1.0));
  let d = hash21(i + vec2f(1.0, 1.0));

  // Bilinear interpolation
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// Fractal Brownian Motion (fBm)
fn fbm2D(p: vec2f, octaves: u32) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var frequency = 1.0;
  var maxValue = 0.0;
  var pos = p;

  for (var i = 0u; i < octaves; i++) {
    value += amplitude * valueNoise2D(pos * frequency);
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2.0;
    // Rotate to reduce axis-aligned artifacts
    pos = vec2f(pos.x * 0.8 - pos.y * 0.6, pos.x * 0.6 + pos.y * 0.8);
  }

  // Normalize to 0-1 range, then map to -1 to 1
  return (value / maxValue) * 2.0 - 1.0;
}
`

/** Blobマスクシェーダー */
export const blobMaskShader = /* wgsl */ `
${fullscreenVertex}

${aaUtils}

${noiseUtils}

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

  // 円上で2Dノイズをサンプリング（1周で滑らかにつながる）
  // cos/sinで円周上の座標を生成し、seedでオフセット
  let noiseCoord = vec2f(
    cos(angle) * params.frequency + params.seed,
    sin(angle) * params.frequency
  );
  let noiseValue = fbm2D(noiseCoord, params.octaves);

  // 半径に揺らぎを加える
  let radius = params.baseRadius * (1.0 + noiseValue * params.amplitude);

  // 中心からの距離
  let dist = length(delta);

  // アンチエイリアス付きのマスク
  let pixelSize = 1.0 / min(viewportWidth, viewportHeight);
  let aa = smoothstep(radius - pixelSize, radius + pixelSize, dist);

  return mix(params.innerColor, params.outerColor, aa);
}
`
