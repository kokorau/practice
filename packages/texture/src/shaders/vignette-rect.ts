import { fullscreenVertex } from './common'
import type { Viewport } from '../Domain'

/**
 * Rectangle vignette parameters
 */
export interface RectVignetteParams {
  /** Vignette color (RGBA) */
  color: [number, number, number, number]
  /** Vignette intensity (0.0-1.0) */
  intensity: number
  /** Edge softness (0.0-1.0) */
  softness: number
  /** Center X position (0.0-1.0) */
  centerX: number
  /** Center Y position (0.0-1.0) */
  centerY: number
  /** Rectangle width (0.0-1.0) */
  width: number
  /** Rectangle height (0.0-1.0) */
  height: number
  /** Corner radius (0.0-0.5) */
  cornerRadius: number
}

/**
 * Rectangle vignette shader
 * Creates a rectangular vignette with optional rounded corners
 */
export const rectVignetteShader = /* wgsl */ `
struct Uniforms {
  color: vec4f,           // 16 bytes
  intensity: f32,         // 4 bytes
  softness: f32,          // 4 bytes
  centerX: f32,           // 4 bytes
  centerY: f32,           // 4 bytes
  width: f32,             // 4 bytes
  height: f32,            // 4 bytes
  cornerRadius: f32,      // 4 bytes
  viewportWidth: f32,     // 4 bytes
  viewportHeight: f32,    // 4 bytes
  _padding: vec2f,        // 8 bytes (alignment to 16)
}

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var inputSampler: sampler;
@group(0) @binding(2) var inputTexture: texture_2d<f32>;

${fullscreenVertex}

// SDF for rounded rectangle
fn sdRoundedBox(p: vec2f, b: vec2f, r: f32) -> f32 {
  let q = abs(p) - b + r;
  return length(max(q, vec2f(0.0))) + min(max(q.x, q.y), 0.0) - r;
}

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

  // Normalized coordinates relative to center
  let center = vec2f(u.centerX, u.centerY);
  let normUv = uv - center;

  // Calculate SDF distance
  let halfSize = vec2f(u.width * 0.5, u.height * 0.5);
  let dist = sdRoundedBox(normUv, halfSize, u.cornerRadius * min(halfSize.x, halfSize.y));

  // Vignette factor (0.0 = no effect, 1.0 = full color)
  let vignetteFactor = smoothstep(0.0, u.softness, dist) * u.intensity;

  // Blend original color with vignette color
  let resultColor = mix(originalColor.rgb, u.color.rgb, vignetteFactor);

  return vec4f(resultColor, originalColor.a);
}
`

export const RECT_VIGNETTE_BUFFER_SIZE = 64

/**
 * Create uniforms for rectangle vignette shader
 */
export const createRectVignetteUniforms = (
  params: RectVignetteParams,
  viewport: Viewport
): ArrayBuffer => {
  const uniforms = new ArrayBuffer(RECT_VIGNETTE_BUFFER_SIZE)
  const view = new DataView(uniforms)

  // color (vec4f) - offset 0-15
  view.setFloat32(0, params.color[0], true)
  view.setFloat32(4, params.color[1], true)
  view.setFloat32(8, params.color[2], true)
  view.setFloat32(12, params.color[3], true)

  // intensity, softness, centerX, centerY - offset 16-31
  view.setFloat32(16, params.intensity, true)
  view.setFloat32(20, params.softness, true)
  view.setFloat32(24, params.centerX, true)
  view.setFloat32(28, params.centerY, true)

  // width, height, cornerRadius, viewportWidth - offset 32-47
  view.setFloat32(32, params.width, true)
  view.setFloat32(36, params.height, true)
  view.setFloat32(40, params.cornerRadius, true)
  view.setFloat32(44, viewport.width, true)

  // viewportHeight, padding - offset 48-63
  view.setFloat32(48, viewport.height, true)
  view.setFloat32(52, 0, true)
  view.setFloat32(56, 0, true)
  view.setFloat32(60, 0, true)

  return uniforms
}
