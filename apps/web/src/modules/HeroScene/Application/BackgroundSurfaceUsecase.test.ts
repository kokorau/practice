import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createBackgroundSurfaceUsecase,
  type BackgroundSurfaceUsecase,
  type ImageUploadPort,
} from './BackgroundSurfaceUsecase'
import { createHeroViewInMemoryRepository } from '../Infra/HeroViewInMemoryRepository'
import type { HeroViewRepository } from './ports/HeroViewRepository'
import type { HeroViewConfig } from '../Domain/HeroViewConfig'

describe('BackgroundSurfaceUsecase', () => {
  let repository: HeroViewRepository
  let usecase: BackgroundSurfaceUsecase
  let mockImageUpload: ImageUploadPort

  const createTestConfig = (): HeroViewConfig => ({
    viewport: { width: 1280, height: 720 },
    colors: {
      background: { primary: 'B', secondary: 'auto' },
      mask: { primary: 'auto', secondary: 'auto' },
      semanticContext: 'canvas',
    },
    layers: [
      {
        type: 'base',
        id: 'base',
        name: 'Background',
        visible: true,
        surface: { type: 'solid' },
        processors: [],
      },
    ],
    foreground: { elements: [] },
  })

  beforeEach(() => {
    repository = createHeroViewInMemoryRepository(createTestConfig())
    mockImageUpload = {
      upload: vi.fn().mockResolvedValue('uploaded-image-id'),
      fetchRandom: vi.fn().mockResolvedValue(new File([''], 'random.jpg')),
    }
    usecase = createBackgroundSurfaceUsecase({
      repository,
      imageUpload: mockImageUpload,
    })
  })

  describe('selectSurface', () => {
    it('updates background layer surface to stripe', () => {
      const stripeSurface = { type: 'stripe' as const, width1: 20, width2: 20, angle: 45 }
      usecase.selectSurface(stripeSurface)

      const layer = repository.findLayer('base')
      expect(layer).toBeDefined()
      expect(layer?.type).toBe('base')
      if (layer?.type === 'base') {
        expect(layer.surface).toEqual(stripeSurface)
      }
    })

    it('updates background layer surface to grid', () => {
      const gridSurface = { type: 'grid' as const, lineWidth: 2, cellSize: 30 }
      usecase.selectSurface(gridSurface)

      const layer = repository.findLayer('base')
      if (layer?.type === 'base') {
        expect(layer.surface).toEqual(gridSurface)
      }
    })

    it('updates background layer surface to polkaDot', () => {
      const polkaDotSurface = { type: 'polkaDot' as const, dotRadius: 10, spacing: 40, rowOffset: 0.5 }
      usecase.selectSurface(polkaDotSurface)

      const layer = repository.findLayer('base')
      if (layer?.type === 'base') {
        expect(layer.surface).toEqual(polkaDotSurface)
      }
    })
  })

  describe('updateColorKey', () => {
    it('updates primary color key', () => {
      usecase.updateColorKey('primary', 'A')

      const config = repository.get()
      expect(config.colors.background.primary).toBe('A')
      expect(config.colors.background.secondary).toBe('auto')
    })

    it('updates secondary color key', () => {
      usecase.updateColorKey('secondary', 'F5')

      const config = repository.get()
      expect(config.colors.background.primary).toBe('B')
      expect(config.colors.background.secondary).toBe('F5')
    })

    it('sets secondary to auto', () => {
      usecase.updateColorKey('secondary', 'F3')
      usecase.updateColorKey('secondary', 'auto')

      const config = repository.get()
      expect(config.colors.background.secondary).toBe('auto')
    })
  })

  describe('uploadImage', () => {
    it('uploads image and sets as background', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      await usecase.uploadImage(file)

      expect(mockImageUpload.upload).toHaveBeenCalledWith(file)
      const layer = repository.findLayer('base')
      if (layer?.type === 'base') {
        expect(layer.surface).toEqual({ type: 'image', imageId: 'uploaded-image-id' })
      }
    })

    it('throws error when imageUpload port is not configured', async () => {
      const usecaseWithoutPort = createBackgroundSurfaceUsecase({ repository })
      const file = new File(['test'], 'test.jpg')

      await expect(usecaseWithoutPort.uploadImage(file)).rejects.toThrow(
        'ImageUploadPort is not configured'
      )
    })
  })

  describe('clearImage', () => {
    it('clears image and sets solid surface', async () => {
      // First set an image
      const file = new File(['test'], 'test.jpg')
      await usecase.uploadImage(file)

      // Then clear it
      usecase.clearImage()

      const layer = repository.findLayer('base')
      if (layer?.type === 'base') {
        expect(layer.surface).toEqual({ type: 'solid' })
      }
    })
  })

  describe('loadRandomImage', () => {
    it('fetches random image and sets as background', async () => {
      await usecase.loadRandomImage('nature')

      expect(mockImageUpload.fetchRandom).toHaveBeenCalledWith('nature')
      expect(mockImageUpload.upload).toHaveBeenCalled()
      const layer = repository.findLayer('base')
      if (layer?.type === 'base') {
        expect(layer.surface).toEqual({ type: 'image', imageId: 'uploaded-image-id' })
      }
    })

    it('throws error when imageUpload port is not configured', async () => {
      const usecaseWithoutPort = createBackgroundSurfaceUsecase({ repository })

      await expect(usecaseWithoutPort.loadRandomImage()).rejects.toThrow(
        'ImageUploadPort is not configured'
      )
    })
  })

  describe('updateSurfaceParams', () => {
    it('updates stripe surface params', () => {
      // First set a stripe surface
      usecase.selectSurface({ type: 'stripe', width1: 20, width2: 20, angle: 45 })

      // Then update params
      usecase.updateSurfaceParams({ type: 'stripe', width1: 30, angle: 90 })

      const layer = repository.findLayer('base')
      if (layer?.type === 'base') {
        expect(layer.surface).toEqual({ type: 'stripe', width1: 30, width2: 20, angle: 90 })
      }
    })

    it('updates grid surface params', () => {
      usecase.selectSurface({ type: 'grid', lineWidth: 2, cellSize: 30 })
      usecase.updateSurfaceParams({ type: 'grid', cellSize: 50 })

      const layer = repository.findLayer('base')
      if (layer?.type === 'base') {
        expect(layer.surface).toEqual({ type: 'grid', lineWidth: 2, cellSize: 50 })
      }
    })

    it('does not update when surface type does not match', () => {
      usecase.selectSurface({ type: 'stripe', width1: 20, width2: 20, angle: 45 })
      usecase.updateSurfaceParams({ type: 'grid', cellSize: 50 })

      const layer = repository.findLayer('base')
      if (layer?.type === 'base') {
        expect(layer.surface).toEqual({ type: 'stripe', width1: 20, width2: 20, angle: 45 })
      }
    })

    it('does not update solid surface', () => {
      // Solid surface has no params to update
      usecase.selectSurface({ type: 'solid' })
      usecase.updateSurfaceParams({ type: 'stripe', width1: 30 })

      const layer = repository.findLayer('base')
      if (layer?.type === 'base') {
        expect(layer.surface).toEqual({ type: 'solid' })
      }
    })
  })

  describe('repository subscription', () => {
    it('notifies subscribers when surface changes', () => {
      const callback = vi.fn()
      repository.subscribe(callback)

      usecase.selectSurface({ type: 'stripe', width1: 20, width2: 20, angle: 45 })

      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          layers: expect.arrayContaining([
            expect.objectContaining({
              id: 'base',
              surface: { type: 'stripe', width1: 20, width2: 20, angle: 45 },
            }),
          ]),
        })
      )
    })

    it('notifies subscribers when color key changes', () => {
      const callback = vi.fn()
      repository.subscribe(callback)

      usecase.updateColorKey('primary', 'A')

      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          colors: expect.objectContaining({
            background: { primary: 'A', secondary: 'auto' },
          }),
        })
      )
    })
  })
})
