import { photoRepository } from '../../Photo/Infra/photoRepository'
import { uploadLocalPhoto } from '../Infra/localPhotoUploader'

export const loadLocalPhoto = async (file: File) => {
  const photo = await uploadLocalPhoto(file)
  photoRepository.set(photo)
  return photo
}
