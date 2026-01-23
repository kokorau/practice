import { fullscreenVertex, hash21, oklabUtils, type DepthMapType } from './common'
import type { TextureRenderSpec } from '../Domain'

// ============================================================
// Parameter Types
// ============================================================

export interface GradientGrainParams {
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
  perlinSeed?: number      // random seed for perlin, default 42
  perlinContrast?: number  // contrast (0-3), default 1
  perlinOffset?: number    // offset (-0.5 to 0.5), default 0
  colorA: [number, number, number, number]  // RGBA start color
  colorB: [number, number, number, number]  // RGBA end color
  seed: number  // noise seed for grain
  sparsity: number  // sparsity factor (0=dense, 1=very sparse)
  curvePoints: number[]  // 7 Y values (0-1) for intensity curve
}

// ============================================================
// Buffer Sizes (per DepthType)
// ============================================================

/**
 * Linear depth buffer layout (80 bytes):
 *   viewport: vec2f (8) + angle: f32 (4) + seed: f32 (4) = 16 bytes
 *   center: vec2f (8) + sparsity: f32 (4) + _pad: f32 (4) = 16 bytes
 *   colorA: vec4f = 16 bytes
 *   colorB: vec4f = 16 bytes
 *   curvePoints[0..3]: vec4f = 16 bytes
 *   curvePoints[4..6] + _pad: vec4f = 16 bytes (padding for consistent alignment)
 *   Total: 96 bytes
 */
export const GRADIENT_GRAIN_LINEAR_BUFFER_SIZE = 96

/**
 * Circular depth buffer layout (96 bytes):
 *   viewport: vec2f (8) + seed: f32 (4) + sparsity: f32 (4) = 16 bytes
 *   center: vec2f (8) + circularInvert: f32 (4) + _pad: f32 (4) = 16 bytes
 *   colorA: vec4f = 16 bytes
 *   colorB: vec4f = 16 bytes
 *   curvePoints[0..3]: vec4f = 16 bytes
 *   curvePoints[4..6] + _pad: vec4f = 16 bytes
 *   Total: 96 bytes
 */
export const GRADIENT_GRAIN_CIRCULAR_BUFFER_SIZE = 96

/**
 * Radial depth buffer layout (96 bytes):
 *   viewport: vec2f (8) + seed: f32 (4) + sparsity: f32 (4) = 16 bytes
 *   center: vec2f (8) + radialStartAngle: f32 (4) + radialSweepAngle: f32 (4) = 16 bytes
 *   colorA: vec4f = 16 bytes
 *   colorB: vec4f = 16 bytes
 *   curvePoints[0..3]: vec4f = 16 bytes
 *   curvePoints[4..6] + _pad: vec4f = 16 bytes
 *   Total: 96 bytes
 */
export const GRADIENT_GRAIN_RADIAL_BUFFER_SIZE = 96

/**
 * Perlin depth buffer layout (112 bytes):
 *   viewport: vec2f (8) + seed: f32 (4) + sparsity: f32 (4) = 16 bytes
 *   perlinScale: f32 (4) + perlinOctaves: f32 (4) + perlinSeed: f32 (4) + perlinContrast: f32 (4) = 16 bytes
 *   perlinOffset: f32 (4) + _pad: vec3f (12) = 16 bytes
 *   colorA: vec4f = 16 bytes
 *   colorB: vec4f = 16 bytes
 *   curvePoints[0..3]: vec4f = 16 bytes
 *   curvePoints[4..6] + _pad: vec4f = 16 bytes
 *   Total: 112 bytes
 */
export const GRADIENT_GRAIN_PERLIN_BUFFER_SIZE = 112


// ============================================================
// Common WGSL Utilities
// ============================================================

