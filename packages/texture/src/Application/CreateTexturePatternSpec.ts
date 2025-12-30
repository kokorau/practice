import type { TextureRenderSpec, TexturePatternSpec, TexturePatternParams } from '../Domain'

/**
 * TextureRenderSpecとパラメータからTexturePatternSpecを構築
 * 既存のcreateXxxSpec関数の結果を再利用する
 */
export const createTexturePatternSpec = (
  renderSpec: TextureRenderSpec,
  params: TexturePatternParams
): TexturePatternSpec => ({
  shader: renderSpec.shader,
  bufferSize: renderSpec.bufferSize,
  blend: renderSpec.blend,
  params,
})
