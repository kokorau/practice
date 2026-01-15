/**
 * Media Palette Web Worker
 * k-means パレット抽出を Worker で処理
 */

import type { Lut } from '../../../Filter/Domain/ValueObject/Lut'
import {
  applyLutInPlace,
  applyEffectsInPlace,
  downsampleImageData,
  ensureImageData,
  rgbToHslTuple,
} from '../../../Filter/Domain/ValueObject/lutWorkerUtils'

// Domain と互換の型定義（Worker 内で使用）
type RGB = { r: number; g: number; b: number }
type ColorMetrics = {
  edgeRatio: number
  borderRatio: number
  avgClusterSize: number
  clusterCount: number
}
type ColorRole = 'background' | 'text' | 'accent' | 'unknown'
type ColorProfile = {
  color: RGB
  weight: number
  metrics: ColorMetrics
  role: ColorRole
  confidence: number
}
type ProfiledPalette = {
  colors: readonly ColorProfile[]
  background: ColorProfile | null
  text: ColorProfile | null
  accent: ColorProfile | null
}

export type PaletteRequest = {
  id: number
  type: 'extract'
  imageData: ImageData
  lut?: Lut
  vibrance?: number
  hueRotation?: number
  downsampleScale?: number
}

export type PaletteResponse = {
  id: number
  palette: ProfiledPalette
}

const K_CLUSTERS = 7
const TOP_COLORS = 4

// === K-means ===
const computeKmeans = (imageData: ImageData, k: number = K_CLUSTERS) => {
  const { data, width, height } = imageData
  const pixelCount = width * height
  const sampleRate = Math.max(1, Math.floor(pixelCount / 5000)) // より多くサンプリング
  const samples: RGB[] = []

  for (let i = 0; i < pixelCount; i += sampleRate) {
    const idx = i * 4
    samples.push({ r: data[idx]!, g: data[idx + 1]!, b: data[idx + 2]! })
  }

  const centroids = samples.slice(0, k).map(s => ({ ...s }))

  // K-means iterations (少なめ)
  for (let iter = 0; iter < 5; iter++) {
    const sums = centroids.map(() => ({ r: 0, g: 0, b: 0, count: 0 }))
    for (const pixel of samples) {
      let minDist = Infinity, minIdx = 0
      for (let c = 0; c < k; c++) {
        const cent = centroids[c]!
        const dist = (pixel.r - cent.r) ** 2 + (pixel.g - cent.g) ** 2 + (pixel.b - cent.b) ** 2
        if (dist < minDist) { minDist = dist; minIdx = c }
      }
      const sum = sums[minIdx]!
      sum.r += pixel.r; sum.g += pixel.g; sum.b += pixel.b; sum.count++
    }
    for (let c = 0; c < k; c++) {
      const sum = sums[c]!, cent = centroids[c]!
      if (sum.count > 0) {
        cent.r = sum.r / sum.count
        cent.g = sum.g / sum.count
        cent.b = sum.b / sum.count
      }
    }
  }

  // Final counts
  const counts = new Uint32Array(k)
  for (let i = 0; i < pixelCount; i += sampleRate) {
    const idx = i * 4
    const pixel = { r: data[idx]!, g: data[idx + 1]!, b: data[idx + 2]! }
    let minDist = Infinity, minIdx = 0
    for (let c = 0; c < k; c++) {
      const cent = centroids[c]!
      const dist = (pixel.r - cent.r) ** 2 + (pixel.g - cent.g) ** 2 + (pixel.b - cent.b) ** 2
      if (dist < minDist) { minDist = dist; minIdx = c }
    }
    counts[minIdx]!++
  }

  return {
    centroids: centroids.map(c => ({ r: Math.round(c.r), g: Math.round(c.g), b: Math.round(c.b) })),
    counts,
    totalSamples: samples.length,
  }
}

// === メトリクス計算 (簡略版) ===
const computeSimpleMetrics = (): ColorMetrics => {
  // Worker 内では詳細なメトリクス計算を省略
  return {
    edgeRatio: 0,
    borderRatio: 0,
    avgClusterSize: 0,
    clusterCount: 0,
  }
}

// === Role 推定 (簡略版) ===
const inferRole = (color: RGB, weight: number): { role: ColorRole; confidence: number } => {
  const [, s, l] = rgbToHslTuple(color.r, color.g, color.b)

  // 明るい低彩度 + 高面積 → 背景候補
  if (l > 0.7 && s < 0.3 && weight > 0.2) {
    return { role: 'background', confidence: 0.7 }
  }

  // 暗い低彩度 → テキスト候補
  if (l < 0.3 && s < 0.3) {
    return { role: 'text', confidence: 0.6 }
  }

  // 高彩度 + 低面積 → アクセント候補
  if (s > 0.5 && weight < 0.15) {
    return { role: 'accent', confidence: 0.6 }
  }

  return { role: 'unknown', confidence: 0 }
}

self.onmessage = (e: MessageEvent<PaletteRequest>) => {
  const { id, type, imageData: rawImageData, lut, vibrance, hueRotation, downsampleScale } = e.data
  if (type !== 'extract') return

  // postMessage で受け取った ImageData はプレーンオブジェクトになる場合があるため変換
  const imageData = ensureImageData(rawImageData)

  let processedData = imageData

  // 1. ダウンサンプリング
  if (downsampleScale && downsampleScale < 1) {
    processedData = downsampleImageData(processedData, downsampleScale)
  }

  // 2. LUT 適用
  if (lut) applyLutInPlace(processedData, lut)

  // 3. エフェクト適用
  if ((vibrance && Math.abs(vibrance) > 0.01) || (hueRotation && Math.abs(hueRotation) > 0.01)) {
    applyEffectsInPlace(processedData, vibrance ?? 0, hueRotation ?? 0)
  }

  // 4. k-means
  const result = computeKmeans(processedData, K_CLUSTERS)

  // 5. プロファイル作成
  // centroid は 0-255 だが、Srgb は 0-1 なので変換
  const profiles: ColorProfile[] = result.centroids.map((color, i) => {
    const weight = (result.counts[i] ?? 0) / result.totalSamples
    const metrics = computeSimpleMetrics()
    // inferRole は元の 0-255 値で計算（HSL 変換時に /255 している）
    const { role, confidence } = inferRole(color, weight)
    return {
      // 0-1 に正規化
      color: { r: color.r / 255, g: color.g / 255, b: color.b / 255 },
      weight,
      metrics,
      role,
      confidence,
    }
  })

  profiles.sort((a, b) => b.weight - a.weight)
  const topProfiles = profiles.slice(0, TOP_COLORS)

  // Role別に取得
  const background = topProfiles.find(p => p.role === 'background') ?? null
  const text = topProfiles.find(p => p.role === 'text') ?? null
  const accent = topProfiles.find(p => p.role === 'accent') ?? null

  const palette: ProfiledPalette = {
    colors: topProfiles,
    background,
    text,
    accent,
  }

  const response: PaletteResponse = { id, palette }
  self.postMessage(response)
}