const gradientGrainCommon = /* wgsl */ `
const PI: f32 = 3.14159265359;
const TWO_PI: f32 = 6.28318530718;

${hash21}

${oklabUtils}

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

fn getPoint(curvePoints0: vec4f, curvePoints1: vec4f, idx: i32) -> f32 {
  switch(idx) {
    case 0: { return curvePoints0.x; }
    case 1: { return curvePoints0.y; }
    case 2: { return curvePoints0.z; }
    case 3: { return curvePoints0.w; }
    case 4: { return curvePoints1.x; }
    case 5: { return curvePoints1.y; }
    case 6: { return curvePoints1.z; }
    default: { return 0.0; }
  }
}

fn evaluateCurve(curvePoints0: vec4f, curvePoints1: vec4f, x: f32) -> f32 {
  if (x >= 1.0) {
    return getPoint(curvePoints0, curvePoints1, 6);
  }
  if (x <= 0.0) {
    return getPoint(curvePoints0, curvePoints1, 0);
  }

  let segmentF = x * 6.0;
  let segment = i32(floor(segmentF));
  let t = fract(segmentF);
  let i = clamp(segment, 0, 5);
  let p0 = getPoint(curvePoints0, curvePoints1, max(i - 1, 0));
  let p1 = getPoint(curvePoints0, curvePoints1, i);
  let p2 = getPoint(curvePoints0, curvePoints1, min(i + 1, 6));
  let p3 = getPoint(curvePoints0, curvePoints1, min(i + 2, 6));
  return clamp(catmullRom(p0, p1, p2, p3, t), 0.0, 1.0);
}

fn gradientGrainComposite(
  baseColor: vec4f,
  colorA: vec4f,
  colorB: vec4f,
  t: f32,
  noiseA: f32,
  noiseB: f32,
  sparsity: f32,
  curvePoints0: vec4f,
  curvePoints1: vec4f
) -> vec4f {
  let curvedT = evaluateCurve(curvePoints0, curvePoints1, t);
  let curvedInvT = evaluateCurve(curvePoints0, curvePoints1, 1.0 - t);

  let thresholdA = 1.0 - curvedInvT * (1.0 - sparsity);
  let showA = noiseA >= thresholdA;

  let thresholdB = 1.0 - curvedT * (1.0 - sparsity);
  let showB = noiseB >= thresholdB;

  var finalColor = baseColor;
  if (showB) {
    finalColor = colorB;
  }
  if (showA) {
    finalColor = colorA;
  }
  return finalColor;
}
`

// ============================================================
// Linear Depth Shader
// ============================================================

export const gradientGrainLinearShader = /* wgsl */ `
struct Params {
  viewport: vec2f,         // 8 bytes @ offset 0
  angle: f32,              // 4 bytes @ offset 8
  seed: f32,               // 4 bytes @ offset 12
  center: vec2f,           // 8 bytes @ offset 16
  sparsity: f32,           // 4 bytes @ offset 24
  _pad0: f32,              // 4 bytes @ offset 28
  colorA: vec4f,           // 16 bytes @ offset 32
  colorB: vec4f,           // 16 bytes @ offset 48
  curvePoints0: vec4f,     // 16 bytes @ offset 64
  curvePoints1: vec4f,     // 16 bytes @ offset 80
}                          // Total: 96 bytes

@group(0) @binding(0) var<uniform> params: Params;

${fullscreenVertex}

${gradientGrainCommon}

fn linearDepth(uv: vec2f, angle: f32, center: vec2f) -> f32 {
  let angleRad = (angle - 90.0) * PI / 180.0;
  let dir = vec2f(cos(angleRad), sin(angleRad));
  let centered = uv - center;
  let projected = dot(centered, dir);
  return clamp(projected + 0.5, 0.0, 1.0);
}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / params.viewport;
  let t = linearDepth(uv, params.angle, params.center);
  let baseColor = mixOklabVec4(params.colorA, params.colorB, t);
  let noiseA = hash21(pos.xy + params.seed);
  let noiseB = hash21(pos.xy + params.seed + 1000.0);
  return gradientGrainComposite(baseColor, params.colorA, params.colorB, t, noiseA, noiseB, params.sparsity, params.curvePoints0, params.curvePoints1);
}
`

// ============================================================
// Circular Depth Shader
// ============================================================

