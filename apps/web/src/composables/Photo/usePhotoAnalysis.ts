import { ref, watch, type Ref, type ComputedRef } from 'vue'
import type { Photo, PhotoAnalysis } from '../../modules/Photo/Domain'
import { type Lut, $Lut } from '../../modules/Filter/Domain'
import { $Photo } from '../../modules/Photo/Domain'
import { photoAnalysisService } from '../../modules/Photo/Infra/Service/photoAnalysisService'

export type UsePhotoAnalysisOptions = {
  lut?: Ref<Lut> | ComputedRef<Lut>
}

export const usePhotoAnalysis = (
  photo: Ref<Photo | null>,
  options: UsePhotoAnalysisOptions = {}
) => {
  const analysis = ref<PhotoAnalysis | null>(null)
  const isAnalyzing = ref(false)

  // 解析実行
  const analyze = async () => {
    if (!photo.value) {
      analysis.value = null
      return
    }

    isAnalyzing.value = true

    try {
      // LUTがあれば適用
      let targetPhoto = photo.value
      if (options.lut?.value) {
        const filteredImageData = $Lut.apply(photo.value.imageData, options.lut.value)
        targetPhoto = $Photo.create(filteredImageData)
      }

      // Worker で非同期解析
      analysis.value = await photoAnalysisService.analyze(targetPhoto)
    } catch (e) {
      console.error('Analysis failed:', e)
    } finally {
      isAnalyzing.value = false
    }
  }

  // photo または lut 変更時に解析
  if (options.lut) {
    watch([photo, options.lut], analyze, { immediate: true })
  } else {
    watch(photo, analyze, { immediate: true })
  }

  return {
    analysis,
    isAnalyzing,
  }
}
