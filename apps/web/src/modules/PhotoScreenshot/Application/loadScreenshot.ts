import { photoRepository } from '../../Photo/Infra/photoRepository'
import { fetchScreenshot } from '../Infra/fetchScreenshot'

export type LoadScreenshotOptions = {
  url: string
}

export const loadScreenshot = async (options: LoadScreenshotOptions) => {
  const photo = await fetchScreenshot(options)
  photoRepository.set(photo)
  return photo
}
