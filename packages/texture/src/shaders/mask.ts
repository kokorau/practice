import { fullscreenVertex, aaUtils, maskBlendState, oklabUtils } from './common'
import type { TextureRenderSpec, Viewport } from '../Domain'

/** 円形マスクのパラメータ */
export interface CircleMaskParams {
  /** 中心X座標 (0.0-1.0, 正規化座標) */
  centerX: number
  /** 中心Y座標 (0.0-1.0, 正規化座標) */
  centerY: number
  /** 半径 (0.0-1.0, 画面の短辺に対する比率) */
  radius: number
  /** 内側の色 */
  innerColor: [number, number, number, number]
  /** 外側の色 */
  outerColor: [number, number, number, number]
  /** If true (default), texture is rendered outside the shape (cutout). If false, texture fills the shape (solid). */
  cutout?: boolean
}

/** 長方形マスクの基本パラメータ */
interface RectMaskBaseParams {
  /** 左端 (0.0-1.0) */
  left: number
  /** 右端 (0.0-1.0) */
  right: number
  /** 上端 (0.0-1.0) */
  top: number
  /** 下端 (0.0-1.0) */
  bottom: number
  /** 内側の色 */
  innerColor: [number, number, number, number]
  /** 外側の色 */
  outerColor: [number, number, number, number]
  /** If true (default), texture is rendered outside the shape (cutout). If false, texture fills the shape (solid). */
  cutout?: boolean
}

/** 全角に同じ角丸を適用 */
interface RectMaskUniformRadius extends RectMaskBaseParams {
  /** 角丸の半径 (全角に適用) */
  radius?: number
  /** Z-axis rotation in degrees (0-360) */
  rotation?: number
  /** Horizontal perspective (-0.5 to 0.5, negative=left narrow, positive=right narrow) */
  perspectiveX?: number
  /** Vertical perspective (-0.5 to 0.5, negative=top narrow, positive=bottom narrow) */
  perspectiveY?: number
}

/** 各角に個別の角丸を適用 */
interface RectMaskIndividualRadius extends RectMaskBaseParams {
  /** 左上の角丸半径 */
  radiusTopLeft: number
  /** 右上の角丸半径 */
  radiusTopRight: number
  /** 左下の角丸半径 */
  radiusBottomLeft: number
  /** 右下の角丸半径 */
  radiusBottomRight: number
  /** Z-axis rotation in degrees (0-360) */
  rotation?: number
  /** Horizontal perspective (-0.5 to 0.5, negative=left narrow, positive=right narrow) */
  perspectiveX?: number
  /** Vertical perspective (-0.5 to 0.5, negative=top narrow, positive=bottom narrow) */
  perspectiveY?: number
}

/** 長方形マスクのパラメータ */
export type RectMaskParams = RectMaskUniformRadius | RectMaskIndividualRadius

/** 円形マスクシェーダー */
export const circleMaskShader = /* wgsl */ `
${fullscreenVertex}

${aaUtils}

${oklabUtils}

struct CircleMaskParams {
  innerColor: vec4f,
  outerColor: vec4f,
  centerX: f32,
  centerY: f32,
  radius: f32,
  aspectRatio: f32,
  viewportWidth: f32,
  viewportHeight: f32,
}

@group(0) @binding(0) var<uniform> params: CircleMaskParams;

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let aspectRatio = params.aspectRatio;
  let viewportWidth = params.viewportWidth;
  let viewportHeight = params.viewportHeight;

  let uv = vec2f(pos.x / viewportWidth, pos.y / viewportHeight);

  // 中心からの距離を計算（アスペクト比を考慮）
  let center = vec2f(params.centerX, params.centerY);
  var delta = uv - center;

  // アスペクト比補正（分岐なしで統一的に処理）
  delta.x *= max(aspectRatio, 1.0);
  delta.y *= max(1.0 / aspectRatio, 1.0);

  let dist = length(delta);

  // アンチエイリアス付きの円形マスク
  let pixelSize = 1.0 / min(viewportWidth, viewportHeight);
  let edge = params.radius;
  let aa = smoothstep(edge - pixelSize, edge + pixelSize, dist);

  return mixOklabVec4(params.innerColor, params.outerColor, aa);
}
`

