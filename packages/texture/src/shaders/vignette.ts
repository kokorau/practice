import { fullscreenVertex, maskBlendState } from './common'
import type { TextureRenderSpec } from '../Domain'

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
 * ビネットシェーダー
 * 画面端を暗くするポストエフェクト（オーバーレイとして描画）
 */
export const vignetteShader = /* wgsl */ `
struct Uniforms {
  color: vec4f,        // 16 bytes
  intensity: f32,      // 4 bytes
  radius: f32,         // 4 bytes
  softness: f32,       // 4 bytes
  _padding: f32,       // 4 bytes (alignment)
}

@group(0) @binding(0) var<uniform> u: Uniforms;

${fullscreenVertex}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  // 正規化座標（-1.0 to 1.0）
  let uv = (pos.xy / vec2f(1280.0, 720.0)) * 2.0 - 1.0;

  // 画面中心からの距離（アスペクト比補正）
  let aspect = 1280.0 / 720.0;
  let correctedUv = vec2f(uv.x * aspect, uv.y);
  let dist = length(correctedUv);

  // ビネット効果の計算
  let vignette = smoothstep(u.radius, u.radius + u.softness, dist);
  let alpha = vignette * u.intensity;

  return vec4f(u.color.rgb, alpha * u.color.a);
}
`

/**
 * ビネットシェーダー（ビューポート対応版）
 */
export const createVignetteShader = (viewport: { width: number; height: number }) => /* wgsl */ `
struct Uniforms {
  color: vec4f,        // 16 bytes
  intensity: f32,      // 4 bytes
  radius: f32,         // 4 bytes
  softness: f32,       // 4 bytes
  _padding: f32,       // 4 bytes (alignment)
}

@group(0) @binding(0) var<uniform> u: Uniforms;

${fullscreenVertex}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  // 正規化座標（0.0 to 1.0）を-1.0 to 1.0に変換
  let uv = (pos.xy / vec2f(${viewport.width}.0, ${viewport.height}.0)) * 2.0 - 1.0;

  // 画面中心からの距離（アスペクト比補正）
  let aspect = ${viewport.width}.0 / ${viewport.height}.0;
  let correctedUv = vec2f(uv.x, uv.y * aspect);
  let dist = length(correctedUv);

  // ビネット効果の計算
  let vignette = smoothstep(u.radius, u.radius + u.softness, dist);
  let alpha = vignette * u.intensity;

  return vec4f(u.color.rgb, alpha * u.color.a);
}
`

const BUFFER_SIZE = 32 // 16 (vec4f) + 4*4 (4 floats) = 32 bytes

/**
 * ビネットフィルター用のTextureRenderSpecを生成
 */
export const createVignetteSpec = (
  params: VignetteParams,
  viewport: { width: number; height: number }
): TextureRenderSpec => {
  const uniforms = new ArrayBuffer(BUFFER_SIZE)
  const view = new DataView(uniforms)

  // color (vec4f)
  view.setFloat32(0, params.color[0], true)
  view.setFloat32(4, params.color[1], true)
  view.setFloat32(8, params.color[2], true)
  view.setFloat32(12, params.color[3], true)

  // intensity, radius, softness, _padding
  view.setFloat32(16, params.intensity, true)
  view.setFloat32(20, params.radius, true)
  view.setFloat32(24, params.softness, true)
  view.setFloat32(28, 0, true) // padding

  return {
    shader: createVignetteShader(viewport),
    uniforms,
    bufferSize: BUFFER_SIZE,
    blend: maskBlendState,
  }
}
