import { fullscreenVertex } from './common'
import type { Viewport } from '../Domain'

/**
 * 色収差フィルターのパラメータ
 */
export interface ChromaticAberrationParams {
  /** 色収差の強さ（ピクセル単位でのずれ量） */
  intensity: number
  /** 収差の方向（ラジアン） */
  angle: number
}

/**
 * 色収差シェーダー（静的、viewportはuniformで渡す）
 * RGBチャンネルをそれぞれ異なる方向にずらす
 */
export const chromaticAberrationShader = /* wgsl */ `
struct Uniforms {
  intensity: f32,        // 4 bytes
  angle: f32,            // 4 bytes
  viewportWidth: f32,    // 4 bytes
  viewportHeight: f32,   // 4 bytes
}

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var inputSampler: sampler;
@group(0) @binding(2) var inputTexture: texture_2d<f32>;

${fullscreenVertex}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let texSize = vec2f(u.viewportWidth, u.viewportHeight);
  let uv = pos.xy / texSize;

  // 画面中心からの方向ベクトル
  let center = vec2f(0.5, 0.5);
  let toCenter = uv - center;
  let dist = length(toCenter);

  // 収差の方向（中心から外側、またはangle指定）
  let dir = normalize(toCenter);
  let offset = dir * u.intensity / texSize * dist * 2.0;

  // RGBチャンネルを別々にサンプリング
  let r = textureSample(inputTexture, inputSampler, uv + offset).r;
  let g = textureSample(inputTexture, inputSampler, uv).g;
  let b = textureSample(inputTexture, inputSampler, uv - offset).b;
  let a = textureSample(inputTexture, inputSampler, uv).a;

  return vec4f(r, g, b, a);
}
`

export const CHROMATIC_ABERRATION_BUFFER_SIZE = 16 // 4 * 4 = 16 bytes

/**
 * 色収差フィルター用のuniformsを生成
 */
export const createChromaticAberrationUniforms = (
  params: ChromaticAberrationParams,
  viewport: Viewport
): ArrayBuffer => {
  const uniforms = new ArrayBuffer(CHROMATIC_ABERRATION_BUFFER_SIZE)
  const view = new DataView(uniforms)

  view.setFloat32(0, params.intensity, true)
  view.setFloat32(4, params.angle, true)
  view.setFloat32(8, viewport.width, true)
  view.setFloat32(12, viewport.height, true)

  return uniforms
}
