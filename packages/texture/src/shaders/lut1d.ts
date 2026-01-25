/**
 * 1D LUT (Look-Up Table) Shader
 *
 * Applies per-channel color adjustment using 256-entry LUTs for R, G, B channels.
 * Used by FilterRenderNode for color correction effects.
 */

import { fullscreenVertex } from './common'
import type { Viewport } from '../Domain'

/**
 * LUT1D shader parameters
 */
export interface Lut1DParams {
  /** Red channel LUT (256 entries, 0.0-1.0) */
  lutR: Float32Array
  /** Green channel LUT (256 entries, 0.0-1.0) */
  lutG: Float32Array
  /** Blue channel LUT (256 entries, 0.0-1.0) */
  lutB: Float32Array
}

/**
 * 1D LUT shader for color correction
 *
 * Applies per-channel lookup using linear interpolation between LUT entries.
 * Input texture is sampled at full resolution, output preserves alpha.
 *
 * Binding layout:
 * - binding 0: uniform buffer (viewport + LUT data)
 * - binding 1: sampler
 * - binding 2: input texture
 */
export const lut1dShader = /* wgsl */ `
struct Uniforms {
  viewportWidth: f32,
  viewportHeight: f32,
  _padding1: f32,
  _padding2: f32,
  lutR: array<vec4f, 64>,  // 256 floats packed into vec4 (256/4 = 64)
  lutG: array<vec4f, 64>,
  lutB: array<vec4f, 64>,
}

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var inputSampler: sampler;
@group(0) @binding(2) var inputTexture: texture_2d<f32>;

${fullscreenVertex}

// Sample LUT with linear interpolation
fn sampleLut(lut: array<vec4f, 64>, value: f32) -> f32 {
  // Clamp input to valid range
  let v = clamp(value, 0.0, 1.0);

  // Calculate LUT index (0-255)
  let idx = v * 255.0;
  let lo = u32(floor(idx));
  let hi = min(lo + 1u, 255u);
  let t = fract(idx);

  // Unpack from vec4 array
  let loVec = lo / 4u;
  let loComp = lo % 4u;
  let hiVec = hi / 4u;
  let hiComp = hi % 4u;

  let loVal = lut[loVec][loComp];
  let hiVal = lut[hiVec][hiComp];

  // Linear interpolation
  return mix(loVal, hiVal, t);
}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let texSize = vec2f(u.viewportWidth, u.viewportHeight);
  let uv = pos.xy / texSize;

  let color = textureSample(inputTexture, inputSampler, uv);

  // Apply LUT to each channel
  let r = sampleLut(u.lutR, color.r);
  let g = sampleLut(u.lutG, color.g);
  let b = sampleLut(u.lutB, color.b);

  return vec4f(r, g, b, color.a);
}
`

// Buffer size: 16 bytes (viewport) + 3 * 256 * 4 bytes (LUTs) = 3088 bytes
// Align to 16 bytes: 3088 bytes
export const LUT1D_BUFFER_SIZE = 16 + 3 * 64 * 16 // 16 + 3072 = 3088 bytes

/**
 * Create uniforms buffer for LUT1D shader
 */
export const createLut1dUniforms = (
  params: Lut1DParams,
  viewport: Viewport
): ArrayBuffer => {
  const uniforms = new ArrayBuffer(LUT1D_BUFFER_SIZE)
  const view = new DataView(uniforms)
  const floatView = new Float32Array(uniforms)

  // Viewport params (offset 0)
  view.setFloat32(0, viewport.width, true)
  view.setFloat32(4, viewport.height, true)
  view.setFloat32(8, 0, true) // padding
  view.setFloat32(12, 0, true) // padding

  // LUT data (offset 16 = 4 floats)
  // Pack each 256-entry LUT into the buffer
  const lutROffset = 4 // 4 floats for viewport
  const lutGOffset = lutROffset + 256
  const lutBOffset = lutGOffset + 256

  for (let i = 0; i < 256; i++) {
    floatView[lutROffset + i] = params.lutR[i] ?? i / 255
    floatView[lutGOffset + i] = params.lutG[i] ?? i / 255
    floatView[lutBOffset + i] = params.lutB[i] ?? i / 255
  }

  return uniforms
}

/**
 * Create identity LUT (no transformation)
 */
export const createIdentityLut = (): Lut1DParams => {
  const identity = new Float32Array(256)
  for (let i = 0; i < 256; i++) {
    identity[i] = i / 255
  }
  return {
    lutR: identity.slice(),
    lutG: identity.slice(),
    lutB: identity.slice(),
  }
}
