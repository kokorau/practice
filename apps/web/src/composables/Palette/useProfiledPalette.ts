import { ref, watch, type Ref, type ComputedRef } from 'vue'
import type { Photo } from '../../modules/Photo/Domain'
import type { ProfiledPalette } from '../../modules/Palette/Domain'
import { type Lut, $Lut, $Lut3D } from '../../modules/Filter/Domain'
import { $Photo } from '../../modules/Photo/Domain'
import { extractProfiledPaletteUseCase } from '../../modules/Palette/Application/extractProfiledPaletteUseCase'

export type UseProfiledPaletteOptions = {
  lut?: Ref<Lut> | ComputedRef<Lut>
}

export const useProfiledPalette = (
  photo: Ref<Photo | null>,
  options: UseProfiledPaletteOptions = {}
) => {
  const palette = ref<ProfiledPalette | null>(null)
  const isLoading = ref(false)

  const extract = async () => {
    if (!photo.value) {
      palette.value = null
      return
    }

    isLoading.value = true
    try {
      let targetPhoto = photo.value
      if (options.lut?.value) {
        const lut = options.lut.value
        const filteredImageData = $Lut3D.is(lut)
          ? $Lut3D.apply(photo.value.imageData, lut)
          : $Lut.apply(photo.value.imageData, lut)
        targetPhoto = $Photo.create(filteredImageData)
      }

      palette.value = await extractProfiledPaletteUseCase(targetPhoto)
    } finally {
      isLoading.value = false
    }
  }

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
