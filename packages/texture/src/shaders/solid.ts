import { fullscreenVertex } from './common'
import type { TextureRenderSpec } from '../Domain'

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

/**
 * Create render spec for solid texture
 */
export function createSolidSpec(params: SolidTextureParams): TextureRenderSpec {
  const uniforms = new Float32Array(params.color).buffer
  return {
    shader: solidShader,
    uniforms,
    bufferSize: 16,
  }
}
