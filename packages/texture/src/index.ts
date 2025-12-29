// WebGPU 2D Shaders
// テクスチャ生成用のシェーダーをエクスポート

/**
 * 全テクスチャ共通のパラメータ
 */
export interface TextureCommonParams {
  /** 再現性のためのシード値 */
  seed: number
  /** スケール（密度） */
  scale: number
}
