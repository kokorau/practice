import { fullscreenVertex } from './common'

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
 * 色収差シェーダー（テクスチャ入力版）
 * RGBチャンネルをそれぞれ異なる方向にずらす
 */
export const createChromaticAberrationShader = (viewport: { width: number; height: number }) => /* wgsl */ `
struct Uniforms {
  intensity: f32,      // 4 bytes
  angle: f32,          // 4 bytes
  _padding: vec2f,     // 8 bytes (alignment to 16)
}

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var inputSampler: sampler;
@group(0) @binding(2) var inputTexture: texture_2d<f32>;

${fullscreenVertex}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let texSize = vec2f(${viewport.width}.0, ${viewport.height}.0);
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

export const CHROMATIC_ABERRATION_BUFFER_SIZE = 16 // 4 + 4 + 8 = 16 bytes

/**
 * 色収差フィルター用のuniformsを生成
 */
export const createChromaticAberrationUniforms = (
  params: ChromaticAberrationParams
): ArrayBuffer => {
  const uniforms = new ArrayBuffer(CHROMATIC_ABERRATION_BUFFER_SIZE)
  const view = new DataView(uniforms)

  view.setFloat32(0, params.intensity, true)
  view.setFloat32(4, params.angle, true)
  view.setFloat32(8, 0, true) // padding
  view.setFloat32(12, 0, true) // padding

  return uniforms
}
