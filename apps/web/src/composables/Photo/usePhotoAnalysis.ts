import { computed, type Ref } from 'vue'
import { type Photo, type PhotoAnalysis, $PhotoAnalysis } from '../../modules/Photo/Domain'

export const usePhotoAnalysis = (photo: Ref<Photo | null>) => {
  const analysis = computed<PhotoAnalysis | null>(() => {
    if (!photo.value) return null
    return $PhotoAnalysis.create(photo.value)
  })

  return {
    analysis,
  }
}
