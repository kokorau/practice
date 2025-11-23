import { ref, type Ref } from 'vue'
import type { Photo } from '../../modules/Photo/Domain'
import { photoRepository } from '../../modules/Photo/Infra/photoRepository'
import { createLocalPhotoUploader } from '../../modules/PhotoLocal/Infra/localPhotoUploader'
import { uploadLocalPhoto } from '../../modules/PhotoLocal/Application/uploadLocalPhoto'

const deps = {
  uploader: createLocalPhotoUploader(),
  repository: photoRepository,
}

export const usePhotoUpload = () => {
  const photo: Ref<Photo | null> = ref(photoRepository.get())

  const handleFileChange = async (event: Event) => {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

    await uploadLocalPhoto(file, deps)
    photo.value = photoRepository.get()
  }

  return {
    photo,
    handleFileChange,
  }
}