/** 長方形マスクシェーダー（4角個別の角丸対応 + 回転/パース） */
export const rectMaskShader = /* wgsl */ `
${fullscreenVertex}

${aaUtils}

${oklabUtils}

struct RectMaskParams {
  innerColor: vec4f,
  outerColor: vec4f,
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
  aspectRatio: f32,
  viewportWidth: f32,
  viewportHeight: f32,
}

@group(0) @binding(0) var<uniform> params: RectMaskParams;

// Signed distance function for rounded rectangle with per-corner radii
// radii: vec4f(topLeft, topRight, bottomRight, bottomLeft)
fn sdRoundedRectVar(p: vec2f, halfSize: vec2f, radii: vec4f) -> f32 {
  // 象限に応じて適切なradiusを選択（step関数で分岐を排除）
  // p.x >= 0 なら右側、p.y >= 0 なら下側
  let sx = step(0.0, p.x);
  let sy = step(0.0, p.y);
  let r = mix(
    mix(radii.x, radii.y, sx),  // 上側: top-left / top-right
    mix(radii.w, radii.z, sx),  // 下側: bottom-left / bottom-right
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

  // 矩形の中心と半サイズを計算
  let center = vec2f((params.left + params.right) / 2.0, (params.top + params.bottom) / 2.0);
  let halfSize = vec2f((params.right - params.left) / 2.0, (params.bottom - params.top) / 2.0);

  // uvから中心への距離
  var p = uv - center;

  // パース変換: Y位置に応じてX方向をスケール（perspectiveY）
  // perspectiveY > 0: 下に行くほど幅が狭くなる
  if (abs(params.perspectiveY) > 0.001) {
    let yFactor = (p.y / halfSize.y) * params.perspectiveY;
    p.x *= 1.0 + yFactor;
  }

  // パース変換: X位置に応じてY方向をスケール（perspectiveX）
  // perspectiveX > 0: 右に行くほど高さが狭くなる
  if (abs(params.perspectiveX) > 0.001) {
    let xFactor = (p.x / halfSize.x) * params.perspectiveX;
    p.y *= 1.0 + xFactor;
  }

  // 回転変換（中心周り）
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

  // アスペクト比補正（分岐なしで統一的に処理）
  let scaleX = max(aspectRatio, 1.0);
  let scaleY = max(1.0 / aspectRatio, 1.0);
  p.x *= scaleX;
  p.y *= scaleY;
  correctedHalfSize.x *= scaleX;
  correctedHalfSize.y *= scaleY;
  radii *= max(aspectRatio, 1.0 / aspectRatio);

  // 各radiusを矩形の短辺の半分までにクランプ
  let maxRadius = min(correctedHalfSize.x, correctedHalfSize.y);
  radii = min(radii, vec4f(maxRadius));

  // SDFで距離を計算
  let dist = sdRoundedRectVar(p, correctedHalfSize, radii);

  // アンチエイリアス
  let pixelSize = 1.0 / min(viewportWidth, viewportHeight);
  let inside = 1.0 - smoothstep(-pixelSize, pixelSize, dist);

  return mixOklabVec4(params.outerColor, params.innerColor, inside);
}
`

/**
 * Create render spec for circle mask
 */
export function createCircleMaskSpec(
  params: CircleMaskParams,
  viewport: Viewport
): TextureRenderSpec {
  const aspectRatio = viewport.width / viewport.height
  const cutout = params.cutout ?? true
  // When cutout=false (solid), swap inner/outer colors to fill the shape
  const innerColor = cutout ? params.innerColor : params.outerColor
  const outerColor = cutout ? params.outerColor : params.innerColor
  const data = new Float32Array([
    ...innerColor,
    ...outerColor,
    params.centerX,
    params.centerY,
    params.radius,
    aspectRatio,
    viewport.width,
    viewport.height,
  ])
  return {
    shader: circleMaskShader,
    uniforms: data.buffer,
    bufferSize: 64,
    blend: maskBlendState,
  }
}

