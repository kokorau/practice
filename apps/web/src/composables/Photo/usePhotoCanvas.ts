import { ref, watch, type Ref } from 'vue'
import type { Photo } from '../../modules/Photo/Domain'
import { type Lut, $Lut, $Lut3D } from '../../modules/Filter/Domain'
import type { PixelEffects } from '../Filter/useFilter'

export type UsePhotoCanvasOptions = {
  lut?: Ref<Lut | null>
  pixelEffects?: Ref<PixelEffects | null>
}

export const usePhotoCanvas = (
  photo: Ref<Photo | null>,
  options: UsePhotoCanvasOptions = {}
) => {
  const canvasRef: Ref<HTMLCanvasElement | null> = ref(null)

  const render = () => {
    const canvas = canvasRef.value
    const currentPhoto = photo.value
    if (!canvas || !currentPhoto) return

    canvas.width = currentPhoto.width
    canvas.height = currentPhoto.height

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // LUTとpixelEffectsを適用
    const lut = options.lut?.value
    const effects = options.pixelEffects?.value

    if (lut) {
      let filteredImageData: ImageData
      if ($Lut3D.is(lut)) {
        // 3D LUT
        filteredImageData = $Lut3D.apply(currentPhoto.imageData, lut)
      } else {
        // 1D LUT: pixelEffectsがあれば一緒に適用
        filteredImageData = effects
          ? $Lut.applyWithEffects(currentPhoto.imageData, lut, effects)
          : $Lut.apply(currentPhoto.imageData, lut)
      }
      ctx.putImageData(filteredImageData, 0, 0)
    } else {
      ctx.putImageData(currentPhoto.imageData, 0, 0)
    }
  }

  // Auto-render when photo, lut, or pixelEffects changes
  watch(photo, render)
  if (options.lut) {
    watch(options.lut, render, { deep: true })
  }
  if (options.pixelEffects) {
    watch(options.pixelEffects, render, { deep: true })
  }

  return {
    canvasRef,
    render,
  }
}
