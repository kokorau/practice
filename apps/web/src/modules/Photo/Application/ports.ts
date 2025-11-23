import type { Photo } from '../Domain/types'

export type PhotoRepository = {
  get: () => Photo | null
  set: (photo: Photo) => void
  clear: () => void
}