/**
 * Create render spec for rect mask
 */
export function createRectMaskSpec(
  params: RectMaskParams,
  viewport: Viewport
): TextureRenderSpec {
  const aspectRatio = viewport.width / viewport.height
  const cutout = params.cutout ?? true
  // When cutout=false (solid), swap inner/outer colors to fill the shape
  const innerColor = cutout ? params.innerColor : params.outerColor
  const outerColor = cutout ? params.outerColor : params.innerColor

  // 個別指定か全角指定かを判別
  const isIndividual = 'radiusTopLeft' in params
  const radiusTopLeft = isIndividual ? params.radiusTopLeft : (params.radius ?? 0)
  const radiusTopRight = isIndividual ? params.radiusTopRight : (params.radius ?? 0)
  const radiusBottomLeft = isIndividual ? params.radiusBottomLeft : (params.radius ?? 0)
  const radiusBottomRight = isIndividual ? params.radiusBottomRight : (params.radius ?? 0)

  // Rotation and perspective parameters
  const rotation = params.rotation ?? 0
  const perspectiveX = params.perspectiveX ?? 0
  const perspectiveY = params.perspectiveY ?? 0

  const data = new Float32Array([
    ...innerColor,
    ...outerColor,
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
    aspectRatio,
    viewport.width,
    viewport.height,
  ])
  return {
    shader: rectMaskShader,
    uniforms: data.buffer,
    bufferSize: 96, // 24 floats = 96 bytes (16-byte aligned)
    blend: maskBlendState,
  }
}

/** Perlin noise mask parameters */
export interface PerlinMaskParams {
  /** Random seed */
  seed: number
  /** Threshold for binarization (0.0-1.0) */
  threshold: number
  /** Noise scale */
  scale: number
  /** fBm octaves (1-8) */
  octaves: number
  /** Inner color (where noise > threshold) */
  innerColor: [number, number, number, number]
  /** Outer color (where noise <= threshold) */
  outerColor: [number, number, number, number]
  /** If true (default), noise > threshold is opaque. If false, noise <= threshold is opaque. */
  cutout?: boolean
}

/** Perlin noise mask shader */
export const perlinMaskShader = /* wgsl */ `
${fullscreenVertex}

${oklabUtils}

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

struct PerlinMaskParams {
  innerColor: vec4f,
  outerColor: vec4f,
  seed: f32,
  threshold: f32,
  scale: f32,
  octaves: f32,
  viewportWidth: f32,
  viewportHeight: f32,
}

@group(0) @binding(0) var<uniform> params: PerlinMaskParams;

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = vec2f(pos.x / params.viewportWidth, pos.y / params.viewportHeight);
  let noisePos = uv * params.scale + vec2f(params.seed * 0.1, params.seed * 0.073);

  let octaves = clamp(i32(params.octaves), 1, 8);
  let noise = perlinFbm(noisePos, octaves);

  // Binarize: noise > threshold -> inner, else -> outer
  let isInner = noise > params.threshold;

  return select(params.outerColor, params.innerColor, isInner);
}
`

/**
 * Create render spec for perlin noise mask
 */
export function createPerlinMaskSpec(
  params: PerlinMaskParams,
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
    viewport.width,
    viewport.height,
  ])
  return {
    shader: perlinMaskShader,
    uniforms: data.buffer,
    bufferSize: 64, // 8 floats for colors + 6 floats = 14 floats, but need 16-byte alignment
    blend: maskBlendState,
  }
}

