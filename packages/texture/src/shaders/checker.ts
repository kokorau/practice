import { fullscreenVertex } from './common'
import type { TextureRenderSpec } from '../Domain'

/**
 * チェック模様テクスチャ用パラメータ
 */
export interface CheckerTextureParams {
  /** 色1 RGBA (0-1) */
  color1: [number, number, number, number]
  /** 色2 RGBA (0-1) */
  color2: [number, number, number, number]
  /** セルのサイズ (px) */
  cellSize: number
  /** 回転角度 (rad, 0=通常, PI/4=ひし形) */
  angle: number
}

/**
 * チェック模様シェーダー
 */
export const checkerShader = /* wgsl */ `
struct CheckerParams {
  color1: vec4f,
  color2: vec4f,
  cellSize: f32,
  angle: f32,
  _padding1: f32,
  _padding2: f32,
}

@group(0) @binding(0) var<uniform> params: CheckerParams;

${fullscreenVertex}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  // 回転を適用
  let cosA = cos(params.angle);
  let sinA = sin(params.angle);
  let rotatedX = pos.x * cosA - pos.y * sinA;
  let rotatedY = pos.x * sinA + pos.y * cosA;

  // セル座標を計算
  let cellX = floor(rotatedX / params.cellSize);
  let cellY = floor(rotatedY / params.cellSize);

  // チェッカーパターン: (x + y) が偶数か奇数かで色を決定
  let checker = (i32(cellX) + i32(cellY)) % 2;

  if (checker == 0) {
    return params.color1;
  } else {
    return params.color2;
  }
}
`

/**
 * Create render spec for checker texture
 */
export function createCheckerSpec(params: CheckerTextureParams): TextureRenderSpec {
  const data = new Float32Array([
    ...params.color1,
    ...params.color2,
    params.cellSize,
    params.angle,
    0, // padding
    0, // padding
  ])
  return {
    shader: checkerShader,
    uniforms: data.buffer,
    bufferSize: 48,
  }
}
