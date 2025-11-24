import { ref, nextTick, type Ref } from 'vue'
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

  const compute = async () => {
    if (!photo.value) {
      colorLayerMap.value = null
      originalImageData.value = null
      return
    }

    isLoading.value = true
    // Allow UI to update before heavy computation
    await nextTick()

    // Use setTimeout to yield to browser rendering
    setTimeout(() => {
      try {
        colorLayerMap.value = extractColorLayersUseCase(photo.value!, numLayers.value)
        originalImageData.value = photo.value!.imageData
      } finally {
        isLoading.value = false
      }
    }, 0)
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
