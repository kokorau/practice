/**
 * Profiled Palette Extraction Service
 * k-means + メトリクス計算でProfiledPaletteを生成
 */

import { $ColorProfile, $ProfiledPalette, type ProfiledPalette } from '../../Domain'
import { computeColorMetrics } from './colorMetricsService'

const K_CLUSTERS = 7
const TOP_COLORS = 4

type ClusterResult = {
  centroids: Array<{ r: number; g: number; b: number }>
  counts: Uint32Array
  assignments: Uint32Array
}

/**
 * CPU k-means with assignments tracking
 */
const computeKmeansCPU = (imageData: ImageData, k: number = K_CLUSTERS): ClusterResult => {
  const { data, width, height } = imageData
  const pixelCount = width * height

  // サンプリング for centroid initialization
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

  // Initialize centroids
  const centroids = samples.slice(0, k).map((s) => ({ ...s }))

  // K-means iterations
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

  // Final assignment for all pixels
  const assignments = new Uint32Array(pixelCount)
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

    assignments[i] = minIdx
    counts[minIdx]!++
  }

  return {
    centroids: centroids.map((c) => ({
      r: Math.round(c.r),
      g: Math.round(c.g),
      b: Math.round(c.b),
    })),
    counts,
    assignments,
  }
}

/**
 * 画像からProfiledPaletteを抽出
 */
export const extractProfiledPalette = async (imageData: ImageData): Promise<ProfiledPalette> => {
  const result = computeKmeansCPU(imageData, K_CLUSTERS)
  const totalPixels = imageData.width * imageData.height

  // Create ColorProfiles with metrics
  const profiles = result.centroids.map((centroid, i) => {
    const count = result.counts[i] ?? 0
    const weight = count / totalPixels
    const metrics = computeColorMetrics({
      imageData,
      assignments: result.assignments,
      clusterId: i,
      totalClusterPixels: count,
    })

    return $ColorProfile.create({
      color: { r: centroid.r, g: centroid.g, b: centroid.b },
      weight,
      metrics,
    })
  })

  // Sort by weight and take top colors
  profiles.sort((a, b) => b.weight - a.weight)
  const topProfiles = profiles.slice(0, TOP_COLORS)

  return $ProfiledPalette.create({ colors: topProfiles })
}
