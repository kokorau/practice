import type { Photo } from '../Domain'
import type { PhotoRepository } from '../Application/ports'

let current: Photo | null = null

export const photoRepository: PhotoRepository = {
  get: () => current,
  set: (photo: Photo) => {
    current = photo
  },
  clear: () => {
    current = null
  },
}
