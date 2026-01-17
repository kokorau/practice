import { fullscreenVertex } from './common'
import type { Viewport } from '../Domain'

/**
 * ピクセレーション（ブロックモザイク）フィルターのパラメータ
 */
export interface PixelationParams {
  /** ブロックサイズ（ピクセル単位） */
  blockSize: number
}

/**
 * ピクセレーションシェーダー
 * 画像をブロック状にモザイク化する
 */
export const pixelationShader = /* wgsl */ `
struct Uniforms {
  blockSize: f32,        // 4 bytes
  viewportWidth: f32,    // 4 bytes
  viewportHeight: f32,   // 4 bytes
  _padding: f32,         // 4 bytes
}

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var inputSampler: sampler;
@group(0) @binding(2) var inputTexture: texture_2d<f32>;

${fullscreenVertex}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let texSize = vec2f(u.viewportWidth, u.viewportHeight);
  let uv = pos.xy / texSize;

  // 現在ピクセルの色を取得（透明度チェック用）
  let originalColor = textureSample(inputTexture, inputSampler, uv);

  // 透明領域はEffectをスキップ（Mask範囲外を保護）
  if (originalColor.a < 0.01) {
    return originalColor;
  }

  // ブロックサイズをテクスチャ座標系に変換
  let blockSizeUV = vec2f(u.blockSize) / texSize;

  // 現在のUVがどのブロックに属するかを計算し、そのブロックの中心を求める
  let blockIndex = floor(uv / blockSizeUV);
  let blockCenterUV = (blockIndex + 0.5) * blockSizeUV;

  // ブロック中心の色をサンプリング
  let pixelatedColor = textureSample(inputTexture, inputSampler, blockCenterUV);

  // 元の色のアルファ値を保持
  return vec4f(pixelatedColor.rgb, originalColor.a);
}
`

export const PIXELATION_BUFFER_SIZE = 16 // 4 * 4 = 16 bytes

/**
 * ピクセレーションフィルター用のuniformsを生成
 */
export const createPixelationUniforms = (
  params: PixelationParams,
  viewport: Viewport
): ArrayBuffer => {
  const uniforms = new ArrayBuffer(PIXELATION_BUFFER_SIZE)
  const view = new DataView(uniforms)

  view.setFloat32(0, params.blockSize, true)
  view.setFloat32(4, viewport.width, true)
  view.setFloat32(8, viewport.height, true)
  view.setFloat32(12, 0, true) // padding

  return uniforms
}
