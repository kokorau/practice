import { fullscreenVertex, aaUtils, moduloUtils } from './common'
import type { TextureRenderSpec } from '../Domain'

/**
 * ウェーブパターン用パラメータ
 */
export interface WaveTextureParams {
  /** 波の振幅 (px) */
  amplitude: number
  /** 波長 (px) */
  wavelength: number
  /** ストライプの太さ (px) */
  thickness: number
  /** 角度 (ラジアン) */
  angle: number
  /** 色1 RGBA (0-1) */
  color1: [number, number, number, number]
  /** 色2 RGBA (0-1) */
  color2: [number, number, number, number]
}

/**
 * ウェーブシェーダー
 * 正弦波ストライプパターン
 */
export const waveShader = /* wgsl */ `
struct WaveParams {
  color1: vec4f,
  color2: vec4f,
  amplitude: f32,
  wavelength: f32,
  thickness: f32,
  angle: f32,
}

@group(0) @binding(0) var<uniform> params: WaveParams;

${fullscreenVertex}

${aaUtils}

${moduloUtils}

const PI: f32 = 3.14159265359;
const TWO_PI: f32 = 6.28318530718;

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  // 回転を適用
  let cosA = cos(params.angle);
  let sinA = sin(params.angle);
  let rotatedX = pos.x * cosA + pos.y * sinA;
  let rotatedY = -pos.x * sinA + pos.y * cosA;

  // 波の周期
  let period = params.thickness * 2.0;

  // 現在位置での波の高さ
  let waveY = sin(rotatedX * TWO_PI / params.wavelength) * params.amplitude;

  // 波からの距離を計算
  let offsetY = rotatedY - waveY;

  // ストライプパターン
  let normalizedT = safeModulo(offsetY, period);

  // アンチエイリアス付きエッジ
  let edge1 = aaStep(params.thickness, normalizedT);
  let edge2 = aaStep(period, normalizedT);
  let blend = edge1 - edge2;

  return mix(params.color1, params.color2, blend);
}
`

/**
 * Create render spec for wave texture
 */
export function createWaveSpec(params: WaveTextureParams): TextureRenderSpec {
  const data = new Float32Array([
    ...params.color1,
    ...params.color2,
    params.amplitude,
    params.wavelength,
    params.thickness,
    params.angle,
  ])
  return {
    shader: waveShader,
    uniforms: data.buffer,
    bufferSize: 48,
  }
}
