import { fullscreenVertex, aaUtils } from './common'

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
}

/** 半分マスクの方向 */
export type HalfMaskDirection = 'top' | 'bottom' | 'left' | 'right'

/** 半分マスクのパラメータ */
export interface HalfMaskParams {
  /** 方向 */
  direction: HalfMaskDirection
  /** 見える側の色 */
  visibleColor: [number, number, number, number]
  /** 隠れる側の色 */
  hiddenColor: [number, number, number, number]
}

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

/** 長方形マスクのパラメータ */
export interface RectMaskParams {
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
}

/** 長方形マスクシェーダー */
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
  viewportWidth: f32,
  viewportHeight: f32,
}

@group(0) @binding(0) var<uniform> params: RectMaskParams;

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let viewportWidth = params.viewportWidth;
  let viewportHeight = params.viewportHeight;

  let uv = vec2f(pos.x / viewportWidth, pos.y / viewportHeight);

  let pixelSizeX = 1.0 / viewportWidth;
  let pixelSizeY = 1.0 / viewportHeight;

  // 各辺からの距離でアンチエイリアス
  let insideLeft = smoothstep(params.left - pixelSizeX, params.left + pixelSizeX, uv.x);
  let insideRight = 1.0 - smoothstep(params.right - pixelSizeX, params.right + pixelSizeX, uv.x);
  let insideTop = smoothstep(params.top - pixelSizeY, params.top + pixelSizeY, uv.y);
  let insideBottom = 1.0 - smoothstep(params.bottom - pixelSizeY, params.bottom + pixelSizeY, uv.y);

  let inside = insideLeft * insideRight * insideTop * insideBottom;

  return mix(params.outerColor, params.innerColor, inside);
}
`

/** 半分マスクシェーダー */
export const halfMaskShader = /* wgsl */ `
${fullscreenVertex}

${aaUtils}

struct HalfMaskParams {
  visibleColor: vec4f,
  hiddenColor: vec4f,
  direction: u32,  // 0: top, 1: bottom, 2: left, 3: right
  _padding1: u32,
  viewportWidth: f32,
  viewportHeight: f32,
}

@group(0) @binding(0) var<uniform> params: HalfMaskParams;

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let viewportWidth = params.viewportWidth;
  let viewportHeight = params.viewportHeight;

  let uv = vec2f(pos.x / viewportWidth, pos.y / viewportHeight);

  var visible: f32;
  let pixelSizeX = 1.0 / viewportWidth;
  let pixelSizeY = 1.0 / viewportHeight;

  switch params.direction {
    case 0u: {
      // top: 上半分が見える (y < 0.5)
      visible = 1.0 - smoothstep(0.5 - pixelSizeY, 0.5 + pixelSizeY, uv.y);
    }
    case 1u: {
      // bottom: 下半分が見える (y > 0.5)
      visible = smoothstep(0.5 - pixelSizeY, 0.5 + pixelSizeY, uv.y);
    }
    case 2u: {
      // left: 左半分が見える (x < 0.5)
      visible = 1.0 - smoothstep(0.5 - pixelSizeX, 0.5 + pixelSizeX, uv.x);
    }
    case 3u: {
      // right: 右半分が見える (x > 0.5)
      visible = smoothstep(0.5 - pixelSizeX, 0.5 + pixelSizeX, uv.x);
    }
    default: {
      visible = 1.0;
    }
  }

  return mix(params.hiddenColor, params.visibleColor, visible);
}
`