/** Linear gradient mask parameters */
export interface LinearGradientMaskParams {
  /** Gradient angle in degrees (0-360) */
  angle: number
  /** Start offset (0.0-1.0, normalized coordinate) */
  startOffset: number
  /** End offset (0.0-1.0, normalized coordinate) */
  endOffset: number
  /** Inner color (where gradient value is 0) */
  innerColor: [number, number, number, number]
  /** Outer color (where gradient value is 1) */
  outerColor: [number, number, number, number]
  /** If true (default), gradient goes from inner to outer. If false, reversed. */
  cutout?: boolean
}

/** Linear gradient mask shader */
export const linearGradientMaskShader = /* wgsl */ `
${fullscreenVertex}

${oklabUtils}

struct LinearGradientMaskParams {
  innerColor: vec4f,
  outerColor: vec4f,
  angle: f32,
  startOffset: f32,
  endOffset: f32,
  viewportWidth: f32,
  viewportHeight: f32,
}

@group(0) @binding(0) var<uniform> params: LinearGradientMaskParams;

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = vec2f(pos.x / params.viewportWidth, pos.y / params.viewportHeight);

  // Convert angle from degrees to radians
  let angleRad = params.angle * 3.14159265359 / 180.0;

  // Calculate direction vector from angle
  let dir = vec2f(cos(angleRad), sin(angleRad));

  // Project UV onto gradient direction
  // Center at 0.5, 0.5 for symmetric gradient
  let projected = dot(uv - 0.5, dir) + 0.5;

  // Apply gradient with start/end offsets
  let t = smoothstep(params.startOffset, params.endOffset, projected);

  return mixOklabVec4(params.innerColor, params.outerColor, t);
}
`

/**
 * Create render spec for linear gradient mask
 */
export function createLinearGradientMaskSpec(
  params: LinearGradientMaskParams,
  viewport: Viewport
): TextureRenderSpec {
  const cutout = params.cutout ?? true
  // When cutout=false, swap inner/outer colors
  const innerColor = cutout ? params.innerColor : params.outerColor
  const outerColor = cutout ? params.outerColor : params.innerColor

  const data = new Float32Array([
    ...innerColor,
    ...outerColor,
    params.angle,
    params.startOffset,
    params.endOffset,
    viewport.width,
    viewport.height,
    0, // padding for 16-byte alignment
  ])
  return {
    shader: linearGradientMaskShader,
    uniforms: data.buffer,
    bufferSize: 64,
    blend: maskBlendState,
  }
}

/** Radial gradient mask parameters */
export interface RadialGradientMaskParams {
  /** Center X coordinate (0.0-1.0, normalized) */
  centerX: number
  /** Center Y coordinate (0.0-1.0, normalized) */
  centerY: number
  /** Inner radius (fully opaque) */
  innerRadius: number
  /** Outer radius (fully transparent) */
  outerRadius: number
  /** Aspect ratio for ellipse (1.0 = circle) */
  aspectRatio: number
  /** Inner color (where gradient value is 0) */
  innerColor: [number, number, number, number]
  /** Outer color (where gradient value is 1) */
  outerColor: [number, number, number, number]
  /** If true (default), gradient goes from inner to outer. If false, reversed. */
  cutout?: boolean
}

/** Radial gradient mask shader */
export const radialGradientMaskShader = /* wgsl */ `
${fullscreenVertex}

${oklabUtils}

struct RadialGradientMaskParams {
  innerColor: vec4f,
  outerColor: vec4f,
  centerX: f32,
  centerY: f32,
  innerRadius: f32,
  outerRadius: f32,
  aspectRatio: f32,
  viewportWidth: f32,
  viewportHeight: f32,
  viewportAspectRatio: f32,
}

@group(0) @binding(0) var<uniform> params: RadialGradientMaskParams;

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = vec2f(pos.x / params.viewportWidth, pos.y / params.viewportHeight);

  // Calculate center
  let center = vec2f(params.centerX, params.centerY);

  // Apply aspect ratio correction for ellipse
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

  // Also correct for viewport aspect ratio
  if (params.viewportAspectRatio > 1.0) {
    scaledUV.x = (scaledUV.x - scaledCenter.x) * params.viewportAspectRatio + scaledCenter.x;
  } else {
    scaledUV.y = (scaledUV.y - scaledCenter.y) / params.viewportAspectRatio + scaledCenter.y;
  }

  let dist = distance(scaledUV, scaledCenter);

  // Apply gradient with smooth interpolation
  let t = smoothstep(params.innerRadius, params.outerRadius, dist);

  return mixOklabVec4(params.innerColor, params.outerColor, t);
}
`

