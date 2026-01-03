import { fullscreenVertex, hash21, depthMapUtils, depthMapTypeToNumber, type DepthMapType } from './common'
import type { TextureRenderSpec } from '../Domain'

// ============================================================
// Parameter Types
// ============================================================

export interface GradientNoiseMapParams {
  depthMapType?: DepthMapType  // 'linear' | 'circular' | 'radial' | 'perlin'
  angle: number       // gradient direction (degrees) for linear
  centerX?: number    // 0-1, default 0.5
  centerY?: number    // 0-1, default 0.5
  circularInvert?: boolean
  radialStartAngle?: number  // degrees
  radialSweepAngle?: number  // degrees
  // Perlin noise params
  perlinScale?: number     // noise scale (1-20), default 4
  perlinOctaves?: number   // fBm octaves (1-8), default 4
  perlinSeed?: number      // random seed for perlin, default 42
  perlinContrast?: number  // contrast (0-3), default 1
  perlinOffset?: number    // offset (-0.5 to 0.5), default 0
  seed: number        // noise seed for grain
  sparsity: number    // sparsity factor (0=dense, 1=very sparse)
  curvePoints: number[] // 7 Y values (0-1) for intensity curve
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
 *   perlinContrast: f32 (4) + perlinOffset: f32 (4) + seed: f32 (4) + sparsity: f32 (4) = 16 bytes
 *   curvePoints[0..3]: vec4f (16) = 16 bytes
 *   curvePoints[4..6] + _pad: vec4f (16) = 16 bytes
 *   Total: 96 bytes
 */
export const GRADIENT_NOISE_MAP_BUFFER_SIZE = 96

// ============================================================
// WGSL Shader
// ============================================================

export const gradientNoiseMapShader = /* wgsl */ `
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
  seed: f32,               // 4 bytes @ offset 56
  sparsity: f32,           // 4 bytes @ offset 60
  curvePoints0: vec4f,     // 16 bytes @ offset 64 (points 0,1,2,3)
  curvePoints1: vec4f,     // 16 bytes @ offset 80 (points 4,5,6,_pad)
}                          // Total: 96 bytes

@group(0) @binding(0) var<uniform> params: Params;

${fullscreenVertex}

${hash21}

${depthMapUtils}

// Catmull-Rom spline interpolation
fn catmullRom(p0: f32, p1: f32, p2: f32, p3: f32, t: f32) -> f32 {
  let t2 = t * t;
  let t3 = t2 * t;
  return 0.5 * (
    (2.0 * p1) +
    (-p0 + p2) * t +
    (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * t2 +
    (-p0 + 3.0 * p1 - 3.0 * p2 + p3) * t3
  );
}

// Get curve point by index
fn getPoint(idx: i32) -> f32 {
  switch(idx) {
    case 0: { return params.curvePoints0.x; }
    case 1: { return params.curvePoints0.y; }
    case 2: { return params.curvePoints0.z; }
    case 3: { return params.curvePoints0.w; }
    case 4: { return params.curvePoints1.x; }
    case 5: { return params.curvePoints1.y; }
    case 6: { return params.curvePoints1.z; }
    default: { return 0.0; }
  }
}

// Evaluate 7-point curve using Catmull-Rom interpolation
fn evaluateCurve(x: f32) -> f32 {
  // Handle edge cases to ensure endpoints are reached
  if (x >= 1.0) {
    return getPoint(6);
  }
  if (x <= 0.0) {
    return getPoint(0);
  }

  let segmentF = x * 6.0;
  let segment = i32(floor(segmentF));
  let t = fract(segmentF);
  let i = clamp(segment, 0, 5);
  let p0 = getPoint(max(i - 1, 0));
  let p1 = getPoint(i);
  let p2 = getPoint(min(i + 1, 6));
  let p3 = getPoint(min(i + 2, 6));
  return clamp(catmullRom(p0, p1, p2, p3, t), 0.0, 1.0);
}

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

  // Apply curve
  let curvedT = evaluateCurve(t);

  // White noise (0-1)
  let noise = hash21(pos.xy + params.seed);

  // sparsity: 0=dense, 1=very sparse
  let threshold = 1.0 - curvedT * (1.0 - params.sparsity);
  let binary = select(0.0, 1.0, noise >= threshold);

  return vec4f(binary, binary, binary, 1.0);
}
`

// ============================================================
// Spec Creation
// ============================================================

export function createGradientNoiseMapSpec(
  params: GradientNoiseMapParams,
  viewport: { width: number; height: number }
): TextureRenderSpec {
  const data = new Float32Array(GRADIENT_NOISE_MAP_BUFFER_SIZE / 4)

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

  // perlin params continued + seed + sparsity
  data[12] = params.perlinContrast ?? 1
  data[13] = params.perlinOffset ?? 0
  data[14] = params.seed
  data[15] = params.sparsity

  // curvePoints[0..3]
  data[16] = params.curvePoints[0] ?? 0
  data[17] = params.curvePoints[1] ?? 1/6
  data[18] = params.curvePoints[2] ?? 2/6
  data[19] = params.curvePoints[3] ?? 3/6

  // curvePoints[4..6] + padding
  data[20] = params.curvePoints[4] ?? 4/6
  data[21] = params.curvePoints[5] ?? 5/6
  data[22] = params.curvePoints[6] ?? 1
  data[23] = 0  // padding

  return {
    shader: gradientNoiseMapShader,
    uniforms: data.buffer,
    bufferSize: GRADIENT_NOISE_MAP_BUFFER_SIZE,
  }
}
