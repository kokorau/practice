import { fullscreenVertex, hash21, oklabUtils } from './common'
import type { TextureRenderSpec } from '../Domain'

// ============================================================
// Parameter Types (per DepthType)
// ============================================================

/** Common params shared by all gradient grain types */
interface GradientGrainBaseParams {
  colorA: [number, number, number, number]  // RGBA start color
  colorB: [number, number, number, number]  // RGBA end color
  seed: number  // noise seed for grain
  sparsity: number  // sparsity factor (0=dense, 1=very sparse)
  curvePoints: number[]  // 7 Y values (0-1) for intensity curve
}

/** Linear gradient grain params */
export interface GradientGrainLinearParams extends GradientGrainBaseParams {
  angle: number  // degrees (0-360)
  centerX?: number    // 0-1, default 0.5
  centerY?: number    // 0-1, default 0.5
}

/** Circular gradient grain params */
export interface GradientGrainCircularParams extends GradientGrainBaseParams {
  centerX?: number    // 0-1, default 0.5
  centerY?: number    // 0-1, default 0.5
  circularInvert?: boolean
}

/** Radial gradient grain params */
export interface GradientGrainRadialParams extends GradientGrainBaseParams {
  centerX?: number    // 0-1, default 0.5
  centerY?: number    // 0-1, default 0.5
  radialStartAngle?: number  // degrees
  radialSweepAngle?: number  // degrees
}

/** Perlin noise gradient grain params */
export interface GradientGrainPerlinParams extends GradientGrainBaseParams {
  perlinScale?: number     // noise scale (1-20), default 4
  perlinOctaves?: number   // fBm octaves (1-8), default 4
  perlinSeed?: number      // random seed for perlin, default 42
  perlinContrast?: number  // contrast (0-3), default 1
  perlinOffset?: number    // offset (-0.5 to 0.5), default 0
}

/** Curl noise gradient grain params */
export interface GradientGrainCurlParams extends GradientGrainBaseParams {
  perlinScale?: number     // noise scale (1-20), default 4
  perlinOctaves?: number   // fBm octaves (1-8), default 4
  perlinSeed?: number      // random seed for perlin, default 42
  perlinContrast?: number  // contrast (0-3), default 1
  perlinOffset?: number    // offset (-0.5 to 0.5), default 0
  curlIntensity?: number   // curl intensity (0.5-3), default 1
}

