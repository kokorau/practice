/**
 * Greymap Mask Shaders
 *
 * These shaders output grayscale values (0.0-1.0) instead of RGBA colors.
 * The output is vec4(value, value, value, 1.0) for compatibility with
 * the texture pipeline. Use with colorize shader for final RGBA output.
 */

import { fullscreenVertex, aaUtils } from './common'
import type { Viewport } from '../Domain'
import type {
  CircleGreymapMaskParams,
  RectGreymapMaskParams,
  BlobGreymapMaskParams,
  PerlinGreymapMaskParams,
  LinearGradientGreymapMaskParams,
  RadialGradientGreymapMaskParams,
  BoxGradientGreymapMaskParams,
  GreymapMaskSpec,
} from '../Domain/ValueObject/GreymapSpec'

// ============================================================
// Circle Greymap Mask
// ============================================================

/** Circle greymap mask shader */
export const circleGreymapMaskShader = /* wgsl */ `
${fullscreenVertex}

${aaUtils}

struct CircleGreymapParams {
  centerX: f32,
  centerY: f32,
  radius: f32,
  innerValue: f32,
  outerValue: f32,
  aspectRatio: f32,
  viewportWidth: f32,
  viewportHeight: f32,
}

@group(0) @binding(0) var<uniform> params: CircleGreymapParams;

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let aspectRatio = params.aspectRatio;
  let viewportWidth = params.viewportWidth;
  let viewportHeight = params.viewportHeight;

  let uv = vec2f(pos.x / viewportWidth, pos.y / viewportHeight);

  // Calculate distance from center (aspect ratio corrected)
  let center = vec2f(params.centerX, params.centerY);
  var delta = uv - center;

  // Aspect ratio correction
  delta.x *= max(aspectRatio, 1.0);
  delta.y *= max(1.0 / aspectRatio, 1.0);

  let dist = length(delta);

  // Anti-aliased circle mask
  let pixelSize = 1.0 / min(viewportWidth, viewportHeight);
  let edge = params.radius;
  let aa = smoothstep(edge - pixelSize, edge + pixelSize, dist);

  let value = mix(params.innerValue, params.outerValue, aa);
  return vec4f(value, value, value, 1.0);
}
`

/**
 * Create greymap spec for circle mask
 */
export function createCircleGreymapMaskSpec(
  params: CircleGreymapMaskParams,
  viewport: Viewport
): GreymapMaskSpec {
  const aspectRatio = viewport.width / viewport.height
  // Use innerValue/outerValue directly - cutout logic is handled by the caller

  const data = new Float32Array([
    params.centerX,
    params.centerY,
    params.radius,
    params.innerValue,
    params.outerValue,
    aspectRatio,
    viewport.width,
    viewport.height,
  ])
  return {
    shader: circleGreymapMaskShader,
    uniforms: data.buffer,
    bufferSize: 32, // 8 floats = 32 bytes
  }
}

// ============================================================
// Rect Greymap Mask
// ============================================================

