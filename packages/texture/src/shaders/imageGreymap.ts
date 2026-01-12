/**
 * Image Greymap Shader
 *
 * Converts an image texture to grayscale for use as a mask source.
 * Uses luminance calculation (Rec. 709) to convert RGB to grayscale.
 * Supports optional inversion and threshold-based binarization.
 */

import { fullscreenVertex } from './common'
import type { TextureRenderSpec, Viewport } from '../Domain'
import type { ImageGreymapParams } from '../Domain/ValueObject/GreymapSpec'

// ============================================================
// Image Greymap Shader
// ============================================================

/** Image greymap shader */
export const imageGreymapShader = /* wgsl */ `
${fullscreenVertex}

@group(0) @binding(0) var imageSampler: sampler;
@group(0) @binding(1) var imageTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> params: ImageGreymapParams;

struct ImageGreymapParams {
  viewportWidth: f32,
  viewportHeight: f32,
  imageWidth: f32,
  imageHeight: f32,
  invert: f32,
  threshold: f32,
  _padding1: f32,
  _padding2: f32,
}

// Rec. 709 luminance coefficients
const LUMINANCE_COEFFS = vec3f(0.2126, 0.7152, 0.0722);

@fragment
fn fragmentMain(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
  let viewportAspect = params.viewportWidth / params.viewportHeight;
  let imageAspect = params.imageWidth / params.imageHeight;

  // Normalize coordinates to 0-1
  var uv = fragCoord.xy / vec2f(params.viewportWidth, params.viewportHeight);

  // Cover fit: scale to fill viewport while maintaining aspect ratio
  if (imageAspect > viewportAspect) {
    let scale = viewportAspect / imageAspect;
    uv.x = (uv.x - 0.5) * scale + 0.5;
  } else {
    let scale = imageAspect / viewportAspect;
    uv.y = (uv.y - 0.5) * scale + 0.5;
  }

  // Clamp UV to valid range
  uv = clamp(uv, vec2f(0.0), vec2f(1.0));

  let texel = textureSample(imageTexture, imageSampler, uv);

  // Calculate luminance from RGB
  var luminance = dot(texel.rgb, LUMINANCE_COEFFS);

  // Optional inversion
  if (params.invert > 0.5) {
    luminance = 1.0 - luminance;
  }

  // Optional threshold binarization (threshold > 0 enables it)
  if (params.threshold > 0.0) {
    luminance = select(0.0, 1.0, luminance > params.threshold);
  }

  // Preserve original alpha for cutout handling
  // If alpha is 0, the pixel should be treated as fully cut out
  return vec4f(luminance, luminance, luminance, texel.a);
}
`

/** Buffer size for image greymap shader uniforms */
export const IMAGE_GREYMAP_BUFFER_SIZE = 32 // 8 floats = 32 bytes

/**
 * Create uniform data for image greymap shader
 *
 * @param viewport Viewport dimensions
 * @param imageWidth Image width in pixels
 * @param imageHeight Image height in pixels
 * @param params Optional parameters (invert, threshold)
 * @returns ArrayBuffer with uniform data
 */
export function createImageGreymapUniforms(
  viewport: Viewport,
  imageWidth: number,
  imageHeight: number,
  params?: ImageGreymapParams
): ArrayBuffer {
  const data = new Float32Array([
    viewport.width,
    viewport.height,
    imageWidth,
    imageHeight,
    params?.invert ? 1.0 : 0.0,
    params?.threshold ?? 0.0,
    0, // padding
    0, // padding
  ])
  return data.buffer
}

/**
 * Create render spec for image greymap
 *
 * Note: This spec requires an input texture (the image).
 * Use with TextureRenderer's image rendering capabilities.
 *
 * @param viewport Viewport dimensions
 * @param imageWidth Image width in pixels
 * @param imageHeight Image height in pixels
 * @param params Optional parameters (invert, threshold)
 * @returns TextureRenderSpec
 */
export function createImageGreymapSpec(
  viewport: Viewport,
  imageWidth: number,
  imageHeight: number,
  params?: ImageGreymapParams
): TextureRenderSpec {
  return {
    shader: imageGreymapShader,
    uniforms: createImageGreymapUniforms(viewport, imageWidth, imageHeight, params),
    bufferSize: IMAGE_GREYMAP_BUFFER_SIZE,
    requiresTexture: true,
  }
}
