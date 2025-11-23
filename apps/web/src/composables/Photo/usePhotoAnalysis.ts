import { computed, type Ref, type ComputedRef } from 'vue'
import { type Photo, type PhotoAnalysis, $PhotoAnalysis, $Photo } from '../../modules/Photo/Domain'
import { type Lut, $Lut } from '../../modules/Filter/Domain'

export type UsePhotoAnalysisOptions = {
  lut?: Ref<Lut> | ComputedRef<Lut>
}

export const usePhotoAnalysis = (
  photo: Ref<Photo | null>,
  options: UsePhotoAnalysisOptions = {}
) => {
  const analysis = computed<PhotoAnalysis | null>(() => {
    if (!photo.value) return null

    // LUTがあれば適用したPhotoで解析
    if (options.lut?.value) {
      const filteredImageData = $Lut.apply(photo.value.imageData, options.lut.value)
      const filteredPhoto = $Photo.create(filteredImageData)
      return $PhotoAnalysis.create(filteredPhoto)
    }

    return $PhotoAnalysis.create(photo.value)
  })

  return {
    analysis,
  }
}