/** Rect greymap mask shader (with per-corner radius + rotation/perspective) */
export const rectGreymapMaskShader = /* wgsl */ `
${fullscreenVertex}

${aaUtils}

struct RectGreymapParams {
  left: f32,
  right: f32,
  top: f32,
  bottom: f32,
  radiusTopLeft: f32,
  radiusTopRight: f32,
  radiusBottomLeft: f32,
  radiusBottomRight: f32,
  rotation: f32,
  perspectiveX: f32,
  perspectiveY: f32,
  innerValue: f32,
  outerValue: f32,
  aspectRatio: f32,
  viewportWidth: f32,
  viewportHeight: f32,
}

@group(0) @binding(0) var<uniform> params: RectGreymapParams;

// Signed distance function for rounded rectangle with per-corner radii
fn sdRoundedRectVar(p: vec2f, halfSize: vec2f, radii: vec4f) -> f32 {
  let sx = step(0.0, p.x);
  let sy = step(0.0, p.y);
  let r = mix(
    mix(radii.x, radii.y, sx),
    mix(radii.w, radii.z, sx),
    sy
  );

  let q = abs(p) - halfSize + r;
  return length(max(q, vec2f(0.0))) + min(max(q.x, q.y), 0.0) - r;
}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let viewportWidth = params.viewportWidth;
  let viewportHeight = params.viewportHeight;
  let aspectRatio = params.aspectRatio;

  let uv = vec2f(pos.x / viewportWidth, pos.y / viewportHeight);

  // Rectangle center and half size
  let center = vec2f((params.left + params.right) / 2.0, (params.top + params.bottom) / 2.0);
  let halfSize = vec2f((params.right - params.left) / 2.0, (params.bottom - params.top) / 2.0);

  var p = uv - center;

  // Perspective transformation: Y affects X scale
  if (abs(params.perspectiveY) > 0.001) {
    let yFactor = (p.y / halfSize.y) * params.perspectiveY;
    p.x *= 1.0 + yFactor;
  }

  // Perspective transformation: X affects Y scale
  if (abs(params.perspectiveX) > 0.001) {
    let xFactor = (p.x / halfSize.x) * params.perspectiveX;
    p.y *= 1.0 + xFactor;
  }

  // Rotation transformation (around center)
  if (abs(params.rotation) > 0.001) {
    let rotRad = params.rotation * 3.14159265359 / 180.0;
    let cosR = cos(rotRad);
    let sinR = sin(rotRad);
    let rotatedP = vec2f(
      p.x * cosR - p.y * sinR,
      p.x * sinR + p.y * cosR
    );
    p = rotatedP;
  }

  var correctedHalfSize = halfSize;
  var radii = vec4f(params.radiusTopLeft, params.radiusTopRight, params.radiusBottomRight, params.radiusBottomLeft);

  // Aspect ratio correction
  let scaleX = max(aspectRatio, 1.0);
  let scaleY = max(1.0 / aspectRatio, 1.0);
  p.x *= scaleX;
  p.y *= scaleY;
  correctedHalfSize.x *= scaleX;
  correctedHalfSize.y *= scaleY;
  radii *= max(aspectRatio, 1.0 / aspectRatio);

  // Clamp radii to max possible value
  let maxRadius = min(correctedHalfSize.x, correctedHalfSize.y);
  radii = min(radii, vec4f(maxRadius));

  // Calculate SDF distance
  let dist = sdRoundedRectVar(p, correctedHalfSize, radii);

  // Anti-aliasing
  let pixelSize = 1.0 / min(viewportWidth, viewportHeight);
  let inside = 1.0 - smoothstep(-pixelSize, pixelSize, dist);

  let value = mix(params.outerValue, params.innerValue, inside);
  return vec4f(value, value, value, 1.0);
}
`

/**
 * Create greymap spec for rect mask
 */
export function createRectGreymapMaskSpec(
  params: RectGreymapMaskParams,
  viewport: Viewport
): GreymapMaskSpec {
  const aspectRatio = viewport.width / viewport.height
  // Use innerValue/outerValue directly - cutout logic is handled by the caller

  // Determine if individual radii or uniform
  const isIndividual = 'radiusTopLeft' in params
  const radiusTopLeft = isIndividual ? params.radiusTopLeft : (params.radius ?? 0)
  const radiusTopRight = isIndividual ? params.radiusTopRight : (params.radius ?? 0)
  const radiusBottomLeft = isIndividual ? params.radiusBottomLeft : (params.radius ?? 0)
  const radiusBottomRight = isIndividual ? params.radiusBottomRight : (params.radius ?? 0)

  const rotation = params.rotation ?? 0
  const perspectiveX = params.perspectiveX ?? 0
  const perspectiveY = params.perspectiveY ?? 0

  const data = new Float32Array([
    params.left,
    params.right,
    params.top,
    params.bottom,
    radiusTopLeft,
    radiusTopRight,
    radiusBottomLeft,
    radiusBottomRight,
    rotation,
    perspectiveX,
    perspectiveY,
    params.innerValue,
    params.outerValue,
    aspectRatio,
    viewport.width,
    viewport.height,
  ])
  return {
    shader: rectGreymapMaskShader,
    uniforms: data.buffer,
    bufferSize: 64, // 16 floats = 64 bytes
  }
}

// ============================================================
// Blob Greymap Mask
// ============================================================

