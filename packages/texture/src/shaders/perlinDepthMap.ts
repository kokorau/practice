import { fullscreenVertex, hash21, valueNoise } from './common'
import type { TextureRenderSpec } from '../Domain'

// ============================================================
// Parameter Types
// ============================================================

export interface PerlinDepthMapParams {
  scale: number       // noise scale (higher = more detail), default 4
  octaves: number     // fBm octaves (1-8), default 4
  seed: number        // random seed
  contrast: number    // contrast adjustment (0-2), default 1
  offset: number      // brightness offset (-1 to 1), default 0
}

// ============================================================
// Buffer Size
// ============================================================

/**
 * Uniform buffer size (16-byte aligned)
 * Layout:
 *   viewport: vec2f (8) + scale: f32 (4) + octaves: f32 (4) = 16 bytes
 *   seed: f32 (4) + contrast: f32 (4) + offset: f32 (4) + padding: f32 (4) = 16 bytes
 *   Total: 32 bytes
 */
export const PERLIN_DEPTH_MAP_BUFFER_SIZE = 32

// ============================================================
// WGSL Shader
// ============================================================

export const perlinDepthMapShader = /* wgsl */ `
struct Params {
  viewport: vec2f,   // 8 bytes @ offset 0
  scale: f32,        // 4 bytes @ offset 8
  octaves: f32,      // 4 bytes @ offset 12
  seed: f32,         // 4 bytes @ offset 16
  contrast: f32,     // 4 bytes @ offset 20
  offset: f32,       // 4 bytes @ offset 24
  _pad: f32,         // 4 bytes @ offset 28
}                    // Total: 32 bytes

@group(0) @binding(0) var<uniform> params: Params;

${fullscreenVertex}

${hash21}

${valueNoise}

// fBm with configurable octaves
fn fbmOctaves(p: vec2f, octaves: i32) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var pos = p;

  for (var i = 0; i < octaves; i++) {
    value += amplitude * valueNoise(pos);
    pos *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  // Normalized coordinates (0-1)
  let uv = pos.xy / params.viewport;

  // Apply scale and seed offset
  let noisePos = uv * params.scale + vec2f(params.seed * 0.1, params.seed * 0.073);

  // Calculate fBm noise with specified octaves
  let octaves = clamp(i32(params.octaves), 1, 8);
  var noise = fbmOctaves(noisePos, octaves);

  // Apply contrast and offset
  noise = (noise - 0.5) * params.contrast + 0.5 + params.offset;

  // Clamp to valid range
  let t = clamp(noise, 0.0, 1.0);

  // Output as grayscale (t = depth)
  return vec4f(t, t, t, 1.0);
}
`

// ============================================================
// Spec Creation
// ============================================================

export function createPerlinDepthMapSpec(
  params: PerlinDepthMapParams,
  viewport: { width: number; height: number }
): TextureRenderSpec {
  const data = new Float32Array(PERLIN_DEPTH_MAP_BUFFER_SIZE / 4)

  data[0] = viewport.width
  data[1] = viewport.height
  data[2] = params.scale
  data[3] = params.octaves
  data[4] = params.seed
  data[5] = params.contrast
  data[6] = params.offset
  data[7] = 0  // padding

  return {
    shader: perlinDepthMapShader,
    uniforms: data.buffer,
    bufferSize: PERLIN_DEPTH_MAP_BUFFER_SIZE,
  }
}
