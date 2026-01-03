import { fullscreenVertex } from './common'
import type { TextureRenderSpec } from '../Domain'

// ============================================================
// Parameter Types
// ============================================================

export interface RadialDepthMapParams {
  centerX: number   // 0-1 (default 0.5)
  centerY: number   // 0-1 (default 0.5)
  startAngle: number  // degrees (0-360)
  sweepAngle: number  // degrees (default 360, full circle)
}

// ============================================================
// Buffer Size
// ============================================================

/**
 * Uniform buffer size (16-byte aligned)
 * Layout:
 *   viewport: vec2f (8) + center: vec2f (8) + startAngle: f32 (4) + sweepAngle: f32 (4) + padding (8) = 32 bytes
 */
export const RADIAL_DEPTH_MAP_BUFFER_SIZE = 32

// ============================================================
// WGSL Shader
// ============================================================

export const radialDepthMapShader = /* wgsl */ `
struct Params {
  viewport: vec2f,     // 8 bytes @ offset 0
  center: vec2f,       // 8 bytes @ offset 8
  startAngle: f32,     // 4 bytes @ offset 16 (degrees)
  sweepAngle: f32,     // 4 bytes @ offset 20 (degrees)
  _pad1: f32,          // 4 bytes @ offset 24
  _pad2: f32,          // 4 bytes @ offset 28
}                      // Total: 32 bytes

@group(0) @binding(0) var<uniform> params: Params;

${fullscreenVertex}

const PI: f32 = 3.14159265359;
const TWO_PI: f32 = 6.28318530718;

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  // 正規化座標 (0-1)
  let uv = pos.xy / params.viewport;

  // 中心からのベクトル
  let diff = uv - params.center;

  // 角度を計算 (atan2で-π〜πの範囲)
  var angle = atan2(diff.y, diff.x);

  // 0〜2πの範囲に変換
  if (angle < 0.0) {
    angle = angle + TWO_PI;
  }

  // 開始角度をラジアンに変換して適用
  let startRad = params.startAngle * PI / 180.0;
  angle = angle - startRad;

  // 0〜2πの範囲に正規化
  if (angle < 0.0) {
    angle = angle + TWO_PI;
  }
  if (angle > TWO_PI) {
    angle = angle - TWO_PI;
  }

  // sweepAngleでスケーリング
  let sweepRad = params.sweepAngle * PI / 180.0;
  var t = angle / sweepRad;
  t = clamp(t, 0.0, 1.0);

  return vec4f(t, t, t, 1.0);
}
`

// ============================================================
// Spec Creation
// ============================================================

export function createRadialDepthMapSpec(
  params: RadialDepthMapParams,
  viewport: { width: number; height: number }
): TextureRenderSpec {
  const data = new Float32Array(RADIAL_DEPTH_MAP_BUFFER_SIZE / 4)

  data[0] = viewport.width
  data[1] = viewport.height
  data[2] = params.centerX
  data[3] = params.centerY
  data[4] = params.startAngle
  data[5] = params.sweepAngle
  data[6] = 0  // padding
  data[7] = 0  // padding

  return {
    shader: radialDepthMapShader,
    uniforms: data.buffer,
    bufferSize: RADIAL_DEPTH_MAP_BUFFER_SIZE,
  }
}
