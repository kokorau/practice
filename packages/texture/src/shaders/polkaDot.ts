import { fullscreenVertex, aaUtils } from './common'

/**
 * 水玉テクスチャ用パラメータ
 */
export interface PolkaDotTextureParams {
  /** ドットの色 RGBA (0-1) */
  dotColor: [number, number, number, number]
  /** 背景色 RGBA (0-1) */
  bgColor: [number, number, number, number]
  /** ドットの半径 (px) */
  dotRadius: number
  /** ドット間の間隔 - 中心から中心 (px) */
  spacing: number
  /** 行ごとのオフセット (0-1、0.5で千鳥配置) */
  rowOffset: number
}

/**
 * 水玉シェーダー
 */
export const polkaDotShader = /* wgsl */ `
struct PolkaDotParams {
  dotColor: vec4f,
  bgColor: vec4f,
  dotRadius: f32,
  spacing: f32,
  rowOffset: f32,
  _padding: f32,
}

@group(0) @binding(0) var<uniform> params: PolkaDotParams;

${fullscreenVertex}

${aaUtils}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let spacing = params.spacing;

  // 行番号を計算
  let row = floor(pos.y / spacing);

  // 行に応じたX方向オフセット
  let xOffset = row * spacing * params.rowOffset;

  // セル内の座標を計算
  let cellX = (pos.x + xOffset) % spacing;
  let cellY = pos.y % spacing;

  // セルの中心からの距離
  let center = spacing * 0.5;
  let dx = cellX - center;
  let dy = cellY - center;
  let dist = sqrt(dx * dx + dy * dy);

  // アンチエイリアス適用
  let dotMask = 1.0 - aaStep(params.dotRadius, dist);

  return mix(params.bgColor, params.dotColor, dotMask);
}
`
