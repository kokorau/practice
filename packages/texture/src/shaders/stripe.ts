import { fullscreenVertex, aaUtils, moduloUtils } from './common'
import type { TextureRenderSpec } from '../Domain'

/**
 * ストライプテクスチャ用パラメータ
 */
export interface StripeTextureParams {
  /** ストライプ1の太さ (px) */
  width1: number
  /** ストライプ2の太さ (px) */
  width2: number
  /** 角度 (ラジアン) */
  angle: number
  /** 色1 RGBA (0-1) */
  color1: [number, number, number, number]
  /** 色2 RGBA (0-1) */
  color2: [number, number, number, number]
}

/**
 * ストライプシェーダー
 */
export const stripeShader = /* wgsl */ `
struct StripeParams {
  color1: vec4f,
  color2: vec4f,
  width1: f32,
  width2: f32,
  angle: f32,
  _padding: f32,
}

@group(0) @binding(0) var<uniform> params: StripeParams;

${fullscreenVertex}

${aaUtils}

${moduloUtils}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let cosA = cos(params.angle);
  let sinA = sin(params.angle);
  let rotatedX = pos.x * cosA + pos.y * sinA;

  let period = params.width1 + params.width2;
  let normalizedT = safeModulo(rotatedX, period);

  // 両方のエッジでアンチエイリアス
  let edge1 = aaStep(params.width1, normalizedT);
  let edge2 = aaStep(period, normalizedT);

  // edge1: color1 -> color2, edge2: color2 -> color1 (wrap)
  let blend = edge1 - edge2;
  return mix(params.color1, params.color2, blend);
}
`

/**
 * Create render spec for stripe texture
 */
export function createStripeSpec(params: StripeTextureParams): TextureRenderSpec {
  const data = new Float32Array([
    ...params.color1,
    ...params.color2,
    params.width1,
    params.width2,
    params.angle,
    0, // padding
  ])
  return {
    shader: stripeShader,
    uniforms: data.buffer,
    bufferSize: 48,
  }
}
