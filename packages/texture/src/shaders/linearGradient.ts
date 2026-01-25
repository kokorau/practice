import { fullscreenVertex, depthMapUtils, depthMapTypeToNumber, type DepthMapType } from './common'
import { generateColorRampData, type ColorStop } from './colorRampTexture'
import type { TextureRenderSpec } from '../Domain'

// Re-export for backward compatibility
export type { ColorStop }

// ============================================================
// Parameter Types
// ============================================================

export interface LinearGradientParams {
  depthMapType?: DepthMapType  // 'linear' | 'circular' | 'radial' | 'perlin'
  angle: number  // degrees (0-360) for linear
  centerX?: number    // 0-1, default 0.5
  centerY?: number    // 0-1, default 0.5
  circularInvert?: boolean
  radialStartAngle?: number  // degrees
  radialSweepAngle?: number  // degrees
  // Perlin noise params
  perlinScale?: number     // noise scale (1-20), default 4
  perlinOctaves?: number   // fBm octaves (1-8), default 4
  perlinSeed?: number      // random seed, default 42
  perlinContrast?: number  // contrast (0-3), default 1
  perlinOffset?: number    // offset (-0.5 to 0.5), default 0
  stops: ColorStop[]  // arbitrary number of stops (no limit)
}

// ============================================================
// Buffer Size
// ============================================================

/**
 * Uniform buffer size (16-byte aligned)
 * Layout:
 *   viewport: vec2f (8) + depthType: f32 (4) + angle: f32 (4) = 16 bytes
 *   center: vec2f (8) + circularInvert: f32 (4) + radialStartAngle: f32 (4) = 16 bytes
 *   radialSweepAngle: f32 (4) + perlinScale: f32 (4) + perlinOctaves: f32 (4) + perlinSeed: f32 (4) = 16 bytes
 *   perlinContrast: f32 (4) + perlinOffset: f32 (4) + _pad (8) = 16 bytes
 *   Total: 64 bytes
 */
export const LINEAR_GRADIENT_BUFFER_SIZE = 64

// ============================================================
// WGSL Shader
// ============================================================

export const linearGradientShader = /* wgsl */ `
struct Params {
  viewport: vec2f,         // 8 bytes @ offset 0
  depthType: f32,          // 4 bytes @ offset 8
  angle: f32,              // 4 bytes @ offset 12
  center: vec2f,           // 8 bytes @ offset 16
  circularInvert: f32,     // 4 bytes @ offset 24
  radialStartAngle: f32,   // 4 bytes @ offset 28
  radialSweepAngle: f32,   // 4 bytes @ offset 32
  perlinScale: f32,        // 4 bytes @ offset 36
  perlinOctaves: f32,      // 4 bytes @ offset 40
  perlinSeed: f32,         // 4 bytes @ offset 44
  perlinContrast: f32,     // 4 bytes @ offset 48
  perlinOffset: f32,       // 4 bytes @ offset 52
  _pad0: f32,              // 4 bytes @ offset 56
  _pad1: f32,              // 4 bytes @ offset 60
}                          // Total: 64 bytes

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var colorRampSampler: sampler;
@group(0) @binding(2) var colorRampTexture: texture_2d<f32>;

${fullscreenVertex}

${depthMapUtils}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / params.viewport;
  let aspect = params.viewport.x / params.viewport.y;

  // Calculate depth based on type (with perlin support)
  let t = calculateDepthEx(
    uv,
    params.depthType,
    params.angle,
    params.center,
    aspect,
    params.circularInvert,
    params.radialStartAngle,
    params.radialSweepAngle,
    params.perlinScale,
    params.perlinOctaves,
    params.perlinSeed,
    params.perlinContrast,
    params.perlinOffset
  );

  // Sample color from ramp texture
  return textureSample(colorRampTexture, colorRampSampler, vec2f(t, 0.5));
}
`

// ============================================================
// Spec Creation
// ============================================================

export function createLinearGradientSpec(
  params: LinearGradientParams,
  viewport: { width: number; height: number }
): TextureRenderSpec {
  // Generate color ramp data from stops (using OKLAB interpolation)
  const colorRampData = generateColorRampData(params.stops)

  // Create uniform buffer
  const data = new Float32Array(LINEAR_GRADIENT_BUFFER_SIZE / 4)

  // viewport + depthType + angle
  data[0] = viewport.width
  data[1] = viewport.height
  data[2] = depthMapTypeToNumber(params.depthMapType ?? 'linear')
  data[3] = params.angle

  // center + circularInvert + radialStartAngle
  data[4] = params.centerX ?? 0.5
  data[5] = params.centerY ?? 0.5
  data[6] = params.circularInvert ? 1.0 : 0.0
  data[7] = params.radialStartAngle ?? 0

  // radialSweepAngle + perlin params
  data[8] = params.radialSweepAngle ?? 360
  data[9] = params.perlinScale ?? 4
  data[10] = params.perlinOctaves ?? 4
  data[11] = params.perlinSeed ?? 42

  // perlin params continued + padding
  data[12] = params.perlinContrast ?? 1
  data[13] = params.perlinOffset ?? 0
  data[14] = 0  // _pad0
  data[15] = 0  // _pad1

  return {
    shader: linearGradientShader,
    uniforms: data.buffer,
    bufferSize: LINEAR_GRADIENT_BUFFER_SIZE,
    colorRampData,
  }
}
