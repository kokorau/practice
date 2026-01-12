import { fullscreenVertex } from './common'
import type { Viewport } from '../Domain'

/**
 * Ellipse vignette parameters
 */
export interface EllipseVignetteParams {
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
  /** Aspect ratio for ellipse shape */
  aspectRatio: number
}

/**
 * Ellipse vignette shader
 * Creates an elliptical vignette effect with customizable center and aspect ratio
 */
export const ellipseVignetteShader = /* wgsl */ `
struct Uniforms {
  color: vec4f,           // 16 bytes
  intensity: f32,         // 4 bytes
  radius: f32,            // 4 bytes
  softness: f32,          // 4 bytes
  centerX: f32,           // 4 bytes
  centerY: f32,           // 4 bytes
  aspectRatio: f32,       // 4 bytes
  viewportWidth: f32,     // 4 bytes
  viewportHeight: f32,    // 4 bytes
  _padding: vec3f,        // 12 bytes (alignment to 16)
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

  // Apply aspect ratio correction for ellipse shape
  let correctedUv = vec2f(normUv.x, normUv.y * u.aspectRatio);
  let dist = length(correctedUv);

  // Vignette factor (0.0 = no effect, 1.0 = full color)
  let vignetteFactor = smoothstep(u.radius, u.radius + u.softness, dist) * u.intensity;

  // Blend original color with vignette color
  let resultColor = mix(originalColor.rgb, u.color.rgb, vignetteFactor);

  return vec4f(resultColor, originalColor.a);
}
`

export const ELLIPSE_VIGNETTE_BUFFER_SIZE = 64

/**
 * Create uniforms for ellipse vignette shader
 */
export const createEllipseVignetteUniforms = (
  params: EllipseVignetteParams,
  viewport: Viewport
): ArrayBuffer => {
  const uniforms = new ArrayBuffer(ELLIPSE_VIGNETTE_BUFFER_SIZE)
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

  // centerY, aspectRatio, viewportWidth, viewportHeight - offset 32-47
  view.setFloat32(32, params.centerY, true)
  view.setFloat32(36, params.aspectRatio, true)
  view.setFloat32(40, viewport.width, true)
  view.setFloat32(44, viewport.height, true)

  // padding - offset 48-63
  view.setFloat32(48, 0, true)
  view.setFloat32(52, 0, true)
  view.setFloat32(56, 0, true)
  view.setFloat32(60, 0, true)

  return uniforms
}
