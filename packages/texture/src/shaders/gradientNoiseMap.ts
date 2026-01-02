import { fullscreenVertex, hash21 } from './common'
import type { TextureRenderSpec } from '../Domain'

// ============================================================
// Parameter Types
// ============================================================

export interface GradientNoiseMapParams {
  angle: number    // gradient direction (degrees)
  seed: number     // noise seed
  power: number    // easing curve power (1=linear, 2=quadratic, 0.5=sqrt)
  sparsity: number // sparsity factor (0=dense, 1=very sparse)
}

// ============================================================
// Buffer Size
// ============================================================

/**
 * Uniform buffer size (16-byte aligned)
 * Layout:
 *   viewport: vec2f (8) + angle: f32 (4) + seed: f32 (4) = 16 bytes
 *   power: f32 (4) + sparsity: f32 (4) + padding: vec2f (8) = 16 bytes
 *   Total: 32 bytes
 */
export const GRADIENT_NOISE_MAP_BUFFER_SIZE = 32

// ============================================================
// WGSL Shader
// ============================================================

export const gradientNoiseMapShader = /* wgsl */ `
struct Params {
  viewport: vec2f,   // 8 bytes @ offset 0
  angle: f32,        // 4 bytes @ offset 8
  seed: f32,         // 4 bytes @ offset 12
  power: f32,        // 4 bytes @ offset 16
  sparsity: f32,     // 4 bytes @ offset 20
  _padding: vec2f,   // 8 bytes @ offset 24
}                    // Total: 32 bytes

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

  // イージングカーブを適用 (power=1で線形、2で二次、0.5でsqrt)
  let easedT = pow(t, params.power);

  // ホワイトノイズ (0-1)
  let noise = hash21(pos.xy + params.seed);

  // sparsity: 0=dense, 1=very sparse
  // threshold = 1 - easedT * (1 - sparsity)
  // sparsity=0: threshold = 1-easedT (元の動作)
  // sparsity=0.9: threshold = 1 - easedT * 0.1 (ほぼ白なし)
  let threshold = 1.0 - easedT * (1.0 - params.sparsity);
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
  data[4] = params.power
  data[5] = params.sparsity
  // data[6], data[7] = padding

  return {
    shader: gradientNoiseMapShader,
    uniforms: data.buffer,
    bufferSize: GRADIENT_NOISE_MAP_BUFFER_SIZE,
  }
}
