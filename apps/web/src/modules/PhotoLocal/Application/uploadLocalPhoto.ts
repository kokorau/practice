import type { PhotoRepository } from '../../Photo/Application/ports'
import type { LocalPhotoUploader } from './ports'

export type UploadLocalPhotoDeps = {
  uploader: LocalPhotoUploader
  repository: PhotoRepository
}

export const uploadLocalPhoto = async (
  file: File,
  deps: UploadLocalPhotoDeps
): Promise<void> => {
  const photo = await deps.uploader.upload(file)
  deps.repository.set(photo)
}
