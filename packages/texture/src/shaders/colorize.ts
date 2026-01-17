/**
 * Colorize Shader
 *
 * Converts greymap texture to final RGBA output.
 * Takes a grayscale texture as input and applies color based on luminance values:
 * - White (1.0) → fully opaque keepColor
 * - Black (0.0) → fully transparent
 * - Gray → keepColor with partial alpha (no color interpolation)
 */

import { fullscreenVertex, maskBlendState } from './common'
import type { TextureRenderSpec, Viewport } from '../Domain'
import type { ColorizeParams, RGBA } from '../Domain/ValueObject/GreymapSpec'

// ============================================================
// Colorize Shader
// ============================================================

/** Colorize shader for greymap-to-RGBA conversion */
export const colorizeShader = /* wgsl */ `
${fullscreenVertex}

struct ColorizeParams {
  keepColor: vec4f,
  viewportWidth: f32,
  viewportHeight: f32,
  _padding1: f32,
  _padding2: f32,
}

@group(0) @binding(0) var<uniform> params: ColorizeParams;
@group(0) @binding(1) var inputSampler: sampler;
@group(0) @binding(2) var inputTexture: texture_2d<f32>;

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = vec2f(pos.x / params.viewportWidth, pos.y / params.viewportHeight);
  let texel = textureSample(inputTexture, inputSampler, uv);

  // Get luminance from greymap (stored in R channel, all channels are same)
  let luminance = texel.r;

  // Alpha = luminance * original alpha
  // White (1.0) = fully opaque, Black (0.0) = fully transparent
  var alpha: f32;
  if (texel.a < 0.001) {
    alpha = 0.0;
  } else {
    alpha = luminance * texel.a;
  }

  // Color is always keepColor (no interpolation with black)
  // This prevents dark edges and muddy gradients
  let color = params.keepColor.rgb;

  // Premultiply alpha for correct blending
  return vec4f(color * alpha, alpha);
}
`

/**
 * Create render spec for colorize shader
 *
 * @param params Colorize parameters (keepColor only)
 * @param viewport Viewport dimensions
 * @returns TextureRenderSpec for use with applyPostEffect
 */
export function createColorizeSpec(
  params: ColorizeParams,
  viewport: Viewport
): TextureRenderSpec {
  const data = new Float32Array([
    ...params.keepColor,
    viewport.width,
    viewport.height,
    0, // padding
    0, // padding
  ])
  return {
    shader: colorizeShader,
    uniforms: data.buffer,
    bufferSize: 32, // 8 floats = 32 bytes
    blend: maskBlendState,
    requiresTexture: true,
  }
}

// ============================================================
// Convenience Functions
// ============================================================

/**
 * Create colorize params for standard mask effect
 *
 * @param maskColor The color to show where mask is opaque (greymap=1)
 * @returns ColorizeParams
 */
export function createMaskColorizeParams(maskColor: RGBA): ColorizeParams {
  return {
    keepColor: maskColor,
  }
}
