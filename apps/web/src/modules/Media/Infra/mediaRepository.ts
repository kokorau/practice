import type { Media } from '../Domain'
import type { MediaRepository } from '../Application/ports'

/**
 * In-memory Media Repository
 */
let current: Media | null = null

export const mediaRepository: MediaRepository = {
  get: () => current,
  set: (media: Media) => {
    current = media
  },
  clear: () => {
    current = null
  },
}
