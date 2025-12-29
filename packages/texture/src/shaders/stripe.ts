import { fullscreenVertex } from './fullscreen'

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

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let cosA = cos(params.angle);
  let sinA = sin(params.angle);
  let rotatedX = pos.x * cosA + pos.y * sinA;

  let period = params.width1 + params.width2;
  let t = rotatedX % period;
  let normalizedT = select(t, t + period, t < 0.0);

  if (normalizedT < params.width1) {
    return params.color1;
  } else {
    return params.color2;
  }
}
`
