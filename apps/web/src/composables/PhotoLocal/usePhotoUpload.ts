import { ref, type Ref } from 'vue'
import type { Photo } from '../../modules/Photo/Domain'
import { photoRepository } from '../../modules/Photo/Infra/photoRepository'
import { loadLocalPhoto } from '../../modules/PhotoLocal/Application/loadLocalPhoto'

export const usePhotoUpload = () => {
  const photo: Ref<Photo | null> = ref(photoRepository.get())

  const handleFileChange = async (event: Event) => {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

    await loadLocalPhoto(file)
    photo.value = photoRepository.get()
  }

  return {
    photo,
    handleFileChange,
  }
}
