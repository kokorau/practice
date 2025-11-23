import type { Photo } from '../Domain'

export type PhotoRepository = {
  get: () => Photo | null
  set: (photo: Photo) => void
  clear: () => void
}
