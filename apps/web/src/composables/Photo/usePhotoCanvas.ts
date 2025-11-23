import { ref, watch, type Ref } from 'vue'
import type { Photo } from '../../modules/Photo/Domain'
import { type Lut, $Lut } from '../../modules/Filter/Domain'

export type UsePhotoCanvasOptions = {
  lut?: Ref<Lut | null>
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

    // LUTがあれば適用
    const lut = options.lut?.value
    if (lut) {
      const filteredImageData = $Lut.apply(currentPhoto.imageData, lut)
      ctx.putImageData(filteredImageData, 0, 0)
    } else {
      ctx.putImageData(currentPhoto.imageData, 0, 0)
    }
  }

  // Auto-render when photo or lut changes
  watch(photo, render)
  if (options.lut) {
    watch(options.lut, render, { deep: true })
  }

  return {
    canvasRef,
    render,
  }
}
