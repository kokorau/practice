import { fullscreenVertex } from './common'
import type { Viewport } from '../Domain'

/**
 * ブロックモザイク（ピクセレーション）フィルターのパラメータ
 */
export interface BlockMosaicParams {
  /** モザイクブロックのサイズ（ピクセル単位） */
  blockSize: number
}

/**
 * ブロックモザイクシェーダー
 * 入力テクスチャをブロック単位でサンプリングしてピクセレーション効果を適用
 */
export const blockMosaicShader = /* wgsl */ `
struct Uniforms {
  blockSize: f32,          // 4 bytes
  viewportWidth: f32,      // 4 bytes
  viewportHeight: f32,     // 4 bytes
  _padding: f32,           // 4 bytes (alignment)
}

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var inputSampler: sampler;
@group(0) @binding(2) var inputTexture: texture_2d<f32>;

${fullscreenVertex}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let texSize = vec2f(u.viewportWidth, u.viewportHeight);
  let uv = pos.xy / texSize;

  // 現在ピクセルの色を取得（アルファチェック用）
  let originalColor = textureSample(inputTexture, inputSampler, uv);

  // 透明領域はEffectをスキップ（Mask範囲外を保護）
  if (originalColor.a < 0.01) {
    return originalColor;
  }

  // ブロックサイズ（最小2ピクセル）
  let blockSize = max(u.blockSize, 2.0);

  // ピクセル座標をブロック単位に量子化
  let blockPos = floor(pos.xy / blockSize) * blockSize;

  // ブロックの中心座標を計算
  let blockCenter = blockPos + blockSize * 0.5;

  // ブロック中心のUV座標でサンプリング
  let blockUv = blockCenter / texSize;
  let blockColor = textureSample(inputTexture, inputSampler, blockUv);

  // 元のアルファを維持
  return vec4f(blockColor.rgb, originalColor.a);
}
`

export const BLOCK_MOSAIC_BUFFER_SIZE = 16 // 4 * 4 = 16 bytes

/**
 * ブロックモザイクフィルター用のuniformsを生成
 */
export const createBlockMosaicUniforms = (
  params: BlockMosaicParams,
  viewport: Viewport
): ArrayBuffer => {
  const uniforms = new ArrayBuffer(BLOCK_MOSAIC_BUFFER_SIZE)
  const view = new DataView(uniforms)

  view.setFloat32(0, params.blockSize, true)
  view.setFloat32(4, viewport.width, true)
  view.setFloat32(8, viewport.height, true)
  view.setFloat32(12, 0, true) // padding

  return uniforms
}
