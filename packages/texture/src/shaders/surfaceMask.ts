/**
 * Surface Mask Shader
 *
 * Combines a surface texture with a greymap mask to create proper alpha compositing.
 * The surface texture provides RGB color, and the greymap provides alpha.
 *
 * Input textures:
 * - texture0: Surface texture (RGB from surface pattern)
 * - texture1: Greymap mask (luminance = alpha)
 */

import { fullscreenVertex, maskBlendState } from './common'
import type { Viewport } from '../Domain'

// ============================================================
// Surface Mask Shader (Two-Texture)
// ============================================================

/** Surface mask shader that combines surface texture with greymap alpha */
export const surfaceMaskShader = /* wgsl */ `
${fullscreenVertex}

struct SurfaceMaskParams {
  viewportWidth: f32,
  viewportHeight: f32,
  _padding1: f32,
  _padding2: f32,
}

@group(0) @binding(0) var<uniform> params: SurfaceMaskParams;
@group(0) @binding(1) var inputSampler: sampler;
@group(0) @binding(2) var surfaceTexture: texture_2d<f32>;
@group(0) @binding(3) var maskTexture: texture_2d<f32>;

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = vec2f(pos.x / params.viewportWidth, pos.y / params.viewportHeight);

  // Sample surface color
  let surface = textureSample(surfaceTexture, inputSampler, uv);

  // Sample greymap mask
  // Greymap convention: 1 = opaque, 0 = transparent
  let mask = textureSample(maskTexture, inputSampler, uv);
  let maskAlpha = mask.r;

  // Combine: surface color with mask alpha
  let finalAlpha = surface.a * maskAlpha;

  // Premultiply alpha for correct blending
  return vec4f(surface.rgb * finalAlpha, finalAlpha);
}
`

/**
 * Spec for two-texture effect (surface + mask)
 */
export interface DualTextureSpec {
  shader: string
  uniforms: ArrayBuffer
  bufferSize: number
}

/**
 * Create render spec for surface mask shader
 *
 * @param viewport Viewport dimensions
 * @returns DualTextureSpec for use with applyDualTextureEffect
 */
export function createSurfaceMaskSpec(viewport: Viewport): DualTextureSpec {
  const data = new Float32Array([
    viewport.width,
    viewport.height,
    0, // padding
    0, // padding
  ])
  return {
    shader: surfaceMaskShader,
    uniforms: data.buffer,
    bufferSize: 16, // 4 floats = 16 bytes
  }
}

export { maskBlendState }
