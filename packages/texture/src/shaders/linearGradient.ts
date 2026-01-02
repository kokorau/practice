import { fullscreenVertex } from './common'
import type { TextureRenderSpec } from '../Domain'

// ============================================================
// Parameter Types
// ============================================================

export interface ColorStop {
  color: [number, number, number, number]  // RGBA (0-1)
  position: number  // 0-1
}

export interface LinearGradientParams {
  angle: number  // degrees (0-360)
  stops: ColorStop[]  // max 8 stops
}

// ============================================================
// Buffer Size
// ============================================================

/**
 * Uniform buffer size (16-byte aligned)
 * Layout:
 *   viewport: vec2f (8) + angle: f32 (4) + stopCount: f32 (4) = 16 bytes
 *   stops[8]: each { color: vec4f (16) + position: f32 (4) + padding: vec3f (12) } = 32 bytes
 *   Total: 16 + 32 * 8 = 272 bytes
 */
export const LINEAR_GRADIENT_BUFFER_SIZE = 272

// ============================================================
// WGSL Shader
// ============================================================

export const linearGradientShader = /* wgsl */ `
struct ColorStop {
  color: vec4f,      // 16 bytes @ offset 0
  position: f32,     // 4 bytes @ offset 16
  _pad0: f32,        // 4 bytes @ offset 20
  _pad1: f32,        // 4 bytes @ offset 24
  _pad2: f32,        // 4 bytes @ offset 28
}                    // Total: 32 bytes

struct Params {
  viewport: vec2f,   // 8 bytes @ offset 0
  angle: f32,        // 4 bytes @ offset 8
  stopCount: f32,    // 4 bytes @ offset 12
  stops: array<ColorStop, 8>,  // 32 * 8 = 256 bytes @ offset 16
}                    // Total: 272 bytes

@group(0) @binding(0) var<uniform> params: Params;

${fullscreenVertex}

// 角度からグラデーション方向ベクトルを計算
fn getGradientDirection(angleDeg: f32) -> vec2f {
  let angleRad = (angleDeg - 90.0) * 3.14159265359 / 180.0;
  return vec2f(cos(angleRad), sin(angleRad));
}

// 位置 t (0-1) に対応する色を計算（2 stop 固定版）
fn sampleGradient(t: f32) -> vec4f {
  let color0 = params.stops[0].color;
  let color1 = params.stops[1].color;
  let pos0 = params.stops[0].position;
  let pos1 = params.stops[1].position;

  // clamp t to valid range
  let clamped = clamp(t, pos0, pos1);

  // 補間
  let range = pos1 - pos0;
  if (range <= 0.0) {
    return color0;
  }
  let localT = (clamped - pos0) / range;
  return mix(color0, color1, localT);
}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  // 正規化座標 (0-1)
  let uv = pos.xy / params.viewport;

  // グラデーション方向
  let dir = getGradientDirection(params.angle);

  // 中心を(0.5, 0.5)として、方向に沿った位置を計算
  let centered = uv - vec2f(0.5, 0.5);
  let projected = dot(centered, dir);

  // -0.5〜0.5 を 0〜1 にマッピング
  let t = projected + 0.5;

  return sampleGradient(t);
}
`

// ============================================================
// Spec Creation
// ============================================================

export function createLinearGradientSpec(
  params: LinearGradientParams,
  viewport: { width: number; height: number }
): TextureRenderSpec {
  const stops = params.stops.slice(0, 8)  // max 8 stops
  const stopCount = stops.length

  // Sort stops by position
  const sortedStops = [...stops].sort((a, b) => a.position - b.position)

  // Create uniform buffer
  const data = new Float32Array(LINEAR_GRADIENT_BUFFER_SIZE / 4)

  // viewport (vec2f) + angle (f32) + stopCount (f32)
  data[0] = viewport.width
  data[1] = viewport.height
  data[2] = params.angle
  data[3] = stopCount

  // stops array (each stop = 8 floats: color(4) + position(1) + padding(3))
  for (let i = 0; i < 8; i++) {
    const offset = 4 + i * 8  // 4 floats header + 8 floats per stop
    const stop = sortedStops[i]
    if (stop) {
      data[offset] = stop.color[0]
      data[offset + 1] = stop.color[1]
      data[offset + 2] = stop.color[2]
      data[offset + 3] = stop.color[3]
      data[offset + 4] = stop.position
      // padding (5, 6, 7) = 0
    }
    // Unused stops remain as 0
  }

  return {
    shader: linearGradientShader,
    uniforms: data.buffer,
    bufferSize: LINEAR_GRADIENT_BUFFER_SIZE,
  }
}