/** Blob greymap mask shader */
export const blobGreymapMaskShader = /* wgsl */ `
${fullscreenVertex}

${aaUtils}

fn blobHash21(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

fn blobValueNoise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);

  let a = blobHash21(i);
  let b = blobHash21(i + vec2f(1.0, 0.0));
  let c = blobHash21(i + vec2f(0.0, 1.0));
  let d = blobHash21(i + vec2f(1.0, 1.0));

  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

fn blobFbm(p: vec2f, octaves: i32) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var pos = p;

  for (var i = 0; i < octaves; i++) {
    value += amplitude * blobValueNoise(pos);
    pos *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

struct BlobGreymapParams {
  centerX: f32,
  centerY: f32,
  baseRadius: f32,
  amplitude: f32,
  octaves: f32,
  seed: f32,
  innerValue: f32,
  outerValue: f32,
  aspectRatio: f32,
  viewportWidth: f32,
  viewportHeight: f32,
  _padding: f32,
}

@group(0) @binding(0) var<uniform> params: BlobGreymapParams;

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let viewportWidth = params.viewportWidth;
  let viewportHeight = params.viewportHeight;
  let aspectRatio = params.aspectRatio;

  let uv = vec2f(pos.x / viewportWidth, pos.y / viewportHeight);

  let center = vec2f(params.centerX, params.centerY);
  var delta = uv - center;

  // Aspect ratio correction
  delta.x *= max(aspectRatio, 1.0);
  delta.y *= max(1.0 / aspectRatio, 1.0);

  let dist = length(delta);

  // Calculate angle for noise lookup
  let angle = atan2(delta.y, delta.x);

  // Sample noise on a circular path to ensure seamless wrapping at ±π
  // This avoids discontinuity at angle boundaries
  let noiseRadius = 3.0;
  let seedOffset = params.seed * 0.1;
  let noiseCoord = vec2f(
    cos(angle) * noiseRadius + seedOffset,
    sin(angle) * noiseRadius + seedOffset * 0.7
  );

  let octaves = clamp(i32(params.octaves), 1, 8);
  let noise = blobFbm(noiseCoord, octaves);

  // Modulate radius with noise
  let modulatedRadius = params.baseRadius + (noise - 0.5) * params.amplitude;

  // Anti-aliased blob mask
  let pixelSize = 1.0 / min(viewportWidth, viewportHeight);
  let aa = smoothstep(modulatedRadius - pixelSize, modulatedRadius + pixelSize, dist);

  let value = mix(params.innerValue, params.outerValue, aa);
  return vec4f(value, value, value, 1.0);
}
`

/**
 * Create greymap spec for blob mask
 */
export function createBlobGreymapMaskSpec(
  params: BlobGreymapMaskParams,
  viewport: Viewport
): GreymapMaskSpec {
  const aspectRatio = viewport.width / viewport.height
  // Use innerValue/outerValue directly - cutout logic is handled by the caller

  const data = new Float32Array([
    params.centerX,
    params.centerY,
    params.baseRadius,
    params.amplitude,
    params.octaves,
    params.seed,
    params.innerValue,
    params.outerValue,
    aspectRatio,
    viewport.width,
    viewport.height,
    0, // padding
  ])
  return {
    shader: blobGreymapMaskShader,
    uniforms: data.buffer,
    bufferSize: 48, // 12 floats = 48 bytes
  }
}

// ============================================================
// Perlin Greymap Mask
// ============================================================

/** Perlin noise greymap mask shader */
export const perlinGreymapMaskShader = /* wgsl */ `
${fullscreenVertex}

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

struct PerlinGreymapParams {
  seed: f32,
  threshold: f32,
  scale: f32,
  octaves: f32,
  innerValue: f32,
  outerValue: f32,
  viewportWidth: f32,
  viewportHeight: f32,
}

@group(0) @binding(0) var<uniform> params: PerlinGreymapParams;

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = vec2f(pos.x / params.viewportWidth, pos.y / params.viewportHeight);
  let noisePos = uv * params.scale + vec2f(params.seed * 0.1, params.seed * 0.073);

  let octaves = clamp(i32(params.octaves), 1, 8);
  let noise = perlinFbm(noisePos, octaves);

  // Binarize: noise > threshold -> inner, else -> outer
  let mask = select(0.0, 1.0, noise > params.threshold);
  let value = mix(params.outerValue, params.innerValue, mask);

  return vec4f(value, value, value, 1.0);
}
`

/**
 * Create greymap spec for perlin noise mask
 */
export function createPerlinGreymapMaskSpec(
  params: PerlinGreymapMaskParams,
  viewport: Viewport
): GreymapMaskSpec {
  // Use innerValue/outerValue directly - cutout logic is handled by the caller

  const data = new Float32Array([
    params.seed,
    params.threshold,
    params.scale,
    params.octaves,
    params.innerValue,
    params.outerValue,
    viewport.width,
    viewport.height,
  ])
  return {
    shader: perlinGreymapMaskShader,
    uniforms: data.buffer,
    bufferSize: 32, // 8 floats = 32 bytes
  }
}

