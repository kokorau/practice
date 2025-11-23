import type { Photo } from '../../Photo/Domain'

export type LocalPhotoUploader = {
  upload: (file: File) => Promise<Photo>
}
