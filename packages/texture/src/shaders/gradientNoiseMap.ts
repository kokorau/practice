import { fullscreenVertex, hash21 } from './common'
import type { TextureRenderSpec } from '../Domain'

// ============================================================
// Parameter Types
// ============================================================

export interface GradientNoiseMapParams {
  angle: number       // gradient direction (degrees)
  seed: number        // noise seed
  sparsity: number    // sparsity factor (0=dense, 1=very sparse)
  curvePoints: number[] // 7 Y values (0-1) for intensity curve
}

// ============================================================
// Buffer Size
// ============================================================

/**
 * Uniform buffer size (16-byte aligned)
 * Layout:
 *   viewport: vec2f (8) + angle: f32 (4) + seed: f32 (4) = 16 bytes
 *   sparsity: f32 (4) + _pad: vec3f (12) = 16 bytes
 *   curvePoints[0..3]: vec4f (16) = 16 bytes
 *   curvePoints[4..6] + _pad: vec4f (16) = 16 bytes
 *   Total: 64 bytes
 */
export const GRADIENT_NOISE_MAP_BUFFER_SIZE = 64

// ============================================================
// WGSL Shader
// ============================================================

export const gradientNoiseMapShader = /* wgsl */ `
struct Params {
  viewport: vec2f,      // 8 bytes @ offset 0
  angle: f32,           // 4 bytes @ offset 8
  seed: f32,            // 4 bytes @ offset 12
  sparsity: f32,        // 4 bytes @ offset 16
  _pad0: f32,           // 4 bytes @ offset 20
  _pad1: f32,           // 4 bytes @ offset 24
  _pad2: f32,           // 4 bytes @ offset 28
  curvePoints0: vec4f,  // 16 bytes @ offset 32 (points 0,1,2,3)
  curvePoints1: vec4f,  // 16 bytes @ offset 48 (points 4,5,6,_pad)
}                       // Total: 64 bytes

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

// Get curve point by index
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

// Evaluate 7-point curve using Catmull-Rom interpolation
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

  // カーブを適用
  let curvedT = evaluateCurve(t);

  // ホワイトノイズ (0-1)
  let noise = hash21(pos.xy + params.seed);

  // sparsity: 0=dense, 1=very sparse
  let threshold = 1.0 - curvedT * (1.0 - params.sparsity);
  let binary = select(0.0, 1.0, noise >= threshold);

  return vec4f(binary, binary, binary, 1.0);
}
`

// ============================================================
// Spec Creation
// ============================================================

export function createGradientNoiseMapSpec(
  params: GradientNoiseMapParams,
  viewport: { width: number; height: number }
): TextureRenderSpec {
  const data = new Float32Array(GRADIENT_NOISE_MAP_BUFFER_SIZE / 4)

  // viewport + angle + seed
  data[0] = viewport.width
  data[1] = viewport.height
  data[2] = params.angle
  data[3] = params.seed

  // sparsity + padding
  data[4] = params.sparsity
  data[5] = 0  // _pad0.x
  data[6] = 0  // _pad0.y
  data[7] = 0  // _pad0.z

  // curvePoints[0..3]
  data[8] = params.curvePoints[0] ?? 0
  data[9] = params.curvePoints[1] ?? 1/6
  data[10] = params.curvePoints[2] ?? 2/6
  data[11] = params.curvePoints[3] ?? 3/6

  // curvePoints[4..6] + padding
  data[12] = params.curvePoints[4] ?? 4/6
  data[13] = params.curvePoints[5] ?? 5/6
  data[14] = params.curvePoints[6] ?? 1
  data[15] = 0  // padding

  return {
    shader: gradientNoiseMapShader,
    uniforms: data.buffer,
    bufferSize: GRADIENT_NOISE_MAP_BUFFER_SIZE,
  }
}
