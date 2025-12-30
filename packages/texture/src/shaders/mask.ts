import { fullscreenVertex, aaUtils, maskBlendState } from './common'
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
}

/** 長方形マスクのパラメータ */
export type RectMaskParams = RectMaskUniformRadius | RectMaskIndividualRadius

/** 円形マスクシェーダー */
export const circleMaskShader = /* wgsl */ `
${fullscreenVertex}

${aaUtils}

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

  // アスペクト比補正（横長の場合はXを縮める）
  if (aspectRatio > 1.0) {
    delta.x *= aspectRatio;
  } else {
    delta.y /= aspectRatio;
  }

  let dist = length(delta);

  // アンチエイリアス付きの円形マスク
  let pixelSize = 1.0 / min(viewportWidth, viewportHeight);
  let edge = params.radius;
  let aa = smoothstep(edge - pixelSize, edge + pixelSize, dist);

  return mix(params.innerColor, params.outerColor, aa);
}
`

/** 長方形マスクシェーダー（4角個別の角丸対応） */
export const rectMaskShader = /* wgsl */ `
${fullscreenVertex}

${aaUtils}

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
  aspectRatio: f32,
  viewportWidth: f32,
  viewportHeight: f32,
  _padding: f32,
}

@group(0) @binding(0) var<uniform> params: RectMaskParams;

// Signed distance function for rounded rectangle with per-corner radii
// radii: vec4f(topLeft, topRight, bottomRight, bottomLeft)
fn sdRoundedRectVar(p: vec2f, halfSize: vec2f, radii: vec4f) -> f32 {
  // 象限に応じて適切なradiusを選択
  // p.x < 0 なら左側、p.y < 0 なら上側
  var r: f32;
  if (p.x < 0.0) {
    if (p.y < 0.0) {
      r = radii.x; // top-left
    } else {
      r = radii.w; // bottom-left
    }
  } else {
    if (p.y < 0.0) {
      r = radii.y; // top-right
    } else {
      r = radii.z; // bottom-right
    }
  }

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
  var correctedHalfSize = halfSize;
  var radii = vec4f(params.radiusTopLeft, params.radiusTopRight, params.radiusBottomRight, params.radiusBottomLeft);

  // アスペクト比補正（正方形空間に変換して計算）
  if (aspectRatio > 1.0) {
    p.x *= aspectRatio;
    correctedHalfSize.x *= aspectRatio;
    radii *= aspectRatio;
  } else {
    p.y /= aspectRatio;
    correctedHalfSize.y /= aspectRatio;
    radii /= aspectRatio;
  }

  // 各radiusを矩形の短辺の半分までにクランプ
  let maxRadius = min(correctedHalfSize.x, correctedHalfSize.y);
  radii = min(radii, vec4f(maxRadius));

  // SDFで距離を計算
  let dist = sdRoundedRectVar(p, correctedHalfSize, radii);

  // アンチエイリアス
  let pixelSize = 1.0 / min(viewportWidth, viewportHeight);
  let inside = 1.0 - smoothstep(-pixelSize, pixelSize, dist);

  return mix(params.outerColor, params.innerColor, inside);
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
    aspectRatio,
    viewport.width,
    viewport.height,
    0, // padding
  ])
  return {
    shader: rectMaskShader,
    uniforms: data.buffer,
    bufferSize: 96,
    blend: maskBlendState,
  }
}

