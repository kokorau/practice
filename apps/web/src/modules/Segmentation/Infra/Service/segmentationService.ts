/**
 * Segmentation Service
 * エッジで区切られた領域を連結成分として抽出
 */

import { detectEdges, thresholdEdges } from './edgeDetectionService'

export type Segment = {
  id: number
  pixels: number[] // pixel indices
  bounds: { x: number; y: number; width: number; height: number }
  color: { r: number; g: number; b: number } // 代表色
  area: number
}

export type SegmentationResult = {
  /** 各ピクセルが属するセグメントID (-1 = エッジ) */
  labels: Int32Array
  /** セグメント情報 */
  segments: Segment[]
  /** エッジマップ (可視化用) */
  edgeMap: Uint8Array
  /** 画像サイズ */
  width: number
  height: number
}

/**
 * 画像をセグメント化
 */
export const segmentImage = (
  imageData: ImageData,
  edgeThreshold: number = 30
): SegmentationResult => {
  const { data, width, height } = imageData
  const pixelCount = width * height

  // 1. エッジ検出
  const edges = detectEdges(imageData)
  const binaryEdges = thresholdEdges(edges, edgeThreshold)

  // 2. 連結成分ラベリング (4連結)
  const labels = new Int32Array(pixelCount).fill(-1)
  let nextLabel = 0

  const floodFill = (startIdx: number, label: number): number[] => {
    const pixels: number[] = []
    const queue = [startIdx]

    while (queue.length > 0) {
      const idx = queue.pop()!
      if (labels[idx] !== -1) continue
      if (binaryEdges[idx]! > 0) continue // エッジはスキップ

      labels[idx] = label
      pixels.push(idx)

      const x = idx % width
      const y = Math.floor(idx / width)

      // 4-connectivity
      if (x > 0 && labels[idx - 1] === -1 && binaryEdges[idx - 1]! === 0) {
        queue.push(idx - 1)
      }
      if (x < width - 1 && labels[idx + 1] === -1 && binaryEdges[idx + 1]! === 0) {
        queue.push(idx + 1)
      }
      if (y > 0 && labels[idx - width] === -1 && binaryEdges[idx - width]! === 0) {
        queue.push(idx - width)
      }
      if (y < height - 1 && labels[idx + width] === -1 && binaryEdges[idx + width]! === 0) {
        queue.push(idx + width)
      }
    }

    return pixels
  }

  const segments: Segment[] = []

  for (let i = 0; i < pixelCount; i++) {
    if (labels[i] === -1 && binaryEdges[i]! === 0) {
      const pixels = floodFill(i, nextLabel)

      if (pixels.length > 0) {
        // Compute bounds and average color
        let minX = width, minY = height, maxX = 0, maxY = 0
        let sumR = 0, sumG = 0, sumB = 0

        for (const idx of pixels) {
          const x = idx % width
          const y = Math.floor(idx / width)
          minX = Math.min(minX, x)
          minY = Math.min(minY, y)
          maxX = Math.max(maxX, x)
          maxY = Math.max(maxY, y)

          const di = idx * 4
          sumR += data[di]!
          sumG += data[di + 1]!
          sumB += data[di + 2]!
        }

        segments.push({
          id: nextLabel,
          pixels,
          bounds: {
            x: minX,
            y: minY,
            width: maxX - minX + 1,
            height: maxY - minY + 1,
          },
          color: {
            r: Math.round(sumR / pixels.length),
            g: Math.round(sumG / pixels.length),
            b: Math.round(sumB / pixels.length),
          },
          area: pixels.length,
        })

        nextLabel++
      }
    }
  }

  // 3. エッジピクセルを隣接セグメントに割り当て（境界線を消す）
  assignEdgePixelsToSegments(labels, binaryEdges, data, segments, width, height)

  return {
    labels,
    segments,
    edgeMap: binaryEdges,
    width,
    height,
  }
}

/**
 * エッジピクセルを最も近い色のセグメントに割り当てる
 * これにより境界線がレイヤーに含まれるようになる
 */
