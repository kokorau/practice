/**
 * Paper Texture Shader
 *
 * Creates a subtle paper-like texture with three combined layers:
 * 1. Fiber - paper fiber strands using ridge noise + domain warp
 * 2. Grain - fine dust particles using high-frequency noise + threshold
 * 3. Bump - pseudo lighting for surface depth
 *
 * Single color with subtle variations (±1-3% brightness modulation)
 */

import { fullscreenVertex, hash21 } from './common'
import type { TextureRenderSpec } from '../Domain'

// ============================================================
// Parameter Types
// ============================================================

export interface PaperTextureParams {
  color: [number, number, number, number] // RGBA base color
  fiberScale: number      // Fiber pattern scale (5-50)
  fiberStrength: number   // Fiber visibility (0-1)
  fiberWarp: number       // Domain warp amount (0-0.5)
  grainDensity: number    // Grain particle density (0-1)
  grainSize: number       // Grain particle size (0.5-3)
  bumpStrength: number    // Pseudo bump shading (0-0.1)
  lightAngle: number      // Light direction in degrees (0-360)
  seed: number            // Random seed
}

// ============================================================
// Buffer Size
// ============================================================

/**
 * Paper texture buffer layout (64 bytes):
 *   viewport: vec2f (8) + fiberScale: f32 (4) + fiberStrength: f32 (4) = 16 bytes
 *   fiberWarp: f32 (4) + grainDensity: f32 (4) + grainSize: f32 (4) + bumpStrength: f32 (4) = 16 bytes
 *   lightAngle: f32 (4) + seed: f32 (4) + _pad: vec2f (8) = 16 bytes
 *   color: vec4f = 16 bytes
 *   Total: 64 bytes
 */
export const PAPER_TEXTURE_BUFFER_SIZE = 64

// ============================================================
// Shader
// ============================================================