// ============================================================
// Linear Gradient Greymap Mask
// ============================================================

/** Linear gradient greymap mask shader */
export const linearGradientGreymapMaskShader = /* wgsl */ `
${fullscreenVertex}

struct LinearGradientGreymapParams {
  angle: f32,
  startOffset: f32,
  endOffset: f32,
  innerValue: f32,
  outerValue: f32,
  viewportWidth: f32,
  viewportHeight: f32,
  _padding: f32,
}

@group(0) @binding(0) var<uniform> params: LinearGradientGreymapParams;

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = vec2f(pos.x / params.viewportWidth, pos.y / params.viewportHeight);

  // Convert angle from degrees to radians
  let angleRad = params.angle * 3.14159265359 / 180.0;

  // Direction vector from angle
  let dir = vec2f(cos(angleRad), sin(angleRad));

  // Project UV onto gradient direction
  let projected = dot(uv - 0.5, dir) + 0.5;

  // Apply gradient with start/end offsets
  let t = smoothstep(params.startOffset, params.endOffset, projected);
  let value = mix(params.innerValue, params.outerValue, t);

  return vec4f(value, value, value, 1.0);
}
`

/**
 * Create greymap spec for linear gradient mask
 */
export function createLinearGradientGreymapMaskSpec(
  params: LinearGradientGreymapMaskParams,
  viewport: Viewport
): GreymapMaskSpec {
  // Use innerValue/outerValue directly - cutout logic is handled by the caller

  const data = new Float32Array([
    params.angle,
    params.startOffset,
    params.endOffset,
    params.innerValue,
    params.outerValue,
    viewport.width,
    viewport.height,
    0, // padding
  ])
  return {
    shader: linearGradientGreymapMaskShader,
    uniforms: data.buffer,
    bufferSize: 32, // 8 floats = 32 bytes
  }
}

// ============================================================
// Radial Gradient Greymap Mask
// ============================================================

/** Radial gradient greymap mask shader */
export const radialGradientGreymapMaskShader = /* wgsl */ `
${fullscreenVertex}

struct RadialGradientGreymapParams {
  centerX: f32,
  centerY: f32,
  innerRadius: f32,
  outerRadius: f32,
  aspectRatio: f32,
  innerValue: f32,
  outerValue: f32,
  viewportWidth: f32,
  viewportHeight: f32,
  viewportAspectRatio: f32,
  _padding1: f32,
  _padding2: f32,
}

@group(0) @binding(0) var<uniform> params: RadialGradientGreymapParams;

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = vec2f(pos.x / params.viewportWidth, pos.y / params.viewportHeight);

  let center = vec2f(params.centerX, params.centerY);

  var scaledUV = uv;
  var scaledCenter = center;

  // Apply ellipse aspect ratio
  if (params.aspectRatio > 1.0) {
    scaledUV.x = (uv.x - center.x) * params.aspectRatio + center.x;
    scaledCenter.x = center.x;
  } else {
    scaledUV.y = (uv.y - center.y) / params.aspectRatio + center.y;
    scaledCenter.y = center.y;
  }

  // Viewport aspect ratio correction
  if (params.viewportAspectRatio > 1.0) {
    scaledUV.x = (scaledUV.x - scaledCenter.x) * params.viewportAspectRatio + scaledCenter.x;
  } else {
    scaledUV.y = (scaledUV.y - scaledCenter.y) / params.viewportAspectRatio + scaledCenter.y;
  }

  let dist = distance(scaledUV, scaledCenter);

  // Apply gradient with smooth interpolation
  let t = smoothstep(params.innerRadius, params.outerRadius, dist);
  let value = mix(params.innerValue, params.outerValue, t);

  return vec4f(value, value, value, 1.0);
}
`

/**
 * Create greymap spec for radial gradient mask
 */
export function createRadialGradientGreymapMaskSpec(
  params: RadialGradientGreymapMaskParams,
  viewport: Viewport
): GreymapMaskSpec {
  // Use innerValue/outerValue directly - cutout logic is handled by the caller
  const viewportAspectRatio = viewport.width / viewport.height

  const data = new Float32Array([
    params.centerX,
    params.centerY,
    params.innerRadius,
    params.outerRadius,
    params.aspectRatio,
    params.innerValue,
    params.outerValue,
    viewport.width,
    viewport.height,
    viewportAspectRatio,
    0, // padding
    0, // padding
  ])
  return {
    shader: radialGradientGreymapMaskShader,
    uniforms: data.buffer,
    bufferSize: 48, // 12 floats = 48 bytes
  }
}

