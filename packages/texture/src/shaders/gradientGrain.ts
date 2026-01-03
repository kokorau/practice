import { fullscreenVertex, hash21 } from './common'
import type { TextureRenderSpec } from '../Domain'

// ============================================================
// Parameter Types
// ============================================================

export interface GradientGrainParams {
  angle: number  // degrees (0-360)
  colorA: [number, number, number, number]  // RGBA start color
  colorB: [number, number, number, number]  // RGBA end color
  seed: number  // noise seed
  sparsity: number  // sparsity factor (0=dense, 1=very sparse)
  curvePoints: number[]  // 7 Y values (0-1) for intensity curve
}

// ============================================================
// Buffer Size
// ============================================================

/**
 * Uniform buffer size (16-byte aligned)
 * Layout:
 *   viewport: vec2f (8) + angle: f32 (4) + seed: f32 (4) = 16 bytes
 *   colorA: vec4f = 16 bytes
 *   colorB: vec4f = 16 bytes
 *   sparsity: f32 (4) + _pad: vec3f (12) = 16 bytes
 *   curvePoints[0..3]: vec4f = 16 bytes
 *   curvePoints[4..6] + _pad: vec4f = 16 bytes
 *   Total: 96 bytes
 */
export const GRADIENT_GRAIN_BUFFER_SIZE = 96

// ============================================================
// WGSL Shader
// ============================================================

export const gradientGrainShader = /* wgsl */ `
struct Params {
  viewport: vec2f,
  angle: f32,
  seed: f32,
  colorA: vec4f,
  colorB: vec4f,
  sparsity: f32,
  _pad0: vec3f,
  curvePoints0: vec4f,
  curvePoints1: vec4f,
}

@group(0) @binding(0) var<uniform> params: Params;

${fullscreenVertex}

${hash21}

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

fn getPoint(idx: i32) -> f32 {
  switch(idx) {
    case 0: { return params.curvePoints0.x; }
    case 1: { return params.curvePoints0.y; }
    case 2: { return params.curvePoints0.z; }
    case 3: { return params.curvePoints0.w; }
    case 4: { return params.curvePoints1.x; }
    case 5: { return params.curvePoints1.y; }
    case 6: { return params.curvePoints1.z; }
    default: { return 0.0; }
  }
}

fn evaluateCurve(x: f32) -> f32 {
  let segmentF = x * 6.0;
  let segment = i32(floor(segmentF));
  let t = fract(segmentF);
  let i = clamp(segment, 0, 5);
  let p0 = getPoint(max(i - 1, 0));
  let p1 = getPoint(i);
  let p2 = getPoint(min(i + 1, 6));
  let p3 = getPoint(min(i + 2, 6));
  return clamp(catmullRom(p0, p1, p2, p3, t), 0.0, 1.0);
}

// 角度からグラデーション方向ベクトルを計算
fn getGradientDirection(angleDeg: f32) -> vec2f {
  let angleRad = (angleDeg - 90.0) * 3.14159265359 / 180.0;
  return vec2f(cos(angleRad), sin(angleRad));
}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / params.viewport;

  // グラデーション方向に沿った位置 t (0-1)
  let dir = getGradientDirection(params.angle);
  let centered = uv - vec2f(0.5, 0.5);
  let projected = dot(centered, dir);
  let t = clamp(projected + 0.5, 0.0, 1.0);

  // ベースのグラデーション色
  let baseColor = mix(params.colorA, params.colorB, t);

  // 2つの独立したノイズ (異なるseedで)
  let noiseA = hash21(pos.xy + params.seed);
  let noiseB = hash21(pos.xy + params.seed + 1000.0);

  // カーブを適用
  let curvedT = evaluateCurve(t);
  let curvedInvT = evaluateCurve(1.0 - t);

  // Grain(ColorA, LR): t=0で多く、t=1で少なく
  let thresholdA = 1.0 - curvedInvT * (1.0 - params.sparsity);
  let showA = noiseA >= thresholdA;

  // Grain(ColorB, RL): t=1で多く、t=0で少なく
  let thresholdB = 1.0 - curvedT * (1.0 - params.sparsity);
  let showB = noiseB >= thresholdB;

  // 合成: ColorA grain → ColorB grain → Base gradient
  var finalColor = baseColor;
  if (showB) {
    finalColor = params.colorB;
  }
  if (showA) {
    finalColor = params.colorA;
  }

  return finalColor;
}
`

// ============================================================
// Spec Creation
// ============================================================

export function createGradientGrainSpec(
  params: GradientGrainParams,
  viewport: { width: number; height: number }
): TextureRenderSpec {
  const data = new Float32Array(GRADIENT_GRAIN_BUFFER_SIZE / 4)

  // viewport (vec2f) + angle (f32) + seed (f32)
  data[0] = viewport.width
  data[1] = viewport.height
  data[2] = params.angle
  data[3] = params.seed

  // colorA (vec4f)
  data[4] = params.colorA[0]
  data[5] = params.colorA[1]
  data[6] = params.colorA[2]
  data[7] = params.colorA[3]

  // colorB (vec4f)
  data[8] = params.colorB[0]
  data[9] = params.colorB[1]
  data[10] = params.colorB[2]
  data[11] = params.colorB[3]

  // sparsity (f32) + padding (vec3f)
  data[12] = params.sparsity
  data[13] = 0  // _pad0.x
  data[14] = 0  // _pad0.y
  data[15] = 0  // _pad0.z

  // curvePoints[0..3]
  data[16] = params.curvePoints[0] ?? 0
  data[17] = params.curvePoints[1] ?? 1/6
  data[18] = params.curvePoints[2] ?? 2/6
  data[19] = params.curvePoints[3] ?? 3/6

  // curvePoints[4..6] + padding
  data[20] = params.curvePoints[4] ?? 4/6
  data[21] = params.curvePoints[5] ?? 5/6
  data[22] = params.curvePoints[6] ?? 1
  data[23] = 0  // padding

  return {
    shader: gradientGrainShader,
    uniforms: data.buffer,
    bufferSize: GRADIENT_GRAIN_BUFFER_SIZE,
  }
}
