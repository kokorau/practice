import { photoRepository } from '../../Photo/Infra/photoRepository'
import { fetchUnsplashPhoto } from '../Infra/fetchUnsplashPhoto'

export type LoadUnsplashPhotoOptions = {
  query?: string
}

export const loadUnsplashPhoto = async (options: LoadUnsplashPhotoOptions = {}) => {
  const photo = await fetchUnsplashPhoto(options)
  photoRepository.set(photo)
  return photo
}