// ============================================================
// Box Gradient Greymap Mask
// ============================================================

/** Convert curve type string to number for shader */
function curveTypeToNumber(curve: 'linear' | 'smooth' | 'easeIn' | 'easeOut'): number {
  switch (curve) {
    case 'linear': return 0
    case 'smooth': return 1
    case 'easeIn': return 2
    case 'easeOut': return 3
    default: return 1
  }
}

/** Box gradient greymap mask shader */
export const boxGradientGreymapMaskShader = /* wgsl */ `
${fullscreenVertex}

struct BoxGradientGreymapParams {
  left: f32,
  right: f32,
  top: f32,
  bottom: f32,
  cornerRadius: f32,
  curve: f32,
  innerValue: f32,
  outerValue: f32,
  viewportWidth: f32,
  viewportHeight: f32,
  _padding1: f32,
  _padding2: f32,
}

@group(0) @binding(0) var<uniform> params: BoxGradientGreymapParams;

fn applyCurve(t: f32, curveType: f32) -> f32 {
  let curveInt = i32(curveType);
  if (curveInt == 0) {
    return t;
  } else if (curveInt == 1) {
    return t * t * (3.0 - 2.0 * t);
  } else if (curveInt == 2) {
    return t * t;
  } else {
    return 1.0 - (1.0 - t) * (1.0 - t);
  }
}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = vec2f(pos.x / params.viewportWidth, pos.y / params.viewportHeight);

  // Calculate distance from each edge
  var dLeft = 0.0;
  var dRight = 0.0;
  var dTop = 0.0;
  var dBottom = 0.0;

  if (params.left > 0.0) {
    dLeft = 1.0 - clamp(uv.x / params.left, 0.0, 1.0);
  }
  if (params.right > 0.0) {
    dRight = 1.0 - clamp((1.0 - uv.x) / params.right, 0.0, 1.0);
  }
  if (params.top > 0.0) {
    dTop = 1.0 - clamp(uv.y / params.top, 0.0, 1.0);
  }
  if (params.bottom > 0.0) {
    dBottom = 1.0 - clamp((1.0 - uv.y) / params.bottom, 0.0, 1.0);
  }

  var t = max(max(dLeft, dRight), max(dTop, dBottom));

  // Corner radius effect
  if (params.cornerRadius > 0.0) {
    let cr = params.cornerRadius;

    let inLeftTop = uv.x < params.left && uv.y < params.top;
    let inRightTop = uv.x > (1.0 - params.right) && uv.y < params.top;
    let inLeftBottom = uv.x < params.left && uv.y > (1.0 - params.bottom);
    let inRightBottom = uv.x > (1.0 - params.right) && uv.y > (1.0 - params.bottom);

    if (inLeftTop) {
      let cornerCenter = vec2f(params.left, params.top);
      let dist = length((uv - cornerCenter) / vec2f(params.left, params.top));
      let cornerT = clamp(dist, 0.0, 1.0);
      t = mix(t, cornerT, cr);
    } else if (inRightTop) {
      let cornerCenter = vec2f(1.0 - params.right, params.top);
      let dist = length((uv - cornerCenter) / vec2f(params.right, params.top));
      let cornerT = clamp(dist, 0.0, 1.0);
      t = mix(t, cornerT, cr);
    } else if (inLeftBottom) {
      let cornerCenter = vec2f(params.left, 1.0 - params.bottom);
      let dist = length((uv - cornerCenter) / vec2f(params.left, params.bottom));
      let cornerT = clamp(dist, 0.0, 1.0);
      t = mix(t, cornerT, cr);
    } else if (inRightBottom) {
      let cornerCenter = vec2f(1.0 - params.right, 1.0 - params.bottom);
      let dist = length((uv - cornerCenter) / vec2f(params.right, params.bottom));
      let cornerT = clamp(dist, 0.0, 1.0);
      t = mix(t, cornerT, cr);
    }
  }

  t = applyCurve(t, params.curve);
  let value = mix(params.innerValue, params.outerValue, t);

  return vec4f(value, value, value, 1.0);
}
`