/** Simplex noise gradient grain params */
export interface GradientGrainSimplexParams extends GradientGrainBaseParams {
  simplexScale?: number     // noise scale (1-20), default 4
  simplexOctaves?: number   // fBm octaves (1-8), default 4
  simplexSeed?: number      // random seed for simplex, default 42
  simplexContrast?: number  // contrast (0-3), default 1
  simplexOffset?: number    // offset (-0.5 to 0.5), default 0
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

/**
 * Curl depth buffer layout (112 bytes):
 *   viewport: vec2f (8) + seed: f32 (4) + sparsity: f32 (4) = 16 bytes
 *   curlScale: f32 (4) + curlOctaves: f32 (4) + curlSeed: f32 (4) + curlContrast: f32 (4) = 16 bytes
 *   curlOffset: f32 (4) + curlIntensity: f32 (4) + _pad: vec2f (8) = 16 bytes
 *   colorA: vec4f = 16 bytes
 *   colorB: vec4f = 16 bytes
 *   curvePoints[0..3]: vec4f = 16 bytes
 *   curvePoints[4..6] + _pad: vec4f = 16 bytes
 *   Total: 112 bytes
 */
export const GRADIENT_GRAIN_CURL_BUFFER_SIZE = 112

/**
 * Simplex depth buffer layout (112 bytes):
 *   viewport: vec2f (8) + seed: f32 (4) + sparsity: f32 (4) = 16 bytes
 *   simplexScale: f32 (4) + simplexOctaves: f32 (4) + simplexSeed: f32 (4) + simplexContrast: f32 (4) = 16 bytes
 *   simplexOffset: f32 (4) + _pad: vec3f (12) = 16 bytes
 *   colorA: vec4f = 16 bytes
 *   colorB: vec4f = 16 bytes
 *   curvePoints[0..3]: vec4f = 16 bytes
 *   curvePoints[4..6] + _pad: vec4f = 16 bytes
 *   Total: 112 bytes
 */
export const GRADIENT_GRAIN_SIMPLEX_BUFFER_SIZE = 112


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
// Curl Depth Shader
// ============================================================

export const gradientGrainCurlShader = /* wgsl */ `
struct Params {
  viewport: vec2f,         // 8 bytes @ offset 0
  seed: f32,               // 4 bytes @ offset 8
  sparsity: f32,           // 4 bytes @ offset 12
  curlScale: f32,          // 4 bytes @ offset 16
  curlOctaves: f32,        // 4 bytes @ offset 20
  curlSeed: f32,           // 4 bytes @ offset 24
  curlContrast: f32,       // 4 bytes @ offset 28
  curlOffset: f32,         // 4 bytes @ offset 32
  curlIntensity: f32,      // 4 bytes @ offset 36
  _pad0: f32,              // 4 bytes @ offset 40
  _pad1: f32,              // 4 bytes @ offset 44
  colorA: vec4f,           // 16 bytes @ offset 48
  colorB: vec4f,           // 16 bytes @ offset 64
  curvePoints0: vec4f,     // 16 bytes @ offset 80
  curvePoints1: vec4f,     // 16 bytes @ offset 96
}                          // Total: 112 bytes

@group(0) @binding(0) var<uniform> params: Params;

${fullscreenVertex}

${gradientGrainCommon}

fn curlHash21(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

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
fn computeCurl(p: vec2f, octaves: i32) -> vec2f {
  let eps = 0.01;

  let dx = curlFbm(p + vec2f(eps, 0.0), octaves) - curlFbm(p - vec2f(eps, 0.0), octaves);
  let dy = curlFbm(p + vec2f(0.0, eps), octaves) - curlFbm(p - vec2f(0.0, eps), octaves);

  return vec2f(dy, -dx) / (2.0 * eps);
}

fn curlDepth(uv: vec2f, scale: f32, octaves: i32, seed: f32, contrast: f32, offset: f32, intensity: f32) -> f32 {
  let noisePos = uv * scale + vec2f(seed * 0.1, seed * 0.073);
  let curl = computeCurl(noisePos, octaves);

  // Use curl magnitude as depth value
  var depth = length(curl) * intensity;

  // Normalize to 0-1 range (curl magnitude is typically 0-0.5)
  depth = clamp(depth * 2.0, 0.0, 1.0);

  // Apply contrast and offset
  depth = (depth - 0.5) * contrast + 0.5 + offset;
  return clamp(depth, 0.0, 1.0);
}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / params.viewport;
  let t = curlDepth(uv, params.curlScale, i32(params.curlOctaves), params.curlSeed, params.curlContrast, params.curlOffset, params.curlIntensity);
  let baseColor = mixOklabVec4(params.colorA, params.colorB, t);
  let noiseA = hash21(pos.xy + params.seed);
  let noiseB = hash21(pos.xy + params.seed + 1000.0);
  return gradientGrainComposite(baseColor, params.colorA, params.colorB, t, noiseA, noiseB, params.sparsity, params.curvePoints0, params.curvePoints1);
}
`

// ============================================================
// Simplex Depth Shader
// ============================================================

export const gradientGrainSimplexShader = /* wgsl */ `
struct Params {
  viewport: vec2f,         // 8 bytes @ offset 0
  seed: f32,               // 4 bytes @ offset 8
  sparsity: f32,           // 4 bytes @ offset 12
  simplexScale: f32,       // 4 bytes @ offset 16
  simplexOctaves: f32,     // 4 bytes @ offset 20
  simplexSeed: f32,        // 4 bytes @ offset 24
  simplexContrast: f32,    // 4 bytes @ offset 28
  simplexOffset: f32,      // 4 bytes @ offset 32
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

// 2D Simplex noise implementation
fn mod289v2(x: vec2f) -> vec2f {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

fn mod289v3(x: vec3f) -> vec3f {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

fn permute(x: vec3f) -> vec3f {
  return mod289v3(((x * 34.0) + 1.0) * x);
}

fn simplexNoise2D(v: vec2f) -> f32 {
  let C = vec4f(
    0.211324865405187,   // (3.0 - sqrt(3.0)) / 6.0
    0.366025403784439,   // 0.5 * (sqrt(3.0) - 1.0)
    -0.577350269189626,  // -1.0 + 2.0 * C.x
    0.024390243902439    // 1.0 / 41.0
  );

  var i = floor(v + dot(v, C.yy));
  let x0 = v - i + dot(i, C.xx);

  var i1: vec2f;
  if (x0.x > x0.y) {
    i1 = vec2f(1.0, 0.0);
  } else {
    i1 = vec2f(0.0, 1.0);
  }
  var x12 = x0.xyxy + C.xxzz;
  x12 = vec4f(x12.xy - i1, x12.zw);

  i = mod289v2(i);
  let p = permute(permute(i.y + vec3f(0.0, i1.y, 1.0)) + i.x + vec3f(0.0, i1.x, 1.0));

  var m = max(vec3f(0.5) - vec3f(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), vec3f(0.0));
  m = m * m;
  m = m * m;

  let x = 2.0 * fract(p * C.www) - 1.0;
  let h = abs(x) - 0.5;
  let ox = floor(x + 0.5);
  let a0 = x - ox;

  m = m * (1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h));

  let g = vec3f(
    a0.x * x0.x + h.x * x0.y,
    a0.y * x12.x + h.y * x12.y,
    a0.z * x12.z + h.z * x12.w
  );
  return 130.0 * dot(m, g);
}

fn simplexFbm(p: vec2f, octaves: i32) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var pos = p;
  var totalAmp = 0.0;

  for (var i = 0; i < octaves; i++) {
    value += amplitude * simplexNoise2D(pos);
    totalAmp += amplitude;
    pos *= 2.0;
    amplitude *= 0.5;
  }
  return (value / totalAmp) * 0.5 + 0.5;
}

fn simplexDepth(uv: vec2f, scale: f32, octaves: i32, seed: f32, contrast: f32, offset: f32) -> f32 {
  let noisePos = uv * scale + vec2f(seed * 0.1, seed * 0.073);
  var noise = simplexFbm(noisePos, octaves);
  noise = (noise - 0.5) * contrast + 0.5 + offset;
  return clamp(noise, 0.0, 1.0);
}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / params.viewport;
  let t = simplexDepth(uv, params.simplexScale, i32(params.simplexOctaves), params.simplexSeed, params.simplexContrast, params.simplexOffset);
  let baseColor = mixOklabVec4(params.colorA, params.colorB, t);
  let noiseA = hash21(pos.xy + params.seed);
  let noiseB = hash21(pos.xy + params.seed + 1000.0);
  return gradientGrainComposite(baseColor, params.colorA, params.colorB, t, noiseA, noiseB, params.sparsity, params.curvePoints0, params.curvePoints1);
}
`

// ============================================================
// Spec Creation (per DepthType - each is independent)
// ============================================================

/** Create spec for Linear GradientGrain texture */
export function createGradientGrainLinearSpec(
  params: GradientGrainLinearParams,
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

/** Create spec for Circular GradientGrain texture */
export function createGradientGrainCircularSpec(
  params: GradientGrainCircularParams,
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

/** Create spec for Radial GradientGrain texture */
export function createGradientGrainRadialSpec(
  params: GradientGrainRadialParams,
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

/** Create spec for Perlin GradientGrain texture */
export function createGradientGrainPerlinSpec(
  params: GradientGrainPerlinParams,
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

/** Create spec for Curl GradientGrain texture */
export function createGradientGrainCurlSpec(
  params: GradientGrainCurlParams,
  viewport: { width: number; height: number }
): TextureRenderSpec {
  const data = new Float32Array(GRADIENT_GRAIN_CURL_BUFFER_SIZE / 4)

  // viewport + seed + sparsity
  data[0] = viewport.width
  data[1] = viewport.height
  data[2] = params.seed
  data[3] = params.sparsity

  // curl params
  data[4] = params.perlinScale ?? 4
  data[5] = params.perlinOctaves ?? 4
  data[6] = params.perlinSeed ?? 42
  data[7] = params.perlinContrast ?? 1

  // curlOffset + curlIntensity + padding
  data[8] = params.perlinOffset ?? 0
  data[9] = params.curlIntensity ?? 1
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
    shader: gradientGrainCurlShader,
    uniforms: data.buffer,
    bufferSize: GRADIENT_GRAIN_CURL_BUFFER_SIZE,
  }
}

/** Create spec for Simplex GradientGrain texture */
export function createGradientGrainSimplexSpec(
  params: GradientGrainSimplexParams,
  viewport: { width: number; height: number }
): TextureRenderSpec {
  const data = new Float32Array(GRADIENT_GRAIN_SIMPLEX_BUFFER_SIZE / 4)

  // viewport + seed + sparsity
  data[0] = viewport.width
  data[1] = viewport.height
  data[2] = params.seed
  data[3] = params.sparsity

  // simplex params
  data[4] = params.simplexScale ?? 4
  data[5] = params.simplexOctaves ?? 4
  data[6] = params.simplexSeed ?? 42
  data[7] = params.simplexContrast ?? 1

  // simplexOffset + padding
  data[8] = params.simplexOffset ?? 0
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
    shader: gradientGrainSimplexShader,
    uniforms: data.buffer,
    bufferSize: GRADIENT_GRAIN_SIMPLEX_BUFFER_SIZE,
  }
}
