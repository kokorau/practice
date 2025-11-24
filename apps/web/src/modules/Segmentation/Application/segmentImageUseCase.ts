import type { Photo } from '../../Photo/Domain'
import type { SegmentationMap, LayeredSegmentationMap, LayerGroup } from '../Domain'
import {
  segmentImage,
  segmentationToImageData,
  segmentBoundariesToImageData,
} from '../Infra/Service/segmentationService'
import { edgesToImageData } from '../Infra/Service/edgeDetectionService'
import { mergeSegmentsByColor } from '../Infra/Service/segmentMergingService'

export type SegmentImageResult = {
  /** セグメンテーションマップ */
  map: SegmentationMap
  /** レイヤーとしてグルーピングされたセグメンテーション */
  layeredMap: LayeredSegmentationMap
  /** セグメント可視化用ImageData */
  segmentVisualization: ImageData
  /** エッジ可視化用ImageData */
  edgeVisualization: ImageData
  /** 元画像にエッジを重ねたImageData */
  overlayVisualization: ImageData
}

/**
 * 画像をセグメント化するユースケース
 */
export const segmentImageUseCase = (
  photo: Photo,
  edgeThreshold: number = 30,
  colorMergeThreshold: number = 0.1,
  minSegmentArea: number = 100
): SegmentImageResult => {
  const result = segmentImage(photo.imageData, edgeThreshold)

  const map: SegmentationMap = {
    labels: result.labels,
    segments: result.segments.map((s) => ({
      id: s.id,
      bounds: s.bounds,
      color: s.color,
      area: s.area,
    })),
    width: result.width,
    height: result.height,
  }

  // 色でマージしてレイヤー化
  const merged = mergeSegmentsByColor(result, colorMergeThreshold, minSegmentArea)

  const layers: LayerGroup[] = merged.mergedSegments.map((ms) => ({
    id: ms.id,
    color: ms.color,
    totalArea: ms.totalArea,
    sourceSegmentIds: ms.sourceIds,
  }))

  const layeredMap: LayeredSegmentationMap = {
    base: map,
    layers,
    layerLabels: merged.mergedLabels,
  }

  return {
    map,
    layeredMap,
    segmentVisualization: segmentationToImageData(result),
    edgeVisualization: edgesToImageData(result.edgeMap, result.width, result.height),
    overlayVisualization: segmentBoundariesToImageData(result, photo.imageData),
  }
}