export const gradientGrainCircularShader = /* wgsl */ `
struct Params {
  viewport: vec2f,         // 8 bytes @ offset 0
  seed: f32,               // 4 bytes @ offset 8
  sparsity: f32,           // 4 bytes @ offset 12
  center: vec2f,           // 8 bytes @ offset 16
  circularInvert: f32,     // 4 bytes @ offset 24
  _pad0: f32,              // 4 bytes @ offset 28
  colorA: vec4f,           // 16 bytes @ offset 32
  colorB: vec4f,           // 16 bytes @ offset 48
  curvePoints0: vec4f,     // 16 bytes @ offset 64
  curvePoints1: vec4f,     // 16 bytes @ offset 80
}                          // Total: 96 bytes

@group(0) @binding(0) var<uniform> params: Params;

${fullscreenVertex}

${gradientGrainCommon}

fn circularDepth(uv: vec2f, center: vec2f, aspect: f32, invert: f32) -> f32 {
  let diff = uv - center;
  let adjustedDiff = vec2f(diff.x * aspect, diff.y);
  let maxDist = length(vec2f(0.5 * aspect, 0.5));
  let dist = length(adjustedDiff);
  var t = clamp(dist / maxDist, 0.0, 1.0);
  if (invert > 0.5) {
    t = 1.0 - t;
  }
  return t;
}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / params.viewport;
  let aspect = params.viewport.x / params.viewport.y;
  let t = circularDepth(uv, params.center, aspect, params.circularInvert);
  let baseColor = mixOklabVec4(params.colorA, params.colorB, t);
  let noiseA = hash21(pos.xy + params.seed);
  let noiseB = hash21(pos.xy + params.seed + 1000.0);
  return gradientGrainComposite(baseColor, params.colorA, params.colorB, t, noiseA, noiseB, params.sparsity, params.curvePoints0, params.curvePoints1);
}
`

// ============================================================
// Radial Depth Shader
// ============================================================

export const gradientGrainRadialShader = /* wgsl */ `
struct Params {
  viewport: vec2f,         // 8 bytes @ offset 0
  seed: f32,               // 4 bytes @ offset 8
  sparsity: f32,           // 4 bytes @ offset 12
  center: vec2f,           // 8 bytes @ offset 16
  radialStartAngle: f32,   // 4 bytes @ offset 24
  radialSweepAngle: f32,   // 4 bytes @ offset 28
  colorA: vec4f,           // 16 bytes @ offset 32
  colorB: vec4f,           // 16 bytes @ offset 48
  curvePoints0: vec4f,     // 16 bytes @ offset 64
  curvePoints1: vec4f,     // 16 bytes @ offset 80
}                          // Total: 96 bytes

@group(0) @binding(0) var<uniform> params: Params;

${fullscreenVertex}

${gradientGrainCommon}

fn radialDepth(uv: vec2f, center: vec2f, startAngle: f32, sweepAngle: f32) -> f32 {
  let diff = uv - center;
  var angle = atan2(diff.y, diff.x);
  if (angle < 0.0) {
    angle = angle + TWO_PI;
  }
  let startRad = startAngle * PI / 180.0;
  angle = angle - startRad;
  if (angle < 0.0) {
    angle = angle + TWO_PI;
  }
  if (angle > TWO_PI) {
    angle = angle - TWO_PI;
  }
  let sweepRad = sweepAngle * PI / 180.0;
  return clamp(angle / sweepRad, 0.0, 1.0);
}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / params.viewport;
  let t = radialDepth(uv, params.center, params.radialStartAngle, params.radialSweepAngle);
  let baseColor = mixOklabVec4(params.colorA, params.colorB, t);
  let noiseA = hash21(pos.xy + params.seed);
  let noiseB = hash21(pos.xy + params.seed + 1000.0);
  return gradientGrainComposite(baseColor, params.colorA, params.colorB, t, noiseA, noiseB, params.sparsity, params.curvePoints0, params.curvePoints1);
}
`

// ============================================================
// Perlin Depth Shader
// ============================================================

export const gradientGrainPerlinShader = /* wgsl */ `
struct Params {
  viewport: vec2f,         // 8 bytes @ offset 0
  seed: f32,               // 4 bytes @ offset 8
  sparsity: f32,           // 4 bytes @ offset 12
  perlinScale: f32,        // 4 bytes @ offset 16
  perlinOctaves: f32,      // 4 bytes @ offset 20
  perlinSeed: f32,         // 4 bytes @ offset 24
  perlinContrast: f32,     // 4 bytes @ offset 28
  perlinOffset: f32,       // 4 bytes @ offset 32
  _pad0: f32,              // 4 bytes @ offset 36
  _pad1: f32,              // 4 bytes @ offset 40
  _pad2: f32,              // 4 bytes @ offset 44
  colorA: vec4f,           // 16 bytes @ offset 48
  colorB: vec4f,           // 16 bytes @ offset 64
  curvePoints0: vec4f,     // 16 bytes @ offset 80
  curvePoints1: vec4f,     // 16 bytes @ offset 96
}                          // Total: 112 bytes

@group(0) @binding(0) var<uniform> params: Params;

${fullscreenVertex}

${gradientGrainCommon}

fn perlinHash21(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

fn perlinValueNoise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);

  let a = perlinHash21(i);
  let b = perlinHash21(i + vec2f(1.0, 0.0));
  let c = perlinHash21(i + vec2f(0.0, 1.0));
  let d = perlinHash21(i + vec2f(1.0, 1.0));

  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

fn perlinFbm(p: vec2f, octaves: i32) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var pos = p;

  for (var i = 0; i < octaves; i++) {
    value += amplitude * perlinValueNoise(pos);
    pos *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

fn perlinDepth(uv: vec2f, scale: f32, octaves: i32, seed: f32, contrast: f32, offset: f32) -> f32 {
  let noisePos = uv * scale + vec2f(seed * 0.1, seed * 0.073);
  var noise = perlinFbm(noisePos, octaves);
  noise = (noise - 0.5) * contrast + 0.5 + offset;
  return clamp(noise, 0.0, 1.0);
}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / params.viewport;
  let t = perlinDepth(uv, params.perlinScale, i32(params.perlinOctaves), params.perlinSeed, params.perlinContrast, params.perlinOffset);
  let baseColor = mixOklabVec4(params.colorA, params.colorB, t);
  let noiseA = hash21(pos.xy + params.seed);
  let noiseB = hash21(pos.xy + params.seed + 1000.0);
  return gradientGrainComposite(baseColor, params.colorA, params.colorB, t, noiseA, noiseB, params.sparsity, params.curvePoints0, params.curvePoints1);
}
`