/**
 * Create render spec for radial gradient mask
 */
export function createRadialGradientMaskSpec(
  params: RadialGradientMaskParams,
  viewport: Viewport
): TextureRenderSpec {
  const cutout = params.cutout ?? true
  // When cutout=false, swap inner/outer colors
  const innerColor = cutout ? params.innerColor : params.outerColor
  const outerColor = cutout ? params.outerColor : params.innerColor
  const viewportAspectRatio = viewport.width / viewport.height

  const data = new Float32Array([
    ...innerColor,
    ...outerColor,
    params.centerX,
    params.centerY,
    params.innerRadius,
    params.outerRadius,
    params.aspectRatio,
    viewport.width,
    viewport.height,
    viewportAspectRatio,
  ])
  return {
    shader: radialGradientMaskShader,
    uniforms: data.buffer,
    bufferSize: 64,
    blend: maskBlendState,
  }
}

/** Box gradient mask parameters */
export interface BoxGradientMaskParams {
  /** Left edge fade width (0.0-1.0, normalized coordinate) */
  left: number
  /** Right edge fade width (0.0-1.0, normalized coordinate) */
  right: number
  /** Top edge fade width (0.0-1.0, normalized coordinate) */
  top: number
  /** Bottom edge fade width (0.0-1.0, normalized coordinate) */
  bottom: number
  /** Corner radius */
  cornerRadius: number
  /** Fade curve type (0=linear, 1=smooth, 2=easeIn, 3=easeOut) */
  curve: 'linear' | 'smooth' | 'easeIn' | 'easeOut'
  /** Inner color (center of gradient) */
  innerColor: [number, number, number, number]
  /** Outer color (edges of gradient) */
  outerColor: [number, number, number, number]
  /** If true (default), gradient goes from inner to outer. If false, reversed. */
  cutout?: boolean
}

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

/** Box gradient mask shader */
export const boxGradientMaskShader = /* wgsl */ `
${fullscreenVertex}

${oklabUtils}

struct BoxGradientMaskParams {
  innerColor: vec4f,
  outerColor: vec4f,
  left: f32,
  right: f32,
  top: f32,
  bottom: f32,
  cornerRadius: f32,
  curve: f32,
  viewportWidth: f32,
  viewportHeight: f32,
  viewportAspectRatio: f32,
  _padding: f32,
}

@group(0) @binding(0) var<uniform> params: BoxGradientMaskParams;

// Apply curve function based on curve type
fn applyCurve(t: f32, curveType: f32) -> f32 {
  let curveInt = i32(curveType);
  if (curveInt == 0) {
    // linear
    return t;
  } else if (curveInt == 1) {
    // smooth (smoothstep-like)
    return t * t * (3.0 - 2.0 * t);
  } else if (curveInt == 2) {
    // easeIn (quadratic)
    return t * t;
  } else {
    // easeOut (inverse quadratic)
    return 1.0 - (1.0 - t) * (1.0 - t);
  }
}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = vec2f(pos.x / params.viewportWidth, pos.y / params.viewportHeight);

  // Calculate distance from each edge (0 at edge, 1 at full fade width)
  // Then invert so t=0 at center, t=1 at edges (like RadialGradient)
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

  // Maximum of all edges forms the box gradient (t=0 at center, t=1 at edges)
  var t = max(max(dLeft, dRight), max(dTop, dBottom));

  // Apply corner radius effect in corners
  if (params.cornerRadius > 0.0) {
    let cr = params.cornerRadius;

    // Check if we're in a corner region
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

  // Apply curve
  t = applyCurve(t, params.curve);

  // Mix like RadialGradient: t=0 -> innerColor (center), t=1 -> outerColor (edges)
  return mixOklabVec4(params.innerColor, params.outerColor, t);
}
`

