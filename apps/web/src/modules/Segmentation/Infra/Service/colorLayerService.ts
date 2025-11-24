/**
 * Color-based Layer Extraction Service
 * k-meansで色をクラスタリングし、同じ色のピクセルを1つのレイヤーとしてグルーピング
 */

import type { Srgb } from '../../../Color/Domain/ValueObject/Srgb'

export type ColorLayer = {
  id: number
  /** クラスタの代表色 */
  color: Srgb
  /** ピクセル数 */
  pixelCount: number
  /** 全体に占める割合 */
  ratio: number
}

export type ColorLayerResult = {
  /** 各ピクセルが属するレイヤーID */
  labels: Int32Array
  /** レイヤー情報（面積順にソート済み） */
  layers: ColorLayer[]
  /** 画像サイズ */
  width: number
  height: number
}

/**
 * k-meansで画像を色クラスタリングしてレイヤー化
 */
export const extractColorLayers = (
  imageData: ImageData,
  numLayers: number = 6
): ColorLayerResult => {
  const { data, width, height } = imageData
  const pixelCount = width * height

  // 1. k-meansでクラスタリング
  const centroids = initializeCentroids(data, pixelCount, numLayers)

  // イテレーション
  for (let iter = 0; iter < 15; iter++) {
    updateCentroids(data, pixelCount, centroids)
  }

  // 2. 各ピクセルを最も近いクラスタに割り当て
  const labels = new Int32Array(pixelCount)
  const counts = new Uint32Array(numLayers)

  for (let i = 0; i < pixelCount; i++) {
    const idx = i * 4
    const r = data[idx]!
    const g = data[idx + 1]!
    const b = data[idx + 2]!

    let minDist = Infinity
    let minCluster = 0

    for (let c = 0; c < numLayers; c++) {
      const centroid = centroids[c]!
      const dr = r - centroid.r
      const dg = g - centroid.g
      const db = b - centroid.b
      const dist = dr * dr + dg * dg + db * db

      if (dist < minDist) {
        minDist = dist
        minCluster = c
      }
    }

    labels[i] = minCluster
    counts[minCluster]!++
  }

  // 3. レイヤー情報を構築（面積順にソート）
  const layersUnsorted: ColorLayer[] = centroids.map((c, i) => ({
    id: i,
    color: { r: Math.round(c.r), g: Math.round(c.g), b: Math.round(c.b) },
    pixelCount: counts[i]!,
    ratio: counts[i]! / pixelCount,
  }))

  // 面積でソート（大きい順）
  const sortedLayers = [...layersUnsorted].sort((a, b) => b.pixelCount - a.pixelCount)

  // IDを振り直し
  const idRemap = new Map<number, number>()
  sortedLayers.forEach((layer, newId) => {
    idRemap.set(layer.id, newId)
    layer.id = newId
  })

  // ラベルも更新
  for (let i = 0; i < pixelCount; i++) {
    labels[i] = idRemap.get(labels[i]!)!
  }

  return {
    labels,
    layers: sortedLayers,
    width,
    height,
  }
}

/**
 * k-means++風の初期化（より良い初期セントロイド選択）
 */
const initializeCentroids = (
  data: Uint8ClampedArray,
  pixelCount: number,
  k: number
): Array<{ r: number; g: number; b: number }> => {
  const centroids: Array<{ r: number; g: number; b: number }> = []

  // 最初のセントロイドをランダムに選択
  const firstIdx = Math.floor(Math.random() * pixelCount) * 4
  centroids.push({
    r: data[firstIdx]!,
    g: data[firstIdx + 1]!,
    b: data[firstIdx + 2]!,
  })

  // 残りのセントロイドを距離に基づいて選択
  for (let c = 1; c < k; c++) {
    let maxDist = -1
    let bestPixel = { r: 0, g: 0, b: 0 }

    // サンプリングして最も遠いピクセルを探す
    const sampleStep = Math.max(1, Math.floor(pixelCount / 1000))
    for (let i = 0; i < pixelCount; i += sampleStep) {
      const idx = i * 4
      const r = data[idx]!
      const g = data[idx + 1]!
      const b = data[idx + 2]!

      // 既存のセントロイドからの最小距離
      let minDistToCentroid = Infinity
      for (const centroid of centroids) {
        const dr = r - centroid.r
        const dg = g - centroid.g
        const db = b - centroid.b
        const dist = dr * dr + dg * dg + db * db
        minDistToCentroid = Math.min(minDistToCentroid, dist)
      }

      if (minDistToCentroid > maxDist) {
        maxDist = minDistToCentroid
        bestPixel = { r, g, b }
      }
    }

    centroids.push(bestPixel)
  }

  return centroids
}

/**
 * セントロイドの更新
 */
const updateCentroids = (
  data: Uint8ClampedArray,
  pixelCount: number,
  centroids: Array<{ r: number; g: number; b: number }>
): void => {
  const k = centroids.length
  const sums = centroids.map(() => ({ r: 0, g: 0, b: 0, count: 0 }))

  // サンプリングで高速化
  const sampleStep = Math.max(1, Math.floor(pixelCount / 20000))

  for (let i = 0; i < pixelCount; i += sampleStep) {
    const idx = i * 4
    const r = data[idx]!
    const g = data[idx + 1]!
    const b = data[idx + 2]!

    let minDist = Infinity
    let minCluster = 0

    for (let c = 0; c < k; c++) {
      const centroid = centroids[c]!
      const dr = r - centroid.r
      const dg = g - centroid.g
      const db = b - centroid.b
      const dist = dr * dr + dg * dg + db * db

      if (dist < minDist) {
        minDist = dist
        minCluster = c
      }
    }

    const sum = sums[minCluster]!
    sum.r += r
    sum.g += g
    sum.b += b
    sum.count++
  }

  // セントロイドを更新
  for (let c = 0; c < k; c++) {
    const sum = sums[c]!
    if (sum.count > 0) {
      centroids[c]!.r = sum.r / sum.count
      centroids[c]!.g = sum.g / sum.count
      centroids[c]!.b = sum.b / sum.count
    }
  }
}
