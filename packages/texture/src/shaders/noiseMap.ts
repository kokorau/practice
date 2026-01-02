import { fullscreenVertex, hash21 } from './common'
import type { TextureRenderSpec } from '../Domain'

// ============================================================
// Parameter Types
// ============================================================

export interface NoiseMapParams {
  seed: number      // noise seed
  threshold: number // threshold for binary noise (0-1), 0.5 = 50% white/black
}

// ============================================================
// Buffer Size
// ============================================================

/**
 * Uniform buffer size (16-byte aligned)
 * Layout:
 *   viewport: vec2f (8) + seed: f32 (4) + threshold: f32 (4) = 16 bytes
 */
export const NOISE_MAP_BUFFER_SIZE = 16

// ============================================================
// WGSL Shader
// ============================================================

export const noiseMapShader = /* wgsl */ `
struct Params {
  viewport: vec2f,   // 8 bytes @ offset 0
  seed: f32,         // 4 bytes @ offset 8
  threshold: f32,    // 4 bytes @ offset 12
}                    // Total: 16 bytes

@group(0) @binding(0) var<uniform> params: Params;

${fullscreenVertex}

${hash21}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  // ホワイトノイズ (0-1)
  let noise = hash21(pos.xy + params.seed);

  // 二値化: noise >= threshold なら 1 (白), そうでなければ 0 (黒)
  let binary = select(0.0, 1.0, noise >= params.threshold);

  return vec4f(binary, binary, binary, 1.0);
}
`

// ============================================================
// Spec Creation
// ============================================================

export function createNoiseMapSpec(
  params: NoiseMapParams,
  viewport: { width: number; height: number }
): TextureRenderSpec {
  const data = new Float32Array(NOISE_MAP_BUFFER_SIZE / 4)

  data[0] = viewport.width
  data[1] = viewport.height
  data[2] = params.seed
  data[3] = params.threshold

  return {
    shader: noiseMapShader,
    uniforms: data.buffer,
    bufferSize: NOISE_MAP_BUFFER_SIZE,
  }
}
