import { fullscreenVertex } from './common'
import type { Viewport } from '../Domain'

/**
 * ビネットフィルターのパラメータ
 */
export interface VignetteParams {
  /** ビネットの色（通常は黒） */
  color: [number, number, number, number]
  /** ビネット効果の強さ (0.0-1.0) */
  intensity: number
  /** ビネットの半径（0.0-1.0、小さいほど画面中心に近い位置から効果が始まる） */
  radius: number
  /** エッジのソフトさ（0.0-1.0） */
  softness: number
}

/**
 * ビネットシェーダー（入力テクスチャベース、他のエフェクトと同じパターン）
 * 透明領域はスキップしてマスク境界外への漏れを防止
 */
export const vignetteShader = /* wgsl */ `
struct Uniforms {
  color: vec4f,           // 16 bytes
  intensity: f32,         // 4 bytes
  radius: f32,            // 4 bytes
  softness: f32,          // 4 bytes
  _padding1: f32,         // 4 bytes (alignment)
  viewportWidth: f32,     // 4 bytes
  viewportHeight: f32,    // 4 bytes
  _padding2: vec2f,       // 8 bytes (alignment to 16)
}

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var inputSampler: sampler;
@group(0) @binding(2) var inputTexture: texture_2d<f32>;

${fullscreenVertex}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let texSize = vec2f(u.viewportWidth, u.viewportHeight);
  let uv = pos.xy / texSize;

  // 現在ピクセルの色を取得
  let originalColor = textureSample(inputTexture, inputSampler, uv);

  // 透明領域はEffectをスキップ（Mask範囲外を保護）
  if (originalColor.a < 0.01) {
    return originalColor;
  }

  // 正規化座標（-1.0 to 1.0）
  let normUv = uv * 2.0 - 1.0;

  // 画面中心からの距離（アスペクト比補正）
  let aspect = u.viewportWidth / u.viewportHeight;
  let correctedUv = vec2f(normUv.x, normUv.y * aspect);
  let dist = length(correctedUv);

  // ビネット効果の計算（0.0 = 効果なし、1.0 = 最大暗さ）
  let vignetteFactor = smoothstep(u.radius, u.radius + u.softness, dist) * u.intensity;

  // 元の色にビネット色をブレンド
  let resultColor = mix(originalColor.rgb, u.color.rgb, vignetteFactor);

  return vec4f(resultColor, originalColor.a);
}
`

export const VIGNETTE_BUFFER_SIZE = 48 // 16 (vec4f) + 16 (4 floats) + 16 (2 floats + vec2f padding)

/**
 * ビネットフィルター用のuniformsを生成
 */
export const createVignetteUniforms = (
  params: VignetteParams,
  viewport: Viewport
): ArrayBuffer => {
  const uniforms = new ArrayBuffer(VIGNETTE_BUFFER_SIZE)
  const view = new DataView(uniforms)

  // color (vec4f)
  view.setFloat32(0, params.color[0], true)
  view.setFloat32(4, params.color[1], true)
  view.setFloat32(8, params.color[2], true)
  view.setFloat32(12, params.color[3], true)

  // intensity, radius, softness, _padding1
  view.setFloat32(16, params.intensity, true)
  view.setFloat32(20, params.radius, true)
  view.setFloat32(24, params.softness, true)
  view.setFloat32(28, 0, true) // padding

  // viewportWidth, viewportHeight, _padding2
  view.setFloat32(32, viewport.width, true)
  view.setFloat32(36, viewport.height, true)
  view.setFloat32(40, 0, true) // padding
  view.setFloat32(44, 0, true) // padding

  return uniforms
}
