import { fullscreenVertex, aaUtils } from './common'

/**
 * 格子テクスチャ用パラメータ
 */
export interface GridTextureParams {
  /** 横線の太さ (px) */
  lineWidth: number
  /** セルのサイズ (px) */
  cellSize: number
  /** 線の色 RGBA (0-1) */
  lineColor: [number, number, number, number]
  /** 背景色 RGBA (0-1) */
  bgColor: [number, number, number, number]
}

/**
 * 格子シェーダー
 */
export const gridShader = /* wgsl */ `
struct GridParams {
  lineColor: vec4f,
  bgColor: vec4f,
  lineWidth: f32,
  cellSize: f32,
  _padding1: f32,
  _padding2: f32,
}

@group(0) @binding(0) var<uniform> params: GridParams;

${fullscreenVertex}

${aaUtils}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let x = pos.x % params.cellSize;
  let y = pos.y % params.cellSize;

  // 各軸でのエッジ距離
  let halfLine = params.lineWidth * 0.5;

  // セルの端からの距離（両端を考慮）
  let distX = min(x, params.cellSize - x);
  let distY = min(y, params.cellSize - y);

  // アンチエイリアス適用
  let lineX = 1.0 - aaStep(halfLine, distX);
  let lineY = 1.0 - aaStep(halfLine, distY);

  // どちらかの線上にあれば線の色
  let onLine = max(lineX, lineY);
  return mix(params.bgColor, params.lineColor, onLine);
}
`
