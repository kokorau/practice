/**
 * Overlay Blend Shader
 *
 * Blends two textures using alpha compositing (Porter-Duff source-over).
 * Used by OverlayCompositorNode to combine multiple layers.
 *
 * Input textures:
 * - texture0: Base texture (bottom layer)
 * - texture1: Overlay texture (top layer)
 *
 * Output: Alpha-composited result
 */

import { fullscreenVertex} from './common'
import type { Viewport } from '../Domain'

// ============================================================
// Overlay Blend Shader (Two-Texture)
// ============================================================

/** Overlay blend shader that composites two textures with alpha blending */
export const overlayBlendShader = /* wgsl */ `
${fullscreenVertex}

struct OverlayBlendParams {
  viewportWidth: f32,
  viewportHeight: f32,
  _padding1: f32,
  _padding2: f32,
}

@group(0) @binding(0) var<uniform> params: OverlayBlendParams;
@group(0) @binding(1) var inputSampler: sampler;
@group(0) @binding(2) var baseTexture: texture_2d<f32>;
@group(0) @binding(3) var overlayTexture: texture_2d<f32>;

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = vec2f(pos.x / params.viewportWidth, pos.y / params.viewportHeight);

  // Sample both textures
  let base = textureSample(baseTexture, inputSampler, uv);
  let overlay = textureSample(overlayTexture, inputSampler, uv);

  // Porter-Duff source-over compositing
  // Formula: out = src + dst * (1 - src.a)
  // For premultiplied alpha:
  //   outColor = overlayColor + baseColor * (1 - overlayAlpha)
  //   outAlpha = overlayAlpha + baseAlpha * (1 - overlayAlpha)

  let outAlpha = overlay.a + base.a * (1.0 - overlay.a);

  // Avoid division by zero for fully transparent result
  if (outAlpha < 0.001) {
    return vec4f(0.0, 0.0, 0.0, 0.0);
  }

  // For premultiplied alpha input, the formula is simply additive
  let outColor = overlay.rgb + base.rgb * (1.0 - overlay.a);

  return vec4f(outColor, outAlpha);
}
`

/**
 * Buffer size for overlay blend uniform (16-byte aligned)
 */
export const OVERLAY_BLEND_BUFFER_SIZE = 16

/**
 * Spec for two-texture overlay blending
 */
export interface OverlayBlendSpec {
  shader: string
  uniforms: ArrayBuffer
  bufferSize: number
}

/**
 * Create render spec for overlay blend shader
 *
 * @param viewport Viewport dimensions
 * @returns OverlayBlendSpec for use with applyDualTextureEffectToOffscreen
 */
export function createOverlayBlendSpec(viewport: Viewport): OverlayBlendSpec {
  const data = new Float32Array([
    viewport.width,
    viewport.height,
    0, // padding
    0, // padding
  ])
  return {
    shader: overlayBlendShader,
    uniforms: data.buffer,
    bufferSize: OVERLAY_BLEND_BUFFER_SIZE,
  }
}