/**
 * Create render spec for box gradient mask
 */
export function createBoxGradientMaskSpec(
  params: BoxGradientMaskParams,
  viewport: Viewport
): TextureRenderSpec {
  const cutout = params.cutout ?? true
  // When cutout=false, swap inner/outer colors
  const innerColor = cutout ? params.innerColor : params.outerColor
  const outerColor = cutout ? params.outerColor : params.innerColor
  const viewportAspectRatio = viewport.width / viewport.height

  const data = new Float32Array([
    ...innerColor,
    ...outerColor,
    params.left,
    params.right,
    params.top,
    params.bottom,
    params.cornerRadius,
    curveTypeToNumber(params.curve),
    viewport.width,
    viewport.height,
    viewportAspectRatio,
    0, // padding
  ])
  return {
    shader: boxGradientMaskShader,
    uniforms: data.buffer,
    bufferSize: 80, // 18 floats = 72 bytes, aligned to 16 = 80
    blend: maskBlendState,
  }
}

/** Wavy line mask parameters */
export interface WavyLineMaskParams {
  /** Line position (0.0-1.0, where the dividing line is) */
  position: number
  /** Direction: 0=vertical line (left/right split), 1=horizontal line (top/bottom split) */
  direction: 'vertical' | 'horizontal'
  /** Wave amplitude (0.0-0.5) */
  amplitude: number
  /** Wave frequency (1-20) */
  frequency: number
  /** fBm octaves for smoother/rougher waves (1-5) */
  octaves: number
  /** Random seed for variation */
  seed: number
  /** Inner color (the "inside" side) */
  innerColor: [number, number, number, number]
  /** Outer color (the "outside" side) */
  outerColor: [number, number, number, number]
  /** If true (default), inside is on the left/top. If false, reversed. */
  cutout?: boolean
}

/** Wavy line mask shader - uses 1D Perlin noise for organic dividing line */
export const wavyLineMaskShader = /* wgsl */ `
${fullscreenVertex}

${aaUtils}

${oklabUtils}

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

struct WavyLineMaskParams {
  innerColor: vec4f,
  outerColor: vec4f,
  position: f32,
  direction: f32,
  amplitude: f32,
  frequency: f32,
  octaves: f32,
  seed: f32,
  viewportWidth: f32,
  viewportHeight: f32,
}

@group(0) @binding(0) var<uniform> params: WavyLineMaskParams;

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

  return mixOklabVec4(params.innerColor, params.outerColor, inside);
}
`

/** Convert direction string to number for shader */
function directionToNumber(direction: 'vertical' | 'horizontal'): number {
  return direction === 'vertical' ? 0 : 1
}

/**
 * Create render spec for wavy line mask
 */
export function createWavyLineMaskSpec(
  params: WavyLineMaskParams,
  viewport: Viewport
): TextureRenderSpec {
  const cutout = params.cutout ?? true
  // When cutout=false, swap inner/outer colors
  const innerColor = cutout ? params.innerColor : params.outerColor
  const outerColor = cutout ? params.outerColor : params.innerColor

  const data = new Float32Array([
    ...innerColor,
    ...outerColor,
    params.position,
    directionToNumber(params.direction),
    params.amplitude,
    params.frequency,
    params.octaves,
    params.seed,
    viewport.width,
    viewport.height,
  ])
  return {
    shader: wavyLineMaskShader,
    uniforms: data.buffer,
    bufferSize: 64, // 16 floats = 64 bytes
    blend: maskBlendState,
  }
}
