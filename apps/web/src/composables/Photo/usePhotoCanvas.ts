import { ref, watch, type Ref } from 'vue'
import type { Photo } from '../../modules/Photo/Domain'

export const usePhotoCanvas = (photo: Ref<Photo | null>) => {
  const canvasRef: Ref<HTMLCanvasElement | null> = ref(null)

  const render = () => {
    const canvas = canvasRef.value
    const currentPhoto = photo.value
    if (!canvas || !currentPhoto) return

    canvas.width = currentPhoto.width
    canvas.height = currentPhoto.height

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.putImageData(currentPhoto.imageData, 0, 0)
  }

  // Auto-render when photo changes
  watch(photo, render)

  return {
    canvasRef,
    render,
  }
}
