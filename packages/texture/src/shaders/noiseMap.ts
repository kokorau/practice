import { fullscreenVertex, interleavedGradientNoise } from './common'
import type { TextureRenderSpec } from '../Domain'

// ============================================================
// Parameter Types
// ============================================================

export interface NoiseMapParams {
  seed: number  // noise seed
}

// ============================================================
// Buffer Size
// ============================================================

/**
 * Uniform buffer size (16-byte aligned)
 * Layout:
 *   viewport: vec2f (8) + seed: f32 (4) + padding: f32 (4) = 16 bytes
 */
export const NOISE_MAP_BUFFER_SIZE = 16

// ============================================================
// WGSL Shader
// ============================================================

export const noiseMapShader = /* wgsl */ `
struct Params {
  viewport: vec2f,   // 8 bytes @ offset 0
  seed: f32,         // 4 bytes @ offset 8
  _pad: f32,         // 4 bytes @ offset 12
}                    // Total: 16 bytes

@group(0) @binding(0) var<uniform> params: Params;

${fullscreenVertex}

${interleavedGradientNoise}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  // IGN ノイズ (0-1)
  let noise = interleavedGradientNoise(pos.xy, params.seed);

  // グレースケールで出力
  return vec4f(noise, noise, noise, 1.0);
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
  data[3] = 0  // padding

  return {
    shader: noiseMapShader,
    uniforms: data.buffer,
    bufferSize: NOISE_MAP_BUFFER_SIZE,
  }
}
