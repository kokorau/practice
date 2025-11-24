/**
 * Color Metrics Service
 * 各クラスタのメトリクスを計算
 */

import type { ColorMetrics } from '../../Domain'

type ClusterAssignment = Uint32Array

/**
 * 連結成分分析（Union-Find）
 */
const analyzeConnectedComponents = (
  assignments: ClusterAssignment,
  width: number,
  height: number,
  clusterId: number
): { count: number; avgSize: number } => {
  const pixelCount = width * height
  const visited = new Uint8Array(pixelCount)
  const componentSizes: number[] = []

  const bfs = (startIdx: number): number => {
    const queue = [startIdx]
    let size = 0

    while (queue.length > 0) {
      const idx = queue.pop()!
      if (visited[idx]) continue
      if (assignments[idx] !== clusterId) continue

      visited[idx] = 1
      size++

      const x = idx % width
      const y = Math.floor(idx / width)

      // 4-connectivity
      if (x > 0 && !visited[idx - 1]) queue.push(idx - 1)
      if (x < width - 1 && !visited[idx + 1]) queue.push(idx + 1)
      if (y > 0 && !visited[idx - width]) queue.push(idx - width)
      if (y < height - 1 && !visited[idx + width]) queue.push(idx + width)
    }

    return size
  }

  for (let i = 0; i < pixelCount; i++) {
    if (!visited[i] && assignments[i] === clusterId) {
      const size = bfs(i)
      if (size > 0) {
        componentSizes.push(size)
      }
    }
  }

  const count = componentSizes.length
  const avgSize = count > 0
    ? componentSizes.reduce((a, b) => a + b, 0) / count
    : 0

  return { count, avgSize }
}

/**
 * 画像端の出現率を計算
 */
const computeBorderRatio = (
  assignments: ClusterAssignment,
  width: number,
  height: number,
  clusterId: number,
  totalClusterPixels: number
): number => {
  if (totalClusterPixels === 0) return 0

  const borderMargin = Math.min(10, Math.floor(Math.min(width, height) * 0.05))
  let borderCount = 0

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      if (assignments[idx] !== clusterId) continue

      const isNearBorder =
        x < borderMargin ||
        x >= width - borderMargin ||
        y < borderMargin ||
        y >= height - borderMargin

      if (isNearBorder) {
        borderCount++
      }
    }
  }

  return borderCount / totalClusterPixels
}

/**
 * エッジ付近の出現率を計算（簡易Sobel）
 */
const computeEdgeRatio = (
  imageData: ImageData,
  assignments: ClusterAssignment,
  clusterId: number,
  totalClusterPixels: number
): number => {
  if (totalClusterPixels === 0) return 0

  const { data, width, height } = imageData
  let edgeCount = 0

  // 簡易エッジ検出: 隣接ピクセルとの輝度差
  const threshold = 30

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x
      if (assignments[idx] !== clusterId) continue

      const i = idx * 4
      const lum = data[i]! * 0.299 + data[i + 1]! * 0.587 + data[i + 2]! * 0.114

      // Check neighbors
      const neighbors = [
        (idx - 1) * 4,
        (idx + 1) * 4,
        (idx - width) * 4,
        (idx + width) * 4,
      ]

      let isEdge = false
      for (const ni of neighbors) {
        const nLum = data[ni]! * 0.299 + data[ni + 1]! * 0.587 + data[ni + 2]! * 0.114
        if (Math.abs(lum - nLum) > threshold) {
          isEdge = true
          break
        }
      }

      if (isEdge) {
        edgeCount++
      }
    }
  }

  return edgeCount / totalClusterPixels
}

export type ComputeMetricsInput = {
  imageData: ImageData
  assignments: ClusterAssignment
  clusterId: number
  totalClusterPixels: number
}

export const computeColorMetrics = (input: ComputeMetricsInput): ColorMetrics => {
  const { imageData, assignments, clusterId, totalClusterPixels } = input
  const { width, height } = imageData

  const { count: clusterCount, avgSize: avgClusterSize } = analyzeConnectedComponents(
    assignments,
    width,
    height,
    clusterId
  )

  const borderRatio = computeBorderRatio(
    assignments,
    width,
    height,
    clusterId,
    totalClusterPixels
  )

  const edgeRatio = computeEdgeRatio(
    imageData,
    assignments,
    clusterId,
    totalClusterPixels
  )

  return {
    edgeRatio,
    borderRatio,
    avgClusterSize,
    clusterCount,
  }
}
