import { ref, type Ref } from 'vue'
import type { Photo } from '../../modules/Photo/Domain'
import type { ColorBasedLayerMap } from '../../modules/Segmentation/Domain'
import { extractColorLayersUseCase } from '../../modules/Segmentation/Application/extractColorLayersUseCase'

export const useColorLayers = (
  photo: Ref<Photo | null>,
  numLayers: Ref<number> = ref(6)
) => {
  const colorLayerMap = ref<ColorBasedLayerMap | null>(null)
  const originalImageData = ref<ImageData | null>(null)
  const isLoading = ref(false)

  const compute = () => {
    if (!photo.value) {
      colorLayerMap.value = null
      originalImageData.value = null
      return
    }

    isLoading.value = true
    try {
      colorLayerMap.value = extractColorLayersUseCase(photo.value, numLayers.value)
      originalImageData.value = photo.value.imageData
    } finally {
      isLoading.value = false
    }
  }

  const clear = () => {
    colorLayerMap.value = null
    originalImageData.value = null
  }

  return {
    colorLayerMap,
    originalImageData,
    isLoading,
    compute,
    clear,
  }
}
