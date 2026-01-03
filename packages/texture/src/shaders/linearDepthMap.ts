import { fullscreenVertex } from './common'
import type { TextureRenderSpec } from '../Domain'

// ============================================================
// Parameter Types
// ============================================================

export interface LinearDepthMapParams {
  angle: number  // degrees (0-360)
  centerX: number  // 0-1
  centerY: number  // 0-1
}

// ============================================================
// Buffer Size
// ============================================================

/**
 * Uniform buffer size (16-byte aligned)
 * Layout:
 *   viewport: vec2f (8) + angle: f32 (4) + padding: f32 (4) = 16 bytes
 *   center: vec2f (8) + padding: vec2f (8) = 16 bytes
 *   Total: 32 bytes
 */
export const LINEAR_DEPTH_MAP_BUFFER_SIZE = 32

// ============================================================
// WGSL Shader
// ============================================================

export const linearDepthMapShader = /* wgsl */ `
struct Params {
  viewport: vec2f,   // 8 bytes @ offset 0
  angle: f32,        // 4 bytes @ offset 8
  _pad0: f32,        // 4 bytes @ offset 12
  center: vec2f,     // 8 bytes @ offset 16
  _pad1: vec2f,      // 8 bytes @ offset 24
}                    // Total: 32 bytes

@group(0) @binding(0) var<uniform> params: Params;

${fullscreenVertex}

// 角度からグラデーション方向ベクトルを計算
fn getGradientDirection(angleDeg: f32) -> vec2f {
  let angleRad = (angleDeg - 90.0) * 3.14159265359 / 180.0;
  return vec2f(cos(angleRad), sin(angleRad));
}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  // 正規化座標 (0-1)
  let uv = pos.xy / params.viewport;

  // グラデーション方向
  let dir = getGradientDirection(params.angle);

  // 中心からの相対位置を計算
  let centered = uv - params.center;
  let projected = dot(centered, dir);

  // -0.5〜0.5 を 0〜1 にマッピング
  let t = clamp(projected + 0.5, 0.0, 1.0);

  // グレースケールで出力 (t = 深度)
  return vec4f(t, t, t, 1.0);
}
`

// ============================================================
// Spec Creation
// ============================================================

export function createLinearDepthMapSpec(
  params: LinearDepthMapParams,
  viewport: { width: number; height: number }
): TextureRenderSpec {
  const data = new Float32Array(LINEAR_DEPTH_MAP_BUFFER_SIZE / 4)

  data[0] = viewport.width
  data[1] = viewport.height
  data[2] = params.angle
  data[3] = 0  // padding
  data[4] = params.centerX
  data[5] = params.centerY
  data[6] = 0  // padding
  data[7] = 0  // padding

  return {
    shader: linearDepthMapShader,
    uniforms: data.buffer,
    bufferSize: LINEAR_DEPTH_MAP_BUFFER_SIZE,
  }
}
