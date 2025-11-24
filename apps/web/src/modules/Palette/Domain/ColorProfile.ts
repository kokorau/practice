import type { Srgb } from '../../Color/Domain'

/**
 * Color role in the image
 */
export type ColorRole = 'background' | 'text' | 'accent' | 'unknown'

/**
 * Metrics used for role detection (internal)
 */
export type ColorMetrics = {
  edgeRatio: number      // エッジ付近の出現率 (0-1)
  borderRatio: number    // 画像端の出現率 (0-1)
  avgClusterSize: number // 連結領域の平均サイズ (pixels)
  clusterCount: number   // 連結領域数
}

/**
 * Color with role analysis
 */
export type ColorProfile = {
  color: Srgb
  weight: number         // 面積比 (0-1)
  role: ColorRole
  confidence: number     // 判定の確信度 (0-1)
  metrics: ColorMetrics
}

export type CreateColorProfileInput = {
  color: Srgb
  weight: number
  metrics: ColorMetrics
}

/**
 * Role detection thresholds
 */
const THRESHOLDS = {
  background: {
    minBorderRatio: 0.3,
    minAvgClusterSize: 1000,
  },
  text: {
    minEdgeRatio: 0.4,
    minClusterCount: 10,
    maxAvgClusterSize: 500,
  },
  accent: {
    maxWeight: 0.15,
  },
}

const detectRole = (
  weight: number,
  metrics: ColorMetrics
): { role: ColorRole; confidence: number } => {
  const scores = {
    background: 0,
    text: 0,
    accent: 0,
  }

  // Background scoring
  if (metrics.borderRatio >= THRESHOLDS.background.minBorderRatio) {
    scores.background += 0.4
  }
  if (metrics.avgClusterSize >= THRESHOLDS.background.minAvgClusterSize) {
    scores.background += 0.4
  }
  if (weight > 0.3) {
    scores.background += 0.2
  }

  // Text scoring
  if (metrics.edgeRatio >= THRESHOLDS.text.minEdgeRatio) {
    scores.text += 0.4
  }
  if (metrics.clusterCount >= THRESHOLDS.text.minClusterCount) {
    scores.text += 0.3
  }
  if (metrics.avgClusterSize <= THRESHOLDS.text.maxAvgClusterSize) {
    scores.text += 0.3
  }

  // Accent scoring
  if (weight <= THRESHOLDS.accent.maxWeight) {
    scores.accent += 0.5
  }
  if (metrics.clusterCount < 5) {
    scores.accent += 0.3
  }

  // Find best role
  const maxScore = Math.max(scores.background, scores.text, scores.accent)

  if (maxScore < 0.3) {
    return { role: 'unknown', confidence: 0 }
  }

  if (scores.background === maxScore) {
    return { role: 'background', confidence: scores.background }
  }
  if (scores.text === maxScore) {
    return { role: 'text', confidence: scores.text }
  }
  return { role: 'accent', confidence: scores.accent }
}

export const $ColorProfile = {
  create: (input: CreateColorProfileInput): ColorProfile => {
    const { role, confidence } = detectRole(input.weight, input.metrics)
    return {
      color: input.color,
      weight: input.weight,
      role,
      confidence,
      metrics: input.metrics,
    }
  },
}
