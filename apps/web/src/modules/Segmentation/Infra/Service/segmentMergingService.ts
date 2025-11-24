/**
 * Segment Merging Service
 * 似た色のセグメントをマージしてレイヤー数を削減
 */

import { $Oklab } from '../../../Color/Domain/ValueObject/Oklab'
import type { Srgb } from '../../../Color/Domain/ValueObject/Srgb'
import type { Segment, SegmentationResult } from './segmentationService'

export type MergedSegment = {
  id: number
  /** マージされた元のセグメントID群 */
  sourceIds: number[]
  /** 統合後の代表色 (面積加重平均) */
  color: Srgb
  /** 合計面積 */
  totalArea: number
  /** 含まれるセグメント */
  segments: Segment[]
}

export type MergedSegmentationResult = {
  /** 元のセグメンテーション結果 */
  original: SegmentationResult
  /** マージされたセグメント群 */
  mergedSegments: MergedSegment[]
  /** 各ピクセルが属するマージ後のグループID */
  mergedLabels: Int32Array
}

/**
 * Union-Find (Disjoint Set Union) for efficient merging
 */
class UnionFind {
  private parent: number[]
  private rank: number[]

  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, i) => i)
    this.rank = new Array(size).fill(0)
  }

  find(x: number): number {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]!)
    }
    return this.parent[x]!
  }

  union(x: number, y: number): void {
    const rootX = this.find(x)
    const rootY = this.find(y)
    if (rootX === rootY) return

    if (this.rank[rootX]! < this.rank[rootY]!) {
      this.parent[rootX] = rootY
    } else if (this.rank[rootX]! > this.rank[rootY]!) {
      this.parent[rootY] = rootX
    } else {
      this.parent[rootY] = rootX
      this.rank[rootX]!++
    }
  }
}

/**
 * 色距離に基づいてセグメントをマージ
 * @param result セグメンテーション結果
 * @param colorThreshold 色距離の閾値 (Oklab空間, 0.1程度が自然)
 * @param minArea マージ対象の最小面積 (これより小さいセグメントは近いものにマージ)
 */
export const mergeSegmentsByColor = (
  result: SegmentationResult,
  colorThreshold: number = 0.1,
  minArea: number = 100
): MergedSegmentationResult => {
  const { segments, labels, width, height } = result

  if (segments.length === 0) {
    return {
      original: result,
      mergedSegments: [],
      mergedLabels: new Int32Array(width * height).fill(-1),
    }
  }

  // セグメントIDからインデックスへのマップ
  const idToIndex = new Map<number, number>()
  segments.forEach((seg, idx) => idToIndex.set(seg.id, idx))

  const uf = new UnionFind(segments.length)

  // 1. 小さいセグメントを最も近い色のセグメントにマージ
  const smallSegments = segments.filter(s => s.area < minArea)
  const largeSegments = segments.filter(s => s.area >= minArea)

  for (const small of smallSegments) {
    let minDist = Infinity
    let closestIdx = -1
    const smallIdx = idToIndex.get(small.id)!

    // 大きいセグメントから最も近い色を探す
    for (const large of largeSegments) {
      const dist = $Oklab.distanceSrgb(small.color, large.color)
      if (dist < minDist) {
        minDist = dist
        closestIdx = idToIndex.get(large.id)!
      }
    }

    // 見つかればマージ
    if (closestIdx >= 0) {
      uf.union(smallIdx, closestIdx)
    }
  }

  // 2. 色が近いセグメント同士をマージ
  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      const dist = $Oklab.distanceSrgb(segments[i]!.color, segments[j]!.color)
      if (dist < colorThreshold) {
        uf.union(i, j)
      }
    }
  }

  // 3. グループを構築
  const groups = new Map<number, number[]>()
  for (let i = 0; i < segments.length; i++) {
    const root = uf.find(i)
    if (!groups.has(root)) {
      groups.set(root, [])
    }
    groups.get(root)!.push(i)
  }

  // 4. MergedSegmentを作成
  const mergedSegments: MergedSegment[] = []
  const segmentToMergedId = new Map<number, number>()
  let mergedId = 0

  for (const [, indices] of groups) {
    const groupSegments = indices.map(i => segments[i]!)

    // 面積加重平均で代表色を計算
    let totalArea = 0
    let sumR = 0, sumG = 0, sumB = 0
    const sourceIds: number[] = []

    for (const seg of groupSegments) {
      totalArea += seg.area
      sumR += seg.color.r * seg.area
      sumG += seg.color.g * seg.area
      sumB += seg.color.b * seg.area
      sourceIds.push(seg.id)
      segmentToMergedId.set(seg.id, mergedId)
    }

    mergedSegments.push({
      id: mergedId,
      sourceIds,
      color: {
        r: Math.round(sumR / totalArea),
        g: Math.round(sumG / totalArea),
        b: Math.round(sumB / totalArea),
      },
      totalArea,
      segments: groupSegments,
    })

    mergedId++
  }

  // 5. マージ後のラベルマップを作成
  const mergedLabels = new Int32Array(labels.length)
  for (let i = 0; i < labels.length; i++) {
    const originalLabel = labels[i]!
    if (originalLabel < 0) {
      mergedLabels[i] = -1 // エッジ
    } else {
      mergedLabels[i] = segmentToMergedId.get(originalLabel) ?? -1
    }
  }

  // 面積でソート（大きい順 = 背景が先）
  mergedSegments.sort((a, b) => b.totalArea - a.totalArea)

  // IDを振り直し
  const idRemap = new Map<number, number>()
  mergedSegments.forEach((seg, idx) => {
    idRemap.set(seg.id, idx)
    seg.id = idx
  })

  // ラベルも更新
  for (let i = 0; i < mergedLabels.length; i++) {
    if (mergedLabels[i]! >= 0) {
      mergedLabels[i] = idRemap.get(mergedLabels[i]!) ?? -1
    }
  }

  return {
    original: result,
    mergedSegments,
    mergedLabels,
  }
}
