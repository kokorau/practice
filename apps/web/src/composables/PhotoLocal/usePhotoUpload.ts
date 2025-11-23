import { ref, computed, type Ref } from 'vue'
import { type Photo, type PhotoAnalysis, $PhotoAnalysis } from '../../modules/Photo/Domain'
import { photoRepository } from '../../modules/Photo/Infra/photoRepository'
import { createLocalPhotoUploader } from '../../modules/PhotoLocal/Infra/localPhotoUploader'
import { uploadLocalPhoto } from '../../modules/PhotoLocal/Application/uploadLocalPhoto'

const deps = {
  uploader: createLocalPhotoUploader(),
  repository: photoRepository,
}

export const usePhotoUpload = () => {
  const photo: Ref<Photo | null> = ref(photoRepository.get())
  const canvasRef: Ref<HTMLCanvasElement | null> = ref(null)

  const analysis = computed<PhotoAnalysis | null>(() => {
    if (!photo.value) return null
    return $PhotoAnalysis.create(photo.value)
  })

  const handleFileChange = async (event: Event) => {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

    await uploadLocalPhoto(file, deps)
    photo.value = photoRepository.get()
    renderToCanvas()
  }

  const renderToCanvas = () => {
    const canvas = canvasRef.value
    const currentPhoto = photo.value
    if (!canvas || !currentPhoto) return

    canvas.width = currentPhoto.width
    canvas.height = currentPhoto.height

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.putImageData(currentPhoto.imageData, 0, 0)
  }

  return {
    photo,
    analysis,
    canvasRef,
    handleFileChange,
    renderToCanvas,
  }
}
