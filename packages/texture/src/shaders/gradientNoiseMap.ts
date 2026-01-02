import { fullscreenVertex, hash21 } from './common'
import type { TextureRenderSpec } from '../Domain'

// ============================================================
// Parameter Types
// ============================================================

export interface GradientNoiseMapParams {
  angle: number  // gradient direction (degrees)
  seed: number   // noise seed
}

// ============================================================
// Buffer Size
// ============================================================

/**
 * Uniform buffer size (16-byte aligned)
 * Layout:
 *   viewport: vec2f (8) + angle: f32 (4) + seed: f32 (4) = 16 bytes
 */
export const GRADIENT_NOISE_MAP_BUFFER_SIZE = 16

// ============================================================
// WGSL Shader
// ============================================================

export const gradientNoiseMapShader = /* wgsl */ `
struct Params {
  viewport: vec2f,   // 8 bytes @ offset 0
  angle: f32,        // 4 bytes @ offset 8
  seed: f32,         // 4 bytes @ offset 12
}                    // Total: 16 bytes

@group(0) @binding(0) var<uniform> params: Params;

${fullscreenVertex}

${hash21}

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

  // ホワイトノイズ (0-1)
  let noise = hash21(pos.xy + params.seed);

  // threshold = 1 - t: t=0で白なし、t=1で全部白
  let threshold = 1.0 - t;
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

  data[0] = viewport.width
  data[1] = viewport.height
  data[2] = params.angle
  data[3] = params.seed

  return {
    shader: gradientNoiseMapShader,
    uniforms: data.buffer,
    bufferSize: GRADIENT_NOISE_MAP_BUFFER_SIZE,
  }
}
