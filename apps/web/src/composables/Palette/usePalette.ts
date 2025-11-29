import { ref, watch, type Ref, type ComputedRef } from 'vue'
import type { Photo } from '../../modules/Photo/Domain'
import type { Palette } from '../../modules/Palette/Domain'
import { type Lut, $Lut, $Lut3D, isLut3D } from '../../modules/Filter/Domain'
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
        const lut = options.lut.value
        const filteredImageData = isLut3D(lut)
          ? $Lut3D.apply(photo.value.imageData, lut)
          : $Lut.apply(photo.value.imageData, lut)
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
