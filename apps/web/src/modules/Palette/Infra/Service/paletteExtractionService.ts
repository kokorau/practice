/**
 * Palette Extraction Service
 * k-means結果から上位4色のパレットを生成
 */

import { $Palette, type Palette } from '../../Domain'
import { computeKmeansGPU, isWebGPUAvailable, type ClusterResult } from './gpu'

const K_CLUSTERS = 7
const TOP_COLORS = 4

/**
 * 上位N色を抽出してPaletteを生成
 */
const buildPaletteFromClusters = (result: ClusterResult): Palette => {
  const totalPixels = result.counts.reduce((a, b) => a + b, 0)

  // 重み付きでソート
  const indexed = result.centroids.map((centroid, i) => ({
    color: { r: centroid.r, g: centroid.g, b: centroid.b },
    weight: (result.counts[i] ?? 0) / totalPixels,
  }))

  // 重みでソート（降順）
  indexed.sort((a, b) => b.weight - a.weight)

  // 上位4色を取得
  const top4 = indexed.slice(0, TOP_COLORS)

  // 4色未満の場合は黒で埋める
  while (top4.length < TOP_COLORS) {
    top4.push({ color: { r: 0, g: 0, b: 0 }, weight: 0 })
  }

  return $Palette.create({
    colors: [top4[0]!, top4[1]!, top4[2]!, top4[3]!],
  })
}

/**
 * CPU fallback k-means (WebGPU非対応環境用)
 */
const computeKmeansCPU = (imageData: ImageData, k: number = K_CLUSTERS): ClusterResult => {
  const { data, width, height } = imageData
  const pixelCount = width * height

  // サンプリング（大きい画像はサンプリングで高速化）
  const sampleRate = Math.max(1, Math.floor(pixelCount / 10000))
  const samples: Array<{ r: number; g: number; b: number }> = []

  for (let i = 0; i < pixelCount; i += sampleRate) {
    const idx = i * 4
    samples.push({
      r: data[idx]!,
      g: data[idx + 1]!,
      b: data[idx + 2]!,
    })
  }

  // 初期セントロイド
  const centroids = samples
    .slice(0, k)
    .map((s) => ({ ...s }))

  // k-means iterations
  for (let iter = 0; iter < 10; iter++) {
    const sums = centroids.map(() => ({ r: 0, g: 0, b: 0, count: 0 }))

    for (const pixel of samples) {
      let minDist = Infinity
      let minIdx = 0

      for (let c = 0; c < k; c++) {
        const centroid = centroids[c]!
        const dr = pixel.r - centroid.r
        const dg = pixel.g - centroid.g
        const db = pixel.b - centroid.b
        const dist = dr * dr + dg * dg + db * db

        if (dist < minDist) {
          minDist = dist
          minIdx = c
        }
      }

      const sum = sums[minIdx]!
      sum.r += pixel.r
      sum.g += pixel.g
      sum.b += pixel.b
      sum.count++
    }

    for (let c = 0; c < k; c++) {
      const sum = sums[c]!
      const centroid = centroids[c]!
      if (sum.count > 0) {
        centroid.r = sum.r / sum.count
        centroid.g = sum.g / sum.count
        centroid.b = sum.b / sum.count
      }
    }
  }

  // Final assignment count (全ピクセルでカウント)
  const counts = new Uint32Array(k)
  for (let i = 0; i < pixelCount; i++) {
    const idx = i * 4
    const pixel = { r: data[idx]!, g: data[idx + 1]!, b: data[idx + 2]! }

    let minDist = Infinity
    let minIdx = 0

    for (let c = 0; c < k; c++) {
      const centroid = centroids[c]!
      const dr = pixel.r - centroid.r
      const dg = pixel.g - centroid.g
      const db = pixel.b - centroid.b
      const dist = dr * dr + dg * dg + db * db

      if (dist < minDist) {
        minDist = dist
        minIdx = c
      }
    }

    counts[minIdx]!++
  }

  return {
    centroids: centroids.map((c) => ({
      r: Math.round(c.r),
      g: Math.round(c.g),
      b: Math.round(c.b),
    })),
    counts,
  }
}

/**
 * 画像からパレットを抽出
 */
export const extractPalette = async (imageData: ImageData): Promise<Palette> => {
  let result: ClusterResult

  if (isWebGPUAvailable()) {
    try {
      result = await computeKmeansGPU(imageData, K_CLUSTERS)
    } catch {
      // GPU失敗時はCPUフォールバック
      result = computeKmeansCPU(imageData, K_CLUSTERS)
    }
  } else {
    result = computeKmeansCPU(imageData, K_CLUSTERS)
  }

  return buildPaletteFromClusters(result)
}
