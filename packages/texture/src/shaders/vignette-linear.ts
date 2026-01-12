import { fullscreenVertex } from './common'
import type { Viewport } from '../Domain'

/**
 * Linear vignette parameters
 */
export interface LinearVignetteParams {
  /** Vignette color (RGBA) */
  color: [number, number, number, number]
  /** Vignette intensity (0.0-1.0) */
  intensity: number
  /** Gradient angle in degrees (0-360) */
  angle: number
  /** Start position along gradient axis (0.0-1.0) */
  startOffset: number
  /** End position along gradient axis (0.0-1.0) */
  endOffset: number
}

/**
 * Linear vignette shader
 * Creates a linear gradient vignette along a specified angle
 */
export const linearVignetteShader = /* wgsl */ `
struct Uniforms {
  color: vec4f,           // 16 bytes
  intensity: f32,         // 4 bytes
  angle: f32,             // 4 bytes (in radians)
  startOffset: f32,       // 4 bytes
  endOffset: f32,         // 4 bytes
  viewportWidth: f32,     // 4 bytes
  viewportHeight: f32,    // 4 bytes
  _padding: vec2f,        // 8 bytes (alignment to 16)
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

  // Calculate gradient direction from angle
  let direction = vec2f(cos(u.angle), sin(u.angle));

  // Project UV onto gradient direction (centered at 0.5, 0.5)
  let centeredUv = uv - 0.5;
  let t = dot(centeredUv, direction) + 0.5;

  // Apply gradient with start/end offsets
  let gradientT = smoothstep(u.startOffset, u.endOffset, t);

  // Vignette factor
  let vignetteFactor = gradientT * u.intensity;

  // Blend original color with vignette color
  let resultColor = mix(originalColor.rgb, u.color.rgb, vignetteFactor);

  return vec4f(resultColor, originalColor.a);
}
`

export const LINEAR_VIGNETTE_BUFFER_SIZE = 48

/**
 * Create uniforms for linear vignette shader
 */
export const createLinearVignetteUniforms = (
  params: LinearVignetteParams,
  viewport: Viewport
): ArrayBuffer => {
  const uniforms = new ArrayBuffer(LINEAR_VIGNETTE_BUFFER_SIZE)
  const view = new DataView(uniforms)

  // Convert angle from degrees to radians
  const angleRadians = (params.angle * Math.PI) / 180

  // color (vec4f) - offset 0-15
  view.setFloat32(0, params.color[0], true)
  view.setFloat32(4, params.color[1], true)
  view.setFloat32(8, params.color[2], true)
  view.setFloat32(12, params.color[3], true)

  // intensity, angle, startOffset, endOffset - offset 16-31
  view.setFloat32(16, params.intensity, true)
  view.setFloat32(20, angleRadians, true)
  view.setFloat32(24, params.startOffset, true)
  view.setFloat32(28, params.endOffset, true)

  // viewportWidth, viewportHeight, padding - offset 32-47
  view.setFloat32(32, viewport.width, true)
  view.setFloat32(36, viewport.height, true)
  view.setFloat32(40, 0, true)
  view.setFloat32(44, 0, true)

  return uniforms
}
