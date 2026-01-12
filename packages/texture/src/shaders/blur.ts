import { fullscreenVertex } from './common'
import type { Viewport } from '../Domain'

/**
 * ブラーマスク形状タイプ
 */
export type BlurMaskShape = 'none' | 'linear' | 'radial' | 'rectangular'

/**
 * ブラーフィルターのパラメータ
 */
export interface BlurParams {
  /** ブラー半径 (1-30) */
  radius: number
  /** マスク形状 */
  maskShape: BlurMaskShape
  /** マスク反転 */
  invert: boolean
  // Linear mask params
  /** 角度 (度) */
  angle?: number
  /** 中心X (0-1) */
  centerX?: number
  /** 中心Y (0-1) */
  centerY?: number
  /** フォーカス幅 (0-1) */
  focusWidth?: number
  /** フェザー (0-1) */
  feather?: number
  // Radial mask params
  /** 内側半径 (0-1) */
  innerRadius?: number
  /** 外側半径 (0-1.5) */
  outerRadius?: number
  /** アスペクト比 */
  aspectRatio?: number
  // Rectangular mask params
  /** 幅 (0-1) */
  width?: number
  /** 高さ (0-1) */
  height?: number
  /** 角丸半径 (0-0.5) */
  cornerRadius?: number
}

/**
 * ブラーシェーダー（入力テクスチャベース）
 * マスクベースの領域ブラー対応
 */
export const blurShader = /* wgsl */ `
struct Uniforms {
  radius: f32,           // 0
  viewportWidth: f32,    // 4
  viewportHeight: f32,   // 8
  maskShape: f32,        // 12 (0=none, 1=linear, 2=radial, 3=rectangular)
  invert: f32,           // 16
  angle: f32,            // 20 (degrees, for linear)
  centerX: f32,          // 24
  centerY: f32,          // 28
  focusWidth: f32,       // 32 (for linear)
  feather: f32,          // 36
  innerRadius: f32,      // 40 (for radial)
  outerRadius: f32,      // 44 (for radial)
  aspectRatio: f32,      // 48 (for radial)
  rectWidth: f32,        // 52 (for rectangular)
  rectHeight: f32,       // 56 (for rectangular)
  cornerRadius: f32,     // 60 (for rectangular)
}

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var inputSampler: sampler;
@group(0) @binding(2) var inputTexture: texture_2d<f32>;

${fullscreenVertex}

// Linear mask: gradient along a direction (tilt-shift effect)
fn linearMask(uv: vec2f) -> f32 {
  let center = vec2f(u.centerX, u.centerY);
  let angleRad = u.angle * 3.14159265359 / 180.0;
  let dir = vec2f(cos(angleRad), sin(angleRad));

  // Project point onto direction vector from center
  let delta = uv - center;
  let dist = abs(dot(delta, dir));

  // Calculate mask based on distance from focus line
  let halfFocus = u.focusWidth * 0.5;
  let outerEdge = halfFocus + u.feather;

  if (dist < halfFocus) {
    return 0.0; // In focus area - no blur
  } else if (dist < outerEdge) {
    return smoothstep(halfFocus, outerEdge, dist); // Transition
  } else {
    return 1.0; // Full blur
  }
}

// Radial mask: circular/elliptical gradient from center (focus effect)
fn radialMask(uv: vec2f) -> f32 {
  let center = vec2f(u.centerX, u.centerY);
  var delta = uv - center;

  // Apply aspect ratio correction
  if (u.aspectRatio > 1.0) {
    delta.x *= u.aspectRatio;
  } else {
    delta.y /= u.aspectRatio;
  }

  let dist = length(delta);

  if (dist < u.innerRadius) {
    return 0.0; // In focus area - no blur
  } else if (dist < u.outerRadius) {
    return smoothstep(u.innerRadius, u.outerRadius, dist); // Transition
  } else {
    return 1.0; // Full blur
  }
}

// Rectangular mask: box-shaped blur region
fn rectangularMask(uv: vec2f) -> f32 {
  let center = vec2f(u.centerX, u.centerY);
  let halfSize = vec2f(u.rectWidth * 0.5, u.rectHeight * 0.5);
  let p = abs(uv - center);

  // Calculate SDF for rounded rectangle
  let innerHalf = halfSize - u.cornerRadius;
  let q = p - innerHalf;
  let outerDist = length(max(q, vec2f(0.0))) + min(max(q.x, q.y), 0.0) - u.cornerRadius;

  // Normalize distance for feathering
  let innerEdge = 0.0;
  let outerEdge = u.feather;

  if (outerDist < innerEdge) {
    return 0.0; // Inside rectangle - no blur
  } else if (outerDist < outerEdge) {
    return smoothstep(innerEdge, outerEdge, outerDist); // Transition
  } else {
    return 1.0; // Full blur
  }
}

fn getMaskValue(uv: vec2f) -> f32 {
  var mask: f32;

  let shape = i32(u.maskShape);
  if (shape == 1) {
    mask = linearMask(uv);
  } else if (shape == 2) {
    mask = radialMask(uv);
  } else if (shape == 3) {
    mask = rectangularMask(uv);
  } else {
    mask = 1.0; // No mask - full blur
  }

  // Apply invert
  if (u.invert > 0.5) {
    mask = 1.0 - mask;
  }

  return mask;
}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let texSize = vec2f(u.viewportWidth, u.viewportHeight);
  let uv = pos.xy / texSize;
  let pixelSize = 1.0 / texSize;

  // Get mask value for this pixel
  let maskValue = getMaskValue(uv);

  // If no blur needed, return original color
  if (maskValue < 0.001) {
    return textureSample(inputTexture, inputSampler, uv);
  }

  // Scale blur radius by mask value
  let effectiveRadius = u.radius * maskValue;
  let sigma = effectiveRadius / 3.0;

  // Gaussian-weighted blur with 1-pixel step
  var sum = vec4f(0.0);
  var totalWeight = 0.0;

  for (var y: i32 = -4; y <= 4; y = y + 1) {
    for (var x: i32 = -4; x <= 4; x = x + 1) {
      let sampleOffset = vec2f(f32(x), f32(y)) * pixelSize;
      let dist = f32(x * x + y * y);
      let weight = exp(-dist / (2.0 * sigma * sigma));
      sum = sum + textureSample(inputTexture, inputSampler, uv + sampleOffset) * weight;
      totalWeight = totalWeight + weight;
    }
  }

  let blurredColor = sum / totalWeight;
  let originalColor = textureSample(inputTexture, inputSampler, uv);

  // Blend between original and blurred based on mask
  return mix(originalColor, blurredColor, maskValue);
}
`

