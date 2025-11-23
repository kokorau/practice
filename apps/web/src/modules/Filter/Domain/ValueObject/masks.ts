/**
 * マスク関数 - トーン調整の範囲を決定
 */

/**
 * Smoothstep関数
 * edge0からedge1の間で滑らかに0から1へ遷移
 */
export const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

/**
 * ハイライトマスク
 * 明るい部分ほど影響を受ける (0.5付近から1.0で最大)
 */
export const highlightMask = (x: number): number => {
  return smoothstep(0.25, 0.75, x)
}

/**
 * シャドウマスク
 * 暗い部分ほど影響を受ける (0.0で最大、0.5付近から減少)
 */
export const shadowMask = (x: number): number => {
  return 1 - smoothstep(0.25, 0.75, x)
}

/**
 * 白レベルマスク
 * 最も明るい部分のみ影響 (0.75-1.0で遷移、Highlightsより狭い)
 */
export const whiteMask = (x: number): number => {
  return smoothstep(0.75, 1.0, x)
}

/**
 * 黒レベルマスク
 * 最も暗い部分のみ影響 (0.0-0.25で遷移、Shadowsより狭い)
 */
export const blackMask = (x: number): number => {
  return 1 - smoothstep(0.0, 0.25, x)
}

/**
 * 明瞭度マスク (中間調のみ影響)
 * ベルカーブ: 0.5で最大、端点で0
 */
export const clarityMask = (x: number): number => {
  // 4 * x * (1 - x) は 0.5 で 1.0、端点で 0
  return 4 * x * (1 - x)
}
