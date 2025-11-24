// Domain
export type {
  Media,
  MediaSource,
  MediaSourceType,
  PhotoSource,
  CameraSource,
} from './Domain'
export { $Media } from './Domain'

// Re-export Photo for convenience
export type { Photo } from '../Photo/Domain'
export { $Photo } from '../Photo/Domain'

// Application
export type { MediaRepository } from './Application/ports'

// Infra
export { mediaRepository } from './Infra/mediaRepository'
