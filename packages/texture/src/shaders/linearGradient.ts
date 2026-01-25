import { fullscreenVertex, depthMapUtils, depthMapTypeToNumber, type DepthMapType } from './common'
import { generateColorRampData, type ColorStop } from './colorRampTexture'
import type { TextureRenderSpec } from '../Domain'

// Re-export for backward compatibility
export type { ColorStop }

// ============================================================
// Parameter Types
// ============================================================

export interface LinearGradientParams {
  depthMapType?: DepthMapType  // 'linear' | 'circular' | 'radial' | 'perlin' | 'curl'
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
  // Curl noise params
  curlIntensity?: number   // curl intensity (0.5-3), default 1
  // Repeat params
  repeat?: number          // repeat count (1 = no repeat), default 1
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
 *   perlinContrast: f32 (4) + perlinOffset: f32 (4) + curlIntensity: f32 (4) + repeat: f32 (4) = 16 bytes
 *   _pad (16) = 16 bytes
 *   Total: 80 bytes
 */
export const LINEAR_GRADIENT_BUFFER_SIZE = 80

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
  curlIntensity: f32,      // 4 bytes @ offset 56
  repeat: f32,             // 4 bytes @ offset 60
  _pad0: f32,              // 4 bytes @ offset 64
  _pad1: f32,              // 4 bytes @ offset 68
  _pad2: f32,              // 4 bytes @ offset 72
  _pad3: f32,              // 4 bytes @ offset 76
}                          // Total: 80 bytes

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var colorRampSampler: sampler;
@group(0) @binding(2) var colorRampTexture: texture_2d<f32>;

${fullscreenVertex}

${depthMapUtils}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / params.viewport;
  let aspect = params.viewport.x / params.viewport.y;

  // Calculate depth based on type (with perlin and curl support)
  var t = calculateDepthEx(
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
    params.perlinOffset,
    params.curlIntensity
  );

  // Apply repeat
  if (params.repeat > 1.0) {
    t = fract(t * params.repeat);
  }

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

  // perlin params continued + curl/repeat
  data[12] = params.perlinContrast ?? 1
  data[13] = params.perlinOffset ?? 0
  data[14] = params.curlIntensity ?? 1
  data[15] = params.repeat ?? 1

  // padding
  data[16] = 0  // _pad0
  data[17] = 0  // _pad1
  data[18] = 0  // _pad2
  data[19] = 0  // _pad3

  return {
    shader: linearGradientShader,
    uniforms: data.buffer,
    bufferSize: LINEAR_GRADIENT_BUFFER_SIZE,
    colorRampData,
  }
}

// ============================================================
// Convenience Spec Functions
// ============================================================

// Circular gradient (center outward)
export interface CircularGradientParams {
  centerX?: number
  centerY?: number
  circularInvert?: boolean
  stops: ColorStop[]
}

export function createCircularGradientSpec(
  params: CircularGradientParams,
  viewport: { width: number; height: number }
): TextureRenderSpec {
  return createLinearGradientSpec({
    depthMapType: 'circular',
    angle: 0,
    centerX: params.centerX,
    centerY: params.centerY,
    circularInvert: params.circularInvert,
    stops: params.stops,
  }, viewport)
}

// Conic gradient (angle-based)
export interface ConicGradientParams {
  centerX?: number
  centerY?: number
  radialStartAngle?: number
  radialSweepAngle?: number
  stops: ColorStop[]
}

export function createConicGradientSpec(
  params: ConicGradientParams,
  viewport: { width: number; height: number }
): TextureRenderSpec {
  return createLinearGradientSpec({
    depthMapType: 'radial',
    angle: 0,
    centerX: params.centerX,
    centerY: params.centerY,
    radialStartAngle: params.radialStartAngle,
    radialSweepAngle: params.radialSweepAngle,
    stops: params.stops,
  }, viewport)
}

// Repeat linear gradient
export interface RepeatLinearGradientParams {
  angle: number
  centerX?: number
  centerY?: number
  repeat: number
  stops: ColorStop[]
}

export function createRepeatLinearGradientSpec(
  params: RepeatLinearGradientParams,
  viewport: { width: number; height: number }
): TextureRenderSpec {
  return createLinearGradientSpec({
    depthMapType: 'linear',
    angle: params.angle,
    centerX: params.centerX,
    centerY: params.centerY,
    repeat: params.repeat,
    stops: params.stops,
  }, viewport)
}

// Perlin gradient
export interface PerlinGradientParams {
  perlinScale?: number
  perlinOctaves?: number
  perlinSeed?: number
  perlinContrast?: number
  perlinOffset?: number
  stops: ColorStop[]
}

export function createPerlinGradientSpec(
  params: PerlinGradientParams,
  viewport: { width: number; height: number }
): TextureRenderSpec {
  return createLinearGradientSpec({
    depthMapType: 'perlin',
    angle: 0,
    perlinScale: params.perlinScale,
    perlinOctaves: params.perlinOctaves,
    perlinSeed: params.perlinSeed,
    perlinContrast: params.perlinContrast,
    perlinOffset: params.perlinOffset,
    stops: params.stops,
  }, viewport)
}

// Curl gradient
export interface CurlGradientParams {
  perlinScale?: number
  perlinOctaves?: number
  perlinSeed?: number
  perlinContrast?: number
  perlinOffset?: number
  curlIntensity?: number
  stops: ColorStop[]
}

export function createCurlGradientSpec(
  params: CurlGradientParams,
  viewport: { width: number; height: number }
): TextureRenderSpec {
  return createLinearGradientSpec({
    depthMapType: 'curl',
    angle: 0,
    perlinScale: params.perlinScale,
    perlinOctaves: params.perlinOctaves,
    perlinSeed: params.perlinSeed,
    perlinContrast: params.perlinContrast,
    perlinOffset: params.perlinOffset,
    curlIntensity: params.curlIntensity,
    stops: params.stops,
  }, viewport)
}
