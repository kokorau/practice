import { fullscreenVertex } from './fullscreen'

/**
 * べた塗りテクスチャ用パラメータ
 */
export interface SolidTextureParams {
  /** RGBA色 (0-1) */
  color: [number, number, number, number]
}

/**
 * べた塗りシェーダー
 */
export const solidShader = /* wgsl */ `
@group(0) @binding(0) var<uniform> color: vec4f;

${fullscreenVertex}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  return color;
}
`
