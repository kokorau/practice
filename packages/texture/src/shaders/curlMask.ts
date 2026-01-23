import { fullscreenVertex, maskBlendState } from './common'
import type { TextureRenderSpec, Viewport } from '../Domain'

/**
 * Curl Noise Mask Parameters
 *
 * Curl noise creates flow-like patterns by computing the curl (rotation)
 * of a Perlin noise field. This produces divergence-free vector fields
 * that create organic, flowing boundaries.
 */
export interface CurlMaskParams {
  /** Random seed */
  seed: number
  /** Threshold for binarization (0.0-1.0) */
  threshold: number
  /** Noise scale (higher = more detail) */
  scale: number
  /** fBm octaves (1-8) */
  octaves: number
  /** Curl intensity - strength of the curl effect (0.1-2.0) */
  intensity: number
  /** Inner color (where curl magnitude > threshold) */
  innerColor: [number, number, number, number]
  /** Outer color (where curl magnitude <= threshold) */
  outerColor: [number, number, number, number]
  /** If true (default), curl > threshold is opaque. If false, reversed. */
  cutout?: boolean
}

/**
 * Curl Noise Mask Shader
 *
 * Computes 2D curl noise by taking the perpendicular gradient of a scalar noise field:
 *   curl.x = dNoise/dy
 *   curl.y = -dNoise/dx
 *
 * The magnitude of this vector creates organic, flow-like boundaries.
 */
export const curlMaskShader = /* wgsl */ `
${fullscreenVertex}

// Hash function for noise
fn curlHash21(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// Value noise
fn curlValueNoise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);

  let a = curlHash21(i);
  let b = curlHash21(i + vec2f(1.0, 0.0));
  let c = curlHash21(i + vec2f(0.0, 1.0));
  let d = curlHash21(i + vec2f(1.0, 1.0));

  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// fBm with configurable octaves
fn curlFbm(p: vec2f, octaves: i32) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var pos = p;

  for (var i = 0; i < octaves; i++) {
    value += amplitude * curlValueNoise(pos);
    pos *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

// Compute 2D curl of a scalar noise field
// Returns vec2f representing the curl vector (rotated gradient)
fn computeCurl(p: vec2f, octaves: i32) -> vec2f {
  let eps = 0.01;

  // Compute partial derivatives using central differences
  let dx = curlFbm(p + vec2f(eps, 0.0), octaves) - curlFbm(p - vec2f(eps, 0.0), octaves);
  let dy = curlFbm(p + vec2f(0.0, eps), octaves) - curlFbm(p - vec2f(0.0, eps), octaves);

  // Curl in 2D: rotate gradient by 90 degrees
  // curl = (dN/dy, -dN/dx)
  return vec2f(dy, -dx) / (2.0 * eps);
}

struct CurlMaskParams {
  innerColor: vec4f,
  outerColor: vec4f,
  seed: f32,
  threshold: f32,
  scale: f32,
  octaves: f32,
  intensity: f32,
  viewportWidth: f32,
  viewportHeight: f32,
  _pad: f32,
}

@group(0) @binding(0) var<uniform> params: CurlMaskParams;

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = vec2f(pos.x / params.viewportWidth, pos.y / params.viewportHeight);
  let noisePos = uv * params.scale + vec2f(params.seed * 0.1, params.seed * 0.073);

  let octaves = clamp(i32(params.octaves), 1, 8);
  let curl = computeCurl(noisePos, octaves);

  // Use curl magnitude as the mask value
  let magnitude = length(curl) * params.intensity;

  // Binarize: magnitude > threshold -> inner, else -> outer
  let mask = select(0.0, 1.0, magnitude > params.threshold);

  return mix(params.outerColor, params.innerColor, mask);
}
`

/**
 * Create render spec for curl noise mask
 */
export function createCurlMaskSpec(
  params: CurlMaskParams,
  viewport: Viewport
): TextureRenderSpec {
  const cutout = params.cutout ?? true
  // When cutout=false, swap inner/outer colors
  const innerColor = cutout ? params.innerColor : params.outerColor
  const outerColor = cutout ? params.outerColor : params.innerColor

  const data = new Float32Array([
    ...innerColor,
    ...outerColor,
    params.seed,
    params.threshold,
    params.scale,
    params.octaves,
    params.intensity,
    viewport.width,
    viewport.height,
    0, // padding
  ])
  return {
    shader: curlMaskShader,
    uniforms: data.buffer,
    bufferSize: 64, // 16 floats = 64 bytes (16-byte aligned)
    blend: maskBlendState,
  }
}
