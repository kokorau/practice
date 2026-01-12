import { fullscreenVertex } from './common'
import type { Viewport } from '../Domain'

/**
 * ブラーフィルターのパラメータ
 */
export interface BlurParams {
  /** ブラー半径 (1-30) */
  radius: number
}

/**
 * ブラーシェーダー（入力テクスチャベース）
 * 全画面ガウシアンブラー
 */
export const blurShader = /* wgsl */ `
struct Uniforms {
  radius: f32,           // 0
  viewportWidth: f32,    // 4
  viewportHeight: f32,   // 8
  _padding: f32,         // 12 (total 16 bytes, 16-byte aligned)
}

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var inputSampler: sampler;
@group(0) @binding(2) var inputTexture: texture_2d<f32>;

${fullscreenVertex}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let texSize = vec2f(u.viewportWidth, u.viewportHeight);
  let uv = pos.xy / texSize;
  let pixelSize = 1.0 / texSize;

  // Gaussian-weighted blur with 1-pixel step
  var sum = vec4f(0.0);
  var totalWeight = 0.0;
  let sigma = u.radius / 3.0; // radius covers ~3 sigma

  for (var y: i32 = -4; y <= 4; y = y + 1) {
    for (var x: i32 = -4; x <= 4; x = x + 1) {
      let sampleOffset = vec2f(f32(x), f32(y)) * pixelSize;
      let dist = f32(x * x + y * y);
      let weight = exp(-dist / (2.0 * sigma * sigma));
      sum = sum + textureSample(inputTexture, inputSampler, uv + sampleOffset) * weight;
      totalWeight = totalWeight + weight;
    }
  }

  return sum / totalWeight;
}
`

export const BLUR_BUFFER_SIZE = 16 // 4 floats * 4 bytes = 16 bytes (16-byte aligned)

/**
 * ブラーフィルター用のuniformsを生成
 */
export const createBlurUniforms = (
  params: BlurParams,
  viewport: Viewport
): ArrayBuffer => {
  const uniforms = new ArrayBuffer(BLUR_BUFFER_SIZE)
  const view = new DataView(uniforms)

  view.setFloat32(0, params.radius, true)
  view.setFloat32(4, viewport.width, true)
  view.setFloat32(8, viewport.height, true)
  view.setFloat32(12, 0, true) // padding

  return uniforms
}