/**
 * Create greymap spec for box gradient mask
 */
export function createBoxGradientGreymapMaskSpec(
  params: BoxGradientGreymapMaskParams,
  viewport: Viewport
): GreymapMaskSpec {
  // Use innerValue/outerValue directly - cutout logic is handled by the caller

  const data = new Float32Array([
    params.left,
    params.right,
    params.top,
    params.bottom,
    params.cornerRadius,
    curveTypeToNumber(params.curve),
    params.innerValue,
    params.outerValue,
    viewport.width,
    viewport.height,
    0, // padding
    0, // padding
  ])
  return {
    shader: boxGradientGreymapMaskShader,
    uniforms: data.buffer,
    bufferSize: 48, // 12 floats = 48 bytes
  }
}

// ============================================================
// Wavy Line Greymap Mask
// ============================================================

import type {
  WavyLineGreymapMaskParams,
  SimplexGreymapMaskParams,
  CurlGreymapMaskParams,
} from '../Domain/ValueObject/GreymapSpec'

/** Wavy line greymap mask shader - uses 1D value noise for organic dividing line */
export const wavyLineGreymapMaskShader = /* wgsl */ `
${fullscreenVertex}

// 1D hash function
fn hash11(p: f32) -> f32 {
  var p3 = fract(p * 0.1031);
  p3 += p3 * (p3 + 33.33);
  return fract(p3 * p3);
}

// 1D value noise
fn valueNoise1D(x: f32) -> f32 {
  let i = floor(x);
  let f = fract(x);
  let u = f * f * (3.0 - 2.0 * f); // smoothstep

  let a = hash11(i);
  let b = hash11(i + 1.0);

  return mix(a, b, u);
}

// 1D fBm (fractional Brownian motion)
fn fbm1D(x: f32, octaves: i32, seed: f32) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var pos = x + seed * 100.0;

  for (var i = 0; i < octaves; i++) {
    value += amplitude * (valueNoise1D(pos) * 2.0 - 1.0);
    pos *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

struct WavyLineGreymapParams {
  position: f32,
  direction: f32,
  amplitude: f32,
  frequency: f32,
  octaves: f32,
  seed: f32,
  innerValue: f32,
  outerValue: f32,
  viewportWidth: f32,
  viewportHeight: f32,
  _padding1: f32,
  _padding2: f32,
}

@group(0) @binding(0) var<uniform> params: WavyLineGreymapParams;

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = vec2f(pos.x / params.viewportWidth, pos.y / params.viewportHeight);

  let octaves = clamp(i32(params.octaves), 1, 5);

  // Calculate wavy offset based on direction
  var sampleCoord: f32;
  var compareCoord: f32;

  if (params.direction < 0.5) {
    // Vertical line (left/right split): sample noise along Y, compare X
    sampleCoord = uv.y * params.frequency;
    compareCoord = uv.x;
  } else {
    // Horizontal line (top/bottom split): sample noise along X, compare Y
    sampleCoord = uv.x * params.frequency;
    compareCoord = uv.y;
  }

  // Get wavy offset from 1D noise
  let wavyOffset = fbm1D(sampleCoord, octaves, params.seed) * params.amplitude;

  // Calculate the wavy boundary position
  let boundary = params.position + wavyOffset;

  // Anti-aliased edge
  let pixelSize = 1.0 / min(params.viewportWidth, params.viewportHeight);
  let inside = smoothstep(boundary - pixelSize, boundary + pixelSize, compareCoord);

  let value = mix(params.innerValue, params.outerValue, inside);
  return vec4f(value, value, value, 1.0);
}
`

/** Convert direction string to number for shader */
function wavyLineDirectionToNumber(direction: 'vertical' | 'horizontal'): number {
  return direction === 'vertical' ? 0 : 1
}

/**
 * Create greymap spec for wavy line mask
 */
export function createWavyLineGreymapMaskSpec(
  params: WavyLineGreymapMaskParams,
  viewport: Viewport
): GreymapMaskSpec {
  // Use innerValue/outerValue directly - cutout logic is handled by the caller

  const data = new Float32Array([
    params.position,
    wavyLineDirectionToNumber(params.direction),
    params.amplitude,
    params.frequency,
    params.octaves,
    params.seed,
    params.innerValue,
    params.outerValue,
    viewport.width,
    viewport.height,
    0, // padding
    0, // padding
  ])
  return {
    shader: wavyLineGreymapMaskShader,
    uniforms: data.buffer,
    bufferSize: 48, // 12 floats = 48 bytes
  }
}

