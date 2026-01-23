import { fullscreenVertex, hash22 } from './common'
import type { Viewport } from '../Domain'

/**
 * ピクセル化モザイクフィルターのパラメータ
 */
export interface PixelateParams {
  /** ブロックサイズ（ピクセル単位、4-64） */
  blockSize: number
  /** ノイズスケール（0-100） */
  noiseScale: number
}

/**
 * ピクセル化モザイクシェーダー
 * 入力テクスチャをブロック単位でサンプリングしてモザイク効果を生成
 */
export const pixelateShader = /* wgsl */ `
struct Uniforms {
  blockSize: f32,          // 0
  noiseScale: f32,         // 4
  viewportWidth: f32,      // 8
  viewportHeight: f32,     // 12 (total 16 bytes, 16-byte aligned)
}

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var inputSampler: sampler;
@group(0) @binding(2) var inputTexture: texture_2d<f32>;

${fullscreenVertex}

${hash22}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let texSize = vec2f(u.viewportWidth, u.viewportHeight);
  let uv = pos.xy / texSize;

  // ブロックサイズに基づいてUVを量子化
  let blockSizeNorm = vec2f(u.blockSize / texSize.x, u.blockSize / texSize.y);

  // ブロックの中心座標を計算
  let blockIndex = floor(uv / blockSizeNorm);
  var blockUV = blockIndex * blockSizeNorm + blockSizeNorm * 0.5;

  // ノイズを適用（noiseScale > 0 の場合）
  if (u.noiseScale > 0.0) {
    let noise = hash22(blockIndex) * 2.0 - 1.0; // -1 to 1
    let noiseOffset = noise * blockSizeNorm * u.noiseScale * 0.01;
    blockUV = blockUV + noiseOffset;
  }

  // ブロック中心の色をサンプリング
  let clampedUV = clamp(blockUV, vec2f(0.0), vec2f(1.0));
  let color = textureSample(inputTexture, inputSampler, clampedUV);

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
  view.setFloat32(4, params.noiseScale ?? 0, true)
  view.setFloat32(8, viewport.width, true)
  view.setFloat32(12, viewport.height, true)

  return uniforms
}