export const BLUR_BUFFER_SIZE = 64 // 16 floats * 4 bytes = 64 bytes (16-byte aligned)

/**
 * ブラーフィルター用のuniformsを生成
 */
export const createBlurUniforms = (
  params: BlurParams,
  viewport: Viewport
): ArrayBuffer => {
  const uniforms = new ArrayBuffer(BLUR_BUFFER_SIZE)
  const view = new DataView(uniforms)

  // Basic params
  view.setFloat32(0, params.radius, true)
  view.setFloat32(4, viewport.width, true)
  view.setFloat32(8, viewport.height, true)

  // Mask shape: 0=none, 1=linear, 2=radial, 3=rectangular
  const shapeMap: Record<BlurMaskShape, number> = {
    none: 0,
    linear: 1,
    radial: 2,
    rectangular: 3,
  }
  view.setFloat32(12, shapeMap[params.maskShape] ?? 0, true)

  // Invert
  view.setFloat32(16, params.invert ? 1.0 : 0.0, true)

  // Linear params
  view.setFloat32(20, params.angle ?? 0, true)
  view.setFloat32(24, params.centerX ?? 0.5, true)
  view.setFloat32(28, params.centerY ?? 0.5, true)
  view.setFloat32(32, params.focusWidth ?? 0.3, true)
  view.setFloat32(36, params.feather ?? 0.2, true)

  // Radial params
  view.setFloat32(40, params.innerRadius ?? 0.2, true)
  view.setFloat32(44, params.outerRadius ?? 0.6, true)
  view.setFloat32(48, params.aspectRatio ?? 1.0, true)

  // Rectangular params
  view.setFloat32(52, params.width ?? 0.6, true)
  view.setFloat32(56, params.height ?? 0.4, true)
  view.setFloat32(60, params.cornerRadius ?? 0, true)

  return uniforms
}