// ============================================================
// Simplex Greymap Mask
// ============================================================

/** Simplex noise greymap mask shader */
export const simplexGreymapMaskShader = /* wgsl */ `
${fullscreenVertex}

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

  // First corner
  var i = floor(v + dot(v, C.yy));
  let x0 = v - i + dot(i, C.xx);

  // Other corners
  var i1: vec2f;
  if (x0.x > x0.y) {
    i1 = vec2f(1.0, 0.0);
  } else {
    i1 = vec2f(0.0, 1.0);
  }
  var x12 = x0.xyxy + C.xxzz;
  x12 = vec4f(x12.xy - i1, x12.zw);

  // Permutations
  i = mod289v2(i);
  let p = permute(permute(i.y + vec3f(0.0, i1.y, 1.0)) + i.x + vec3f(0.0, i1.x, 1.0));

  var m = max(vec3f(0.5) - vec3f(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), vec3f(0.0));
  m = m * m;
  m = m * m;

  // Gradients
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

struct SimplexGreymapParams {
  seed: f32,
  threshold: f32,
  scale: f32,
  octaves: f32,
  innerValue: f32,
  outerValue: f32,
  viewportWidth: f32,
  viewportHeight: f32,
}

@group(0) @binding(0) var<uniform> params: SimplexGreymapParams;

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = vec2f(pos.x / params.viewportWidth, pos.y / params.viewportHeight);
  let noisePos = uv * params.scale + vec2f(params.seed * 0.1, params.seed * 0.073);

  let octaves = clamp(i32(params.octaves), 1, 8);
  let noise = simplexFbm(noisePos, octaves);

  // Binarize: noise > threshold -> inner, else -> outer
  let mask = select(0.0, 1.0, noise > params.threshold);
  let value = mix(params.outerValue, params.innerValue, mask);

  return vec4f(value, value, value, 1.0);
}
`

/**
 * Create greymap spec for simplex noise mask
 */
export function createSimplexGreymapMaskSpec(
  params: SimplexGreymapMaskParams,
  viewport: Viewport
): GreymapMaskSpec {
  const data = new Float32Array([
    params.seed,
    params.threshold,
    params.scale,
    params.octaves,
    params.innerValue,
    params.outerValue,
    viewport.width,
    viewport.height,
  ])
  return {
    shader: simplexGreymapMaskShader,
    uniforms: data.buffer,
    bufferSize: 32, // 8 floats = 32 bytes
  }
}

// ============================================================
// Curl Greymap Mask
// ============================================================

/** Curl noise greymap mask shader */
export const curlGreymapMaskShader = /* wgsl */ `
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
fn computeCurl(p: vec2f, octaves: i32) -> vec2f {
  let eps = 0.01;

  let dx = curlFbm(p + vec2f(eps, 0.0), octaves) - curlFbm(p - vec2f(eps, 0.0), octaves);
  let dy = curlFbm(p + vec2f(0.0, eps), octaves) - curlFbm(p - vec2f(0.0, eps), octaves);

  return vec2f(dy, -dx) / (2.0 * eps);
}

struct CurlGreymapParams {
  seed: f32,
  threshold: f32,
  scale: f32,
  octaves: f32,
  intensity: f32,
  innerValue: f32,
  outerValue: f32,
  viewportWidth: f32,
  viewportHeight: f32,
  _padding1: f32,
  _padding2: f32,
  _padding3: f32,
}

@group(0) @binding(0) var<uniform> params: CurlGreymapParams;

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
  let value = mix(params.outerValue, params.innerValue, mask);

  return vec4f(value, value, value, 1.0);
}
`

/**
 * Create greymap spec for curl noise mask
 */
export function createCurlGreymapMaskSpec(
  params: CurlGreymapMaskParams,
  viewport: Viewport
): GreymapMaskSpec {
  const data = new Float32Array([
    params.seed,
    params.threshold,
    params.scale,
    params.octaves,
    params.intensity,
    params.innerValue,
    params.outerValue,
    viewport.width,
    viewport.height,
    0, // padding
    0, // padding
    0, // padding
  ])
  return {
    shader: curlGreymapMaskShader,
    uniforms: data.buffer,
    bufferSize: 48, // 12 floats = 48 bytes
  }
}
