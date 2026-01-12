import { fullscreenVertex } from './common'
import type { Viewport } from '../Domain'

/**
 * Circle vignette parameters
 */
export interface CircleVignetteParams {
  /** Vignette color (RGBA) */
  color: [number, number, number, number]
  /** Vignette intensity (0.0-1.0) */
  intensity: number
  /** Vignette radius (0.0-1.5) */
  radius: number
  /** Edge softness (0.0-1.0) */
  softness: number
  /** Center X position (0.0-1.0) */
  centerX: number
  /** Center Y position (0.0-1.0) */
  centerY: number
}

/**
 * Circle vignette shader
 * Creates a true circular vignette (ignores viewport aspect ratio)
 */
export const circleVignetteShader = /* wgsl */ `
struct Uniforms {
  color: vec4f,           // 16 bytes
  intensity: f32,         // 4 bytes
  radius: f32,            // 4 bytes
  softness: f32,          // 4 bytes
  centerX: f32,           // 4 bytes
  centerY: f32,           // 4 bytes
  viewportWidth: f32,     // 4 bytes
  viewportHeight: f32,    // 4 bytes
  _padding: f32,          // 4 bytes (alignment to 16)
}

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var inputSampler: sampler;
@group(0) @binding(2) var inputTexture: texture_2d<f32>;

${fullscreenVertex}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let texSize = vec2f(u.viewportWidth, u.viewportHeight);
  let uv = pos.xy / texSize;

  // Get original pixel color
  let originalColor = textureSample(inputTexture, inputSampler, uv);

  // Skip transparent areas (protect mask boundaries)
  if (originalColor.a < 0.01) {
    return originalColor;
  }

  // Normalized coordinates relative to center (-1.0 to 1.0)
  let center = vec2f(u.centerX, u.centerY);
  let normUv = (uv - center) * 2.0;

  // No aspect ratio correction - true circle
  let dist = length(normUv);

  // Vignette factor (0.0 = no effect, 1.0 = full color)
  let vignetteFactor = smoothstep(u.radius, u.radius + u.softness, dist) * u.intensity;

  // Blend original color with vignette color
  let resultColor = mix(originalColor.rgb, u.color.rgb, vignetteFactor);

  return vec4f(resultColor, originalColor.a);
}
`

export const CIRCLE_VIGNETTE_BUFFER_SIZE = 48

/**
 * Create uniforms for circle vignette shader
 */
export const createCircleVignetteUniforms = (
  params: CircleVignetteParams,
  viewport: Viewport
): ArrayBuffer => {
  const uniforms = new ArrayBuffer(CIRCLE_VIGNETTE_BUFFER_SIZE)
  const view = new DataView(uniforms)

  // color (vec4f) - offset 0-15
  view.setFloat32(0, params.color[0], true)
  view.setFloat32(4, params.color[1], true)
  view.setFloat32(8, params.color[2], true)
  view.setFloat32(12, params.color[3], true)

  // intensity, radius, softness, centerX - offset 16-31
  view.setFloat32(16, params.intensity, true)
  view.setFloat32(20, params.radius, true)
  view.setFloat32(24, params.softness, true)
  view.setFloat32(28, params.centerX, true)

  // centerY, viewportWidth, viewportHeight, padding - offset 32-47
  view.setFloat32(32, params.centerY, true)
  view.setFloat32(36, viewport.width, true)
  view.setFloat32(40, viewport.height, true)
  view.setFloat32(44, 0, true)

  return uniforms
}
