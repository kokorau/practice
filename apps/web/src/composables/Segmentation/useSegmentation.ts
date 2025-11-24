import { ref, watch, type Ref } from 'vue'
import type { Photo } from '../../modules/Photo/Domain'
import type { SegmentationMap, LayeredSegmentationMap } from '../../modules/Segmentation/Domain'
import { segmentImageUseCase } from '../../modules/Segmentation/Application/segmentImageUseCase'

export type VisualizationMode = 'segments' | 'edges' | 'overlay'

export const useSegmentation = (
  photo: Ref<Photo | null>,
  edgeThreshold: Ref<number> = ref(30),
  colorMergeThreshold: Ref<number> = ref(0.1),
  minSegmentArea: Ref<number> = ref(100)
) => {
  const segmentationMap = ref<SegmentationMap | null>(null)
  const layeredMap = ref<LayeredSegmentationMap | null>(null)
  const originalImageData = ref<ImageData | null>(null)
  const segmentVisualization = ref<ImageData | null>(null)
  const edgeVisualization = ref<ImageData | null>(null)
  const overlayVisualization = ref<ImageData | null>(null)
  const isLoading = ref(false)
  const segmentCount = ref(0)
  const layerCount = ref(0)

  const compute = () => {
    if (!photo.value) {
      segmentationMap.value = null
      layeredMap.value = null
      originalImageData.value = null
      segmentVisualization.value = null
      edgeVisualization.value = null
      overlayVisualization.value = null
      segmentCount.value = 0
      layerCount.value = 0
      return
    }

    isLoading.value = true
    try {
      const result = segmentImageUseCase(
        photo.value,
        edgeThreshold.value,
        colorMergeThreshold.value,
        minSegmentArea.value
      )
      segmentationMap.value = result.map
      layeredMap.value = result.layeredMap
      originalImageData.value = photo.value.imageData
      segmentVisualization.value = result.segmentVisualization
      edgeVisualization.value = result.edgeVisualization
      overlayVisualization.value = result.overlayVisualization
      segmentCount.value = result.map.segments.length
      layerCount.value = result.layeredMap.layers.length
    } finally {
      isLoading.value = false
    }
  }

  watch([photo, edgeThreshold, colorMergeThreshold, minSegmentArea], compute, { immediate: true })

  return {
    segmentationMap,
    layeredMap,
    originalImageData,
    segmentVisualization,
    edgeVisualization,
    overlayVisualization,
    segmentCount,
    layerCount,
    isLoading,
  }
}
