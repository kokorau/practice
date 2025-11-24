import { ref, watch, type Ref, type ComputedRef } from 'vue'
import type { Photo } from '../../modules/Photo/Domain'
import type { Palette } from '../../modules/Palette/Domain'
import { type Lut, $Lut } from '../../modules/Filter/Domain'
import { $Photo } from '../../modules/Photo/Domain'
import { extractPaletteUseCase } from '../../modules/Palette/Application/extractPaletteUseCase'

export type UsePaletteOptions = {
  lut?: Ref<Lut> | ComputedRef<Lut>
}

export const usePalette = (
  photo: Ref<Photo | null>,
  options: UsePaletteOptions = {}
) => {
  const palette = ref<Palette | null>(null)
  const isLoading = ref(false)

  const extract = async () => {
    if (!photo.value) {
      palette.value = null
      return
    }

    isLoading.value = true
    try {
      // LUTがあれば適用
      let targetPhoto = photo.value
      if (options.lut?.value) {
        const filteredImageData = $Lut.apply(photo.value.imageData, options.lut.value)
        targetPhoto = $Photo.create(filteredImageData)
      }

      palette.value = await extractPaletteUseCase(targetPhoto)
    } finally {
      isLoading.value = false
    }
  }

  // photo または lut 変更時に抽出
  if (options.lut) {
    watch([photo, options.lut], extract, { immediate: true })
  } else {
    watch(photo, extract, { immediate: true })
  }

  return {
    palette,
    isLoading,
  }
}