export const paperTextureShader = /* wgsl */ `
struct Params {
  viewport: vec2f,         // 8 bytes @ offset 0
  fiberScale: f32,         // 4 bytes @ offset 8
  fiberStrength: f32,      // 4 bytes @ offset 12
  fiberWarp: f32,          // 4 bytes @ offset 16
  grainDensity: f32,       // 4 bytes @ offset 20
  grainSize: f32,          // 4 bytes @ offset 24
  bumpStrength: f32,       // 4 bytes @ offset 28
  lightAngle: f32,         // 4 bytes @ offset 32
  seed: f32,               // 4 bytes @ offset 36
  _pad0: f32,              // 4 bytes @ offset 40
  _pad1: f32,              // 4 bytes @ offset 44
  color: vec4f,            // 16 bytes @ offset 48
}                          // Total: 64 bytes

@group(0) @binding(0) var<uniform> params: Params;

${fullscreenVertex}

const PI: f32 = 3.14159265359;

${hash21}

// Value noise for smooth random values
fn valueNoise(p: vec2f, seed: f32) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let seedOffset = vec2f(seed * 0.1, seed * 0.073);

  // Smooth interpolation
  let u = f * f * (3.0 - 2.0 * f);

  let a = hash21(i + vec2f(0.0, 0.0) + seedOffset);
  let b = hash21(i + vec2f(1.0, 0.0) + seedOffset);
  let c = hash21(i + vec2f(0.0, 1.0) + seedOffset);
  let d = hash21(i + vec2f(1.0, 1.0) + seedOffset);

  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// FBM (Fractal Brownian Motion) for layered noise
fn fbm(p: vec2f, octaves: i32, seed: f32) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var pos = p;
  var totalAmp = 0.0;

  for (var i = 0; i < octaves; i++) {
    value += amplitude * valueNoise(pos, seed + f32(i) * 10.0);
    totalAmp += amplitude;
    pos *= 2.0;
    amplitude *= 0.5;
  }

  return value / totalAmp;
}

// Ridge function: creates fiber-like linear structures
fn ridge(x: f32) -> f32 {
  return 1.0 - abs(2.0 * x - 1.0);
}

// Domain warp: displaces coordinates based on noise
fn domainWarp(p: vec2f, amount: f32, seed: f32) -> vec2f {
  let warpX = fbm(p * 3.0, 2, seed) * 2.0 - 1.0;
  let warpY = fbm(p * 3.0 + 100.0, 2, seed + 50.0) * 2.0 - 1.0;
  return p + vec2f(warpX, warpY) * amount;
}

// Fiber layer: paper fiber strands
fn fiberLayer(uv: vec2f, scale: f32, warpAmount: f32, seed: f32) -> f32 {
  // Apply domain warp for organic flow
  let warped = domainWarp(uv * scale, warpAmount, seed);

  // Get base noise and apply ridge for fiber effect
  let noise = fbm(warped, 3, seed);
  let fiber = ridge(noise);

  // Add directional bias (fibers tend to align slightly)
  let directional = fbm(warped * vec2f(1.0, 0.5), 2, seed + 200.0);

  return mix(fiber, fiber * ridge(directional), 0.3);
}

// Grain layer: fine dust particles
fn grainLayer(pos: vec2f, density: f32, size: f32, seed: f32) -> f32 {
  // High frequency noise for base grain
  let seedOffset = vec2f(seed * 0.1, seed * 0.073);
  let highFreq = hash21(pos / size + seedOffset);

  // Threshold with variation for organic distribution
  let threshold = 1.0 - density;
  let variation = fbm(pos * 0.01, 2, seed + 300.0) * 0.1;
  let adjustedThreshold = threshold + variation;

  // Smoothstep for soft grain edges
  let grain = smoothstep(adjustedThreshold - 0.05, adjustedThreshold + 0.05, highFreq);

  return grain;
}

// Pseudo bump shading using gradient
fn bumpShading(uv: vec2f, lightAngle: f32, seed: f32) -> f32 {
  let eps = 0.002;

  // Sample fiber pattern at offset positions
  let center = fiberLayer(uv, 20.0, 0.1, seed);
  let right = fiberLayer(uv + vec2f(eps, 0.0), 20.0, 0.1, seed);
  let up = fiberLayer(uv + vec2f(0.0, eps), 20.0, 0.1, seed);

  // Compute pseudo normal
  let dx = right - center;
  let dy = up - center;

  // Light direction from angle
  let lightRad = lightAngle * PI / 180.0;
  let lightDir = vec2f(cos(lightRad), sin(lightRad));

  // Simple dot product for shading
  let normal2d = normalize(vec2f(-dx, -dy) + 0.001);
  let shade = dot(normal2d, lightDir) * 0.5 + 0.5;

  return shade;
}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / params.viewport;

  // 1. Fiber layer
  let fiber = fiberLayer(uv, params.fiberScale, params.fiberWarp, params.seed);

  // 2. Grain layer
  let grain = grainLayer(pos.xy, params.grainDensity, params.grainSize, params.seed);

  // 3. Bump shading
  let bump = bumpShading(uv, params.lightAngle, params.seed);

  // Combine layers into brightness modulation
  // Fiber contributes subtle texture (-0.015 to +0.015)
  let fiberMod = (fiber - 0.5) * params.fiberStrength * 0.03;

  // Grain creates small dark spots (-0.02 to 0)
  let grainMod = -grain * params.grainDensity * 0.02;

  // Bump adds directional shading (-0.01 to +0.01)
  let bumpMod = (bump - 0.5) * params.bumpStrength * 0.2;

  // Total brightness modulation (kept very subtle: ±2-3%)
  let totalMod = fiberMod + grainMod + bumpMod;

  // Apply to base color
  let modulated = clamp(1.0 + totalMod, 0.95, 1.05);
  let finalColor = vec3f(
    params.color.r * modulated,
    params.color.g * modulated,
    params.color.b * modulated
  );

  return vec4f(clamp(finalColor, vec3f(0.0), vec3f(1.0)), params.color.a);
}
`

// ============================================================
// Spec Creation
// ============================================================

export function createPaperTextureSpec(
  params: PaperTextureParams,
  viewport: { width: number; height: number }
): TextureRenderSpec {
  const data = new Float32Array(PAPER_TEXTURE_BUFFER_SIZE / 4)

  // viewport + fiberScale + fiberStrength
  data[0] = viewport.width
  data[1] = viewport.height
  data[2] = params.fiberScale
  data[3] = params.fiberStrength

  // fiberWarp + grainDensity + grainSize + bumpStrength
  data[4] = params.fiberWarp
  data[5] = params.grainDensity
  data[6] = params.grainSize
  data[7] = params.bumpStrength

  // lightAngle + seed + padding
  data[8] = params.lightAngle
  data[9] = params.seed
  data[10] = 0 // padding
  data[11] = 0 // padding

  // color (vec4f)
  data[12] = params.color[0]
  data[13] = params.color[1]
  data[14] = params.color[2]
  data[15] = params.color[3]

  return {
    shader: paperTextureShader,
    uniforms: data.buffer,
    bufferSize: PAPER_TEXTURE_BUFFER_SIZE,
  }
}
