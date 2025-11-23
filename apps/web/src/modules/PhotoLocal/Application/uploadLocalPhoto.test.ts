import { describe, it, expect, vi } from 'vitest'
import { uploadLocalPhoto } from './uploadLocalPhoto'
import type { Photo } from '../../Photo/Domain'
import type { LocalPhotoUploader } from './ports'
import type { PhotoRepository } from '../../Photo/Application/ports'

describe('uploadLocalPhoto', () => {
  it('should upload file and store photo in repository', async () => {
    const mockPhoto: Photo = {
      imageData: { width: 100, height: 100 } as ImageData,
      width: 100,
      height: 100,
    }

    const mockUploader: LocalPhotoUploader = {
      upload: vi.fn().mockResolvedValue(mockPhoto),
    }

    const mockRepository: PhotoRepository = {
      get: vi.fn().mockReturnValue(null),
      set: vi.fn(),
      clear: vi.fn(),
    }

    const file = new File([''], 'test.png', { type: 'image/png' })

    await uploadLocalPhoto(file, {
      uploader: mockUploader,
      repository: mockRepository,
    })

    expect(mockUploader.upload).toHaveBeenCalledWith(file)
    expect(mockRepository.set).toHaveBeenCalledWith(mockPhoto)
  })
})
