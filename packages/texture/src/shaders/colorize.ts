/**
 * Colorize Shader
 *
 * Converts greymap texture to final RGBA output.
 * Takes a grayscale texture as input and applies color based on luminance values:
 * - White (1.0) → keepColor
 * - Black (0.0) → cutoutColor
 * - Gray → interpolated color
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
  cutoutColor: vec4f,
  alphaMode: f32,
  viewportWidth: f32,
  viewportHeight: f32,
  _padding: f32,
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

  // Alpha handling based on mode
  var alpha: f32;
  if (params.alphaMode < 0.5) {
    // Mode 0: luminance becomes alpha (default)
    // White (1.0) = fully opaque keep, Black (0.0) = fully transparent cutout
    // If original alpha is 0, treat as full cutout
    if (texel.a < 0.001) {
      alpha = 0.0;
    } else {
      alpha = luminance * texel.a;
    }
  } else {
    // Mode 1: preserve original alpha from greymap
    alpha = texel.a;
  }

  // Color interpolation: cutoutColor at 0, keepColor at 1
  let color = mix(params.cutoutColor.rgb, params.keepColor.rgb, luminance);

  // Premultiply alpha for correct blending
  return vec4f(color * alpha, alpha);
}
`

/**
 * Create render spec for colorize shader
 *
 * @param params Colorize parameters (keepColor, cutoutColor, alphaMode)
 * @param viewport Viewport dimensions
 * @returns TextureRenderSpec for use with applyPostEffect
 */
export function createColorizeSpec(
  params: ColorizeParams,
  viewport: Viewport
): TextureRenderSpec {
  const data = new Float32Array([
    ...params.keepColor,
    ...params.cutoutColor,
    params.alphaMode,
    viewport.width,
    viewport.height,
    0, // padding
  ])
  return {
    shader: colorizeShader,
    uniforms: data.buffer,
    bufferSize: 48, // 12 floats = 48 bytes
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
 * @param transparent Whether cutout areas should be fully transparent (default: true)
 * @returns ColorizeParams
 */
export function createMaskColorizeParams(
  maskColor: RGBA,
  transparent: boolean = true
): ColorizeParams {
  return {
    keepColor: maskColor,
    cutoutColor: transparent ? [0, 0, 0, 0] : [0, 0, 0, 1],
    alphaMode: 0,
  }
}

/**
 * Create colorize params for dual-color effect
 *
 * @param color1 Color where greymap is white (1.0)
 * @param color2 Color where greymap is black (0.0)
 * @returns ColorizeParams
 */
export function createDualColorParams(
  color1: RGBA,
  color2: RGBA
): ColorizeParams {
  return {
    keepColor: color1,
    cutoutColor: color2,
    alphaMode: 1, // Preserve alpha to show both colors
  }
}
