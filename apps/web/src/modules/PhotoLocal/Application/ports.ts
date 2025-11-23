import type { Photo } from '../../Photo/Domain/types'

export type LocalPhotoUploader = {
  upload: (file: File) => Promise<Photo>
}
