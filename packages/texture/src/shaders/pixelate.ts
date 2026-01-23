import { fullscreenVertex } from './common'
import type { Viewport } from '../Domain'

/**
 * ピクセル化モザイクフィルターのパラメータ
 */
export interface PixelateParams {
  /** ブロックサイズ（ピクセル単位、4-64） */
  blockSize: number
}

/**
 * ピクセル化モザイクシェーダー
 * 入力テクスチャをブロック単位でサンプリングしてモザイク効果を生成
 */
export const pixelateShader = /* wgsl */ `
struct Uniforms {
  blockSize: f32,          // 0
  viewportWidth: f32,      // 4
  viewportHeight: f32,     // 8
  _padding: f32,           // 12 (total 16 bytes, 16-byte aligned)
}

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var inputSampler: sampler;
@group(0) @binding(2) var inputTexture: texture_2d<f32>;

${fullscreenVertex}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let texSize = vec2f(u.viewportWidth, u.viewportHeight);
  let uv = pos.xy / texSize;

  // ブロックサイズに基づいてUVを量子化
  let blockSizeNorm = vec2f(u.blockSize / texSize.x, u.blockSize / texSize.y);

  // ブロックの中心座標を計算
  let blockUV = floor(uv / blockSizeNorm) * blockSizeNorm + blockSizeNorm * 0.5;

  // ブロック中心の色をサンプリング
  let color = textureSample(inputTexture, inputSampler, blockUV);

  return color;
}
`

export const PIXELATE_BUFFER_SIZE = 16 // 4 floats * 4 bytes = 16 bytes (16-byte aligned)

/**
 * ピクセル化モザイクフィルター用のuniformsを生成
 */
export const createPixelateUniforms = (
  params: PixelateParams,
  viewport: Viewport
): ArrayBuffer => {
  const uniforms = new ArrayBuffer(PIXELATE_BUFFER_SIZE)
  const view = new DataView(uniforms)

  view.setFloat32(0, params.blockSize, true)
  view.setFloat32(4, viewport.width, true)
  view.setFloat32(8, viewport.height, true)
  view.setFloat32(12, 0, true) // padding

  return uniforms
}