// ============================================================
// Spec Creation (per DepthType)
// ============================================================

function createLinearSpec(
  params: GradientGrainParams,
  viewport: { width: number; height: number }
): TextureRenderSpec {
  const data = new Float32Array(GRADIENT_GRAIN_LINEAR_BUFFER_SIZE / 4)

  // viewport + angle + seed
  data[0] = viewport.width
  data[1] = viewport.height
  data[2] = params.angle
  data[3] = params.seed

  // center + sparsity + padding
  data[4] = params.centerX ?? 0.5
  data[5] = params.centerY ?? 0.5
  data[6] = params.sparsity
  data[7] = 0 // padding

  // colorA (vec4f)
  data[8] = params.colorA[0]
  data[9] = params.colorA[1]
  data[10] = params.colorA[2]
  data[11] = params.colorA[3]

  // colorB (vec4f)
  data[12] = params.colorB[0]
  data[13] = params.colorB[1]
  data[14] = params.colorB[2]
  data[15] = params.colorB[3]

  // curvePoints[0..3]
  data[16] = params.curvePoints[0] ?? 0
  data[17] = params.curvePoints[1] ?? 1/6
  data[18] = params.curvePoints[2] ?? 2/6
  data[19] = params.curvePoints[3] ?? 3/6

  // curvePoints[4..6] + padding
  data[20] = params.curvePoints[4] ?? 4/6
  data[21] = params.curvePoints[5] ?? 5/6
  data[22] = params.curvePoints[6] ?? 1
  data[23] = 0 // padding

  return {
    shader: gradientGrainLinearShader,
    uniforms: data.buffer,
    bufferSize: GRADIENT_GRAIN_LINEAR_BUFFER_SIZE,
  }
}

function createCircularSpec(
  params: GradientGrainParams,
  viewport: { width: number; height: number }
): TextureRenderSpec {
  const data = new Float32Array(GRADIENT_GRAIN_CIRCULAR_BUFFER_SIZE / 4)

  // viewport + seed + sparsity
  data[0] = viewport.width
  data[1] = viewport.height
  data[2] = params.seed
  data[3] = params.sparsity

  // center + circularInvert + padding
  data[4] = params.centerX ?? 0.5
  data[5] = params.centerY ?? 0.5
  data[6] = params.circularInvert ? 1.0 : 0.0
  data[7] = 0 // padding

  // colorA (vec4f)
  data[8] = params.colorA[0]
  data[9] = params.colorA[1]
  data[10] = params.colorA[2]
  data[11] = params.colorA[3]

  // colorB (vec4f)
  data[12] = params.colorB[0]
  data[13] = params.colorB[1]
  data[14] = params.colorB[2]
  data[15] = params.colorB[3]

  // curvePoints[0..3]
  data[16] = params.curvePoints[0] ?? 0
  data[17] = params.curvePoints[1] ?? 1/6
  data[18] = params.curvePoints[2] ?? 2/6
  data[19] = params.curvePoints[3] ?? 3/6

  // curvePoints[4..6] + padding
  data[20] = params.curvePoints[4] ?? 4/6
  data[21] = params.curvePoints[5] ?? 5/6
  data[22] = params.curvePoints[6] ?? 1
  data[23] = 0 // padding

  return {
    shader: gradientGrainCircularShader,
    uniforms: data.buffer,
    bufferSize: GRADIENT_GRAIN_CIRCULAR_BUFFER_SIZE,
  }
}

