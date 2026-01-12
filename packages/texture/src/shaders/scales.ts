import { fullscreenVertex, aaUtils } from './common'
import type { TextureRenderSpec } from '../Domain'

/**
 * 鱗パターン用パラメータ
 */
export interface ScalesTextureParams {
  /** 鱗の直径 (px) */
  size: number
  /** 重なり率 (0-1) */
  overlap: number
  /** 角度 (ラジアン) */
  angle: number
  /** 色1 RGBA (0-1) */
  color1: [number, number, number, number]
  /** 色2 RGBA (0-1) */
  color2: [number, number, number, number]
}

/**
 * 鱗シェーダー
 * 魚の鱗や瓦屋根のような重なり模様
 */
export const scalesShader = /* wgsl */ `
struct ScalesParams {
  color1: vec4f,
  color2: vec4f,
  size: f32,
  overlap: f32,
  angle: f32,
  _padding: f32,
}

@group(0) @binding(0) var<uniform> params: ScalesParams;

${fullscreenVertex}

${aaUtils}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  // 回転を適用
  let cosA = cos(params.angle);
  let sinA = sin(params.angle);
  let rotatedX = pos.x * cosA - pos.y * sinA;
  let rotatedY = pos.x * sinA + pos.y * cosA;

  let size = params.size;
  let radius = size * 0.5;
  let overlapOffset = size * (1.0 - params.overlap);

  // グリッドセル
  let row = floor(rotatedY / overlapOffset);
  let isOddRow = (i32(row) % 2) == 1;

  var px = rotatedX;
  if (isOddRow) {
    px = px - radius;
  }
  let col = floor(px / size);

  // 最も近い鱗を探す
  var minDist = 1000.0;
  var closestRow = 0.0;

  // 周辺のセルをチェック
  for (var dy = -2; dy <= 2; dy++) {
    for (var dx = -1; dx <= 1; dx++) {
      let checkRow = row + f32(dy);
      let checkOdd = (i32(checkRow) % 2) == 1;

      var checkCol = col + f32(dx);

      // 鱗の中心
      var centerX = checkCol * size + radius;
      if (checkOdd) {
        centerX = centerX + radius;
      }
      let centerY = checkRow * overlapOffset;

      let center = vec2f(centerX, centerY);
      let diff = vec2f(rotatedX, rotatedY) - center;
      let dist = length(diff);

      // 半円のみ（下半分）
      if (diff.y >= 0.0 && dist < minDist) {
        minDist = dist;
        closestRow = checkRow;
      }
    }
  }

  // 鱗のエッジ描画
  let edgeDist = abs(minDist - radius);
  let blend = 1.0 - aaStep(1.0, edgeDist);

  // 行の偶奇でベース色を変える
  let rowParity = f32(i32(closestRow) % 2);
  let baseColor = mix(params.color1, params.color2, rowParity);
  let lineColor = mix(params.color2, params.color1, rowParity);

  return mix(baseColor, lineColor, blend);
}
`

/**
 * Create render spec for scales texture
 */
export function createScalesSpec(params: ScalesTextureParams): TextureRenderSpec {
  const data = new Float32Array([
    ...params.color1,
    ...params.color2,
    params.size,
    params.overlap,
    params.angle,
    0, // padding
  ])
  return {
    shader: scalesShader,
    uniforms: data.buffer,
    bufferSize: 48,
  }
}