const assignEdgePixelsToSegments = (
  labels: Int32Array,
  edgeMap: Uint8Array,
  imageData: Uint8ClampedArray,
  segments: Segment[],
  width: number,
  height: number
): void => {
  const pixelCount = width * height

  // セグメントIDから色へのマップ
  const segmentColors = new Map<number, { r: number; g: number; b: number }>()
  for (const seg of segments) {
    segmentColors.set(seg.id, seg.color)
  }

  // エッジピクセルを処理
  for (let i = 0; i < pixelCount; i++) {
    if (edgeMap[i]! === 0) continue // エッジでなければスキップ

    const x = i % width
    const y = Math.floor(i / width)

    // このピクセルの色
    const di = i * 4
    const pr = imageData[di]!
    const pg = imageData[di + 1]!
    const pb = imageData[di + 2]!

    // 隣接するセグメントを探す（8連結）
    let bestLabel = -1
    let bestDist = Infinity

    const neighbors = [
      [-1, -1], [0, -1], [1, -1],
      [-1,  0],         [1,  0],
      [-1,  1], [0,  1], [1,  1],
    ]

    for (const neighbor of neighbors) {
      const nx = x + neighbor[0]!
      const ny = y + neighbor[1]!
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue

      const ni = ny * width + nx
      const neighborLabel = labels[ni]!
      if (neighborLabel < 0) continue // 隣もエッジならスキップ

      const color = segmentColors.get(neighborLabel)
      if (!color) continue

      // 色距離を計算（シンプルなRGB距離）
      const dr = pr - color.r
      const dg = pg - color.g
      const db = pb - color.b
      const dist = dr * dr + dg * dg + db * db

      if (dist < bestDist) {
        bestDist = dist
        bestLabel = neighborLabel
      }
    }

    // 最も近い色のセグメントに割り当て
    if (bestLabel >= 0) {
      labels[i] = bestLabel
      // セグメントのピクセルリストにも追加
      const seg = segments.find(s => s.id === bestLabel)
      if (seg) {
        seg.pixels.push(i)
        seg.area++
      }
    }
  }
}

/**
 * セグメントマップを可視化用ImageDataに変換
 * 各セグメントを代表色で塗りつぶし、エッジは黒で表示
 */
export const segmentationToImageData = (result: SegmentationResult): ImageData => {
  const { labels, segments, edgeMap, width, height } = result
  const output = new ImageData(width, height)
  const { data } = output

  // Build segment color lookup
  const colorMap = new Map<number, { r: number; g: number; b: number }>()
  for (const seg of segments) {
    colorMap.set(seg.id, seg.color)
  }

  for (let i = 0; i < labels.length; i++) {
    const idx = i * 4
    const label = labels[i]!

    if (edgeMap[i]! > 0) {
      // エッジは黒
      data[idx] = 0
      data[idx + 1] = 0
      data[idx + 2] = 0
    } else if (label >= 0) {
      const color = colorMap.get(label)
      if (color) {
        data[idx] = color.r
        data[idx + 1] = color.g
        data[idx + 2] = color.b
      }
    }
    data[idx + 3] = 255
  }

  return output
}

/**
 * セグメントの境界線のみを描画（デバッグ用）
 */
export const segmentBoundariesToImageData = (
  result: SegmentationResult,
  originalImageData: ImageData
): ImageData => {
  const { edgeMap, width, height } = result
  const { data: srcData } = originalImageData
  const output = new ImageData(width, height)
  const { data } = output

  // Copy original
  for (let i = 0; i < srcData.length; i++) {
    data[i] = srcData[i]!
  }

  // Draw edges in red
  for (let i = 0; i < edgeMap.length; i++) {
    if (edgeMap[i]! > 0) {
      const idx = i * 4
      data[idx] = 255     // R
      data[idx + 1] = 0   // G
      data[idx + 2] = 0   // B
    }
  }

  return output
}
