import { fullscreenVertex } from './common'
import type { TextureRenderSpec } from '../Domain'

// ============================================================
// Parameter Types
// ============================================================

export interface CircularDepthMapParams {
  centerX: number  // 0-1 (default 0.5)
  centerY: number  // 0-1 (default 0.5)
  invert: boolean  // false: center=0, edge=1 / true: center=1, edge=0
}

// ============================================================
// Buffer Size
// ============================================================

/**
 * Uniform buffer size (16-byte aligned)
 * Layout:
 *   viewport: vec2f (8) + center: vec2f (8) + invert: f32 (4) + padding (12) = 32 bytes
 */
export const CIRCULAR_DEPTH_MAP_BUFFER_SIZE = 32

// ============================================================
// WGSL Shader
// ============================================================

export const circularDepthMapShader = /* wgsl */ `
struct Params {
  viewport: vec2f,   // 8 bytes @ offset 0
  center: vec2f,     // 8 bytes @ offset 8
  invert: f32,       // 4 bytes @ offset 16
  _pad1: f32,        // 4 bytes @ offset 20
  _pad2: f32,        // 4 bytes @ offset 24
  _pad3: f32,        // 4 bytes @ offset 28
}                    // Total: 32 bytes

@group(0) @binding(0) var<uniform> params: Params;

${fullscreenVertex}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  // 正規化座標 (0-1)
  let uv = pos.xy / params.viewport;

  // 中心からの距離を計算
  let diff = uv - params.center;

  // アスペクト比を考慮
  let aspect = params.viewport.x / params.viewport.y;
  let adjustedDiff = vec2f(diff.x * aspect, diff.y);

  // 距離を計算（最大距離で正規化）
  let maxDist = length(vec2f(0.5 * aspect, 0.5));
  let dist = length(adjustedDiff);
  var t = clamp(dist / maxDist, 0.0, 1.0);

  // 反転オプション
  if (params.invert > 0.5) {
    t = 1.0 - t;
  }

  return vec4f(t, t, t, 1.0);
}
`

// ============================================================
// Spec Creation
// ============================================================

export function createCircularDepthMapSpec(
  params: CircularDepthMapParams,
  viewport: { width: number; height: number }
): TextureRenderSpec {
  const data = new Float32Array(CIRCULAR_DEPTH_MAP_BUFFER_SIZE / 4)

  data[0] = viewport.width
  data[1] = viewport.height
  data[2] = params.centerX
  data[3] = params.centerY
  data[4] = params.invert ? 1.0 : 0.0
  data[5] = 0  // padding
  data[6] = 0  // padding
  data[7] = 0  // padding

  return {
    shader: circularDepthMapShader,
    uniforms: data.buffer,
    bufferSize: CIRCULAR_DEPTH_MAP_BUFFER_SIZE,
  }
}