function createRadialSpec(
  params: GradientGrainParams,
  viewport: { width: number; height: number }
): TextureRenderSpec {
  const data = new Float32Array(GRADIENT_GRAIN_RADIAL_BUFFER_SIZE / 4)

  // viewport + seed + sparsity
  data[0] = viewport.width
  data[1] = viewport.height
  data[2] = params.seed
  data[3] = params.sparsity

  // center + radialStartAngle + radialSweepAngle
  data[4] = params.centerX ?? 0.5
  data[5] = params.centerY ?? 0.5
  data[6] = params.radialStartAngle ?? 0
  data[7] = params.radialSweepAngle ?? 360

  // colorA (vec4f)
  data[8] = params.colorA[0]
  data[9] = params.colorA[1]
  data[10] = params.colorA[2]
  data[11] = params.colorA[3]

  // colorB (vec4f)
  data[12] = params.colorB[0]
  data[13] = params.colorB[1]
  data[14] = params.colorB[2]
  data[15] = params.colorB[3]

  // curvePoints[0..3]
  data[16] = params.curvePoints[0] ?? 0
  data[17] = params.curvePoints[1] ?? 1/6
  data[18] = params.curvePoints[2] ?? 2/6
  data[19] = params.curvePoints[3] ?? 3/6

  // curvePoints[4..6] + padding
  data[20] = params.curvePoints[4] ?? 4/6
  data[21] = params.curvePoints[5] ?? 5/6
  data[22] = params.curvePoints[6] ?? 1
  data[23] = 0 // padding

  return {
    shader: gradientGrainRadialShader,
    uniforms: data.buffer,
    bufferSize: GRADIENT_GRAIN_RADIAL_BUFFER_SIZE,
  }
}

function createPerlinSpec(
  params: GradientGrainParams,
  viewport: { width: number; height: number }
): TextureRenderSpec {
  const data = new Float32Array(GRADIENT_GRAIN_PERLIN_BUFFER_SIZE / 4)

  // viewport + seed + sparsity
  data[0] = viewport.width
  data[1] = viewport.height
  data[2] = params.seed
  data[3] = params.sparsity

  // perlin params
  data[4] = params.perlinScale ?? 4
  data[5] = params.perlinOctaves ?? 4
  data[6] = params.perlinSeed ?? 42
  data[7] = params.perlinContrast ?? 1

  // perlinOffset + padding
  data[8] = params.perlinOffset ?? 0
  data[9] = 0 // padding
  data[10] = 0 // padding
  data[11] = 0 // padding

  // colorA (vec4f)
  data[12] = params.colorA[0]
  data[13] = params.colorA[1]
  data[14] = params.colorA[2]
  data[15] = params.colorA[3]

  // colorB (vec4f)
  data[16] = params.colorB[0]
  data[17] = params.colorB[1]
  data[18] = params.colorB[2]
  data[19] = params.colorB[3]

  // curvePoints[0..3]
  data[20] = params.curvePoints[0] ?? 0
  data[21] = params.curvePoints[1] ?? 1/6
  data[22] = params.curvePoints[2] ?? 2/6
  data[23] = params.curvePoints[3] ?? 3/6

  // curvePoints[4..6] + padding
  data[24] = params.curvePoints[4] ?? 4/6
  data[25] = params.curvePoints[5] ?? 5/6
  data[26] = params.curvePoints[6] ?? 1
  data[27] = 0 // padding

  return {
    shader: gradientGrainPerlinShader,
    uniforms: data.buffer,
    bufferSize: GRADIENT_GRAIN_PERLIN_BUFFER_SIZE,
  }
}

/** Create spec for GradientGrain texture (dispatches to type-specific implementation) */
export function createGradientGrainSpec(
  params: GradientGrainParams,
  viewport: { width: number; height: number }
): TextureRenderSpec {
  const depthType = params.depthMapType ?? 'linear'

  switch (depthType) {
    case 'circular':
      return createCircularSpec(params, viewport)
    case 'radial':
      return createRadialSpec(params, viewport)
    case 'perlin':
      return createPerlinSpec(params, viewport)
    case 'linear':
    default:
      return createLinearSpec(params, viewport)
  }
}
