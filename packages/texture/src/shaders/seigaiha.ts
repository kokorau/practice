import { fullscreenVertex, aaUtils } from './common'
import type { TextureRenderSpec } from '../Domain'

/**
 * 青海波パターン用パラメータ
 */
export interface SeigaihaTextureParams {
  /** 円の半径 (px) */
  radius: number
  /** 同心円リングの数 (2-5) */
  rings: number
  /** 線の太さ (px) */
  lineWidth: number
  /** 線の色 RGBA (0-1) */
  lineColor: [number, number, number, number]
  /** 背景色 RGBA (0-1) */
  bgColor: [number, number, number, number]
}

/**
 * 青海波シェーダー
 * 伝統的な日本の波模様（重なり合う同心半円）
 */
export const seigaihaShader = /* wgsl */ `
struct SeigaihaParams {
  lineColor: vec4f,
  bgColor: vec4f,
  radius: f32,
  rings: f32,
  lineWidth: f32,
  _padding: f32,
}

@group(0) @binding(0) var<uniform> params: SeigaihaParams;

${fullscreenVertex}

${aaUtils}

// 単一の半円グループの距離を計算
fn semicircleDistance(p: vec2f, center: vec2f, radius: f32, rings: i32, lineWidth: f32) -> f32 {
  let d = p - center;

  // 半円の上半分のみ（y >= center.y）
  if (d.y < 0.0) {
    return 1000.0;
  }

  let dist = length(d);
  var minDist = 1000.0;

  // 各リングへの距離
  for (var i = 0; i < rings; i++) {
    let ringRadius = radius * (1.0 - f32(i) / f32(rings));
    if (ringRadius > 0.0) {
      let ringDist = abs(dist - ringRadius);
      minDist = min(minDist, ringDist);
    }
  }

  return minDist;
}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let radius = params.radius;
  let rings = i32(params.rings);
  let lineWidth = params.lineWidth;

  // グリッドサイズ
  let cellW = radius * 2.0;
  let cellH = radius;

  var minDist = 1000.0;

  // 複数の行をチェック
  for (var rowOffset = -2; rowOffset <= 2; rowOffset++) {
    let row = floor(pos.y / cellH) + f32(rowOffset);
    let isOddRow = (i32(row) % 2) == 1;

    for (var colOffset = -1; colOffset <= 1; colOffset++) {
      var px = pos.x;
      if (isOddRow) {
        px = px - radius;
      }

      let col = floor(px / cellW) + f32(colOffset);

      // 半円の中心
      var centerX = col * cellW + radius;
      if (isOddRow) {
        centerX = centerX + radius;
      }
      let centerY = row * cellH;
      let center = vec2f(centerX, centerY);

      minDist = min(minDist, semicircleDistance(pos.xy, center, radius, rings, lineWidth));
    }
  }

  // アンチエイリアス付きで線を描画
  let halfWidth = lineWidth * 0.5;
  let blend = 1.0 - aaStep(halfWidth, minDist);

  return mix(params.bgColor, params.lineColor, blend);
}
`

/**
 * Create render spec for seigaiha texture
 */
export function createSeigaihaSpec(params: SeigaihaTextureParams): TextureRenderSpec {
  const data = new Float32Array([
    ...params.lineColor,
    ...params.bgColor,
    params.radius,
    params.rings,
    params.lineWidth,
    0, // padding
  ])
  return {
    shader: seigaihaShader,
    uniforms: data.buffer,
    bufferSize: 48,
  }
}
