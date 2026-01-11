import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMaskUsecase,
  type MaskUsecase,
  type ImageUploadPort,
} from './MaskUsecase'
import { createHeroViewInMemoryRepository } from '../Infra/HeroViewInMemoryRepository'
import type { HeroViewRepository } from './ports/HeroViewRepository'
import type { HeroViewConfig } from '../Domain/HeroViewConfig'

describe('MaskUsecase', () => {
  let repository: HeroViewRepository
  let usecase: MaskUsecase
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
      {
        type: 'surface',
        id: 'mask',
        name: 'Mask Layer',
        visible: true,
        surface: { type: 'solid' },
        processors: [
          {
            type: 'mask',
            enabled: true,
            shape: { type: 'circle', centerX: 0.5, centerY: 0.5, radius: 0.3, cutout: true },
            invert: false,
            feather: 0,
          },
        ],
      },
    ],
    foreground: { elements: [] },
  })

  beforeEach(() => {
    repository = createHeroViewInMemoryRepository(createTestConfig())
    mockImageUpload = {
      upload: vi.fn().mockResolvedValue('uploaded-mask-image-id'),
      fetchRandom: vi.fn().mockResolvedValue(new File([''], 'random-mask.jpg')),
    }
    usecase = createMaskUsecase({
      repository,
      imageUpload: mockImageUpload,
    })
  })

  describe('selectMaskShape', () => {
    it('updates mask shape to circle', () => {
      const circleShape = { type: 'circle' as const, centerX: 0.3, centerY: 0.7, radius: 0.4, cutout: false }
      usecase.selectMaskShape(circleShape)

      const layer = repository.findLayer('mask')
      expect(layer).toBeDefined()
      expect(layer?.type).toBe('surface')
      if (layer?.type === 'surface') {
        const maskProcessor = layer.processors.find(p => p.type === 'mask')
        expect(maskProcessor?.type).toBe('mask')
        if (maskProcessor?.type === 'mask') {
          expect(maskProcessor.shape).toEqual(circleShape)
        }
      }
    })

    it('updates mask shape to rect', () => {
      const rectShape = {
        type: 'rect' as const,
        left: 0.1,
        right: 0.9,
        top: 0.2,
        bottom: 0.8,
        radiusTopLeft: 10,
        radiusTopRight: 10,
        radiusBottomLeft: 10,
        radiusBottomRight: 10,
        cutout: true,
      }
      usecase.selectMaskShape(rectShape)

      const layer = repository.findLayer('mask')
      if (layer?.type === 'surface') {
        const maskProcessor = layer.processors.find(p => p.type === 'mask')
        if (maskProcessor?.type === 'mask') {
          expect(maskProcessor.shape).toEqual(rectShape)
        }
      }
    })

    it('updates mask shape to blob', () => {
      const blobShape = {
        type: 'blob' as const,
        centerX: 0.5,
        centerY: 0.5,
        baseRadius: 0.3,
        amplitude: 0.1,
        octaves: 4,
        seed: 12345,
        cutout: true,
      }
      usecase.selectMaskShape(blobShape)

      const layer = repository.findLayer('mask')
      if (layer?.type === 'surface') {
        const maskProcessor = layer.processors.find(p => p.type === 'mask')
        if (maskProcessor?.type === 'mask') {
          expect(maskProcessor.shape).toEqual(blobShape)
        }
      }
    })

    it('updates mask shape to perlin', () => {
      const perlinShape = {
        type: 'perlin' as const,
        seed: 54321,
        threshold: 0.5,
        scale: 4,
        octaves: 3,
        cutout: true,
      }
      usecase.selectMaskShape(perlinShape)

      const layer = repository.findLayer('mask')
      if (layer?.type === 'surface') {
        const maskProcessor = layer.processors.find(p => p.type === 'mask')
        if (maskProcessor?.type === 'mask') {
          expect(maskProcessor.shape).toEqual(perlinShape)
        }
      }
    })
  })

  describe('updateMaskShapeParams', () => {
    it('updates circle shape params', () => {
      usecase.updateMaskShapeParams({ type: 'circle', radius: 0.5, centerX: 0.2 })

      const layer = repository.findLayer('mask')
      if (layer?.type === 'surface') {
        const maskProcessor = layer.processors.find(p => p.type === 'mask')
        if (maskProcessor?.type === 'mask') {
          expect(maskProcessor.shape).toEqual({
            type: 'circle',
            centerX: 0.2,
            centerY: 0.5,
            radius: 0.5,
            cutout: true,
          })
        }
      }
    })

    it('does not update when shape type does not match', () => {
      usecase.updateMaskShapeParams({ type: 'rect', left: 0.1 })

      const layer = repository.findLayer('mask')
      if (layer?.type === 'surface') {
        const maskProcessor = layer.processors.find(p => p.type === 'mask')
        if (maskProcessor?.type === 'mask') {
          expect(maskProcessor.shape.type).toBe('circle')
        }
      }
    })

    it('updates rect shape params after selecting rect shape', () => {
      usecase.selectMaskShape({
        type: 'rect',
        left: 0.1,
        right: 0.9,
        top: 0.1,
        bottom: 0.9,
        radiusTopLeft: 0,
        radiusTopRight: 0,
        radiusBottomLeft: 0,
        radiusBottomRight: 0,
        cutout: true,
      })

      usecase.updateMaskShapeParams({ type: 'rect', left: 0.2, right: 0.8 })

      const layer = repository.findLayer('mask')
      if (layer?.type === 'surface') {
        const maskProcessor = layer.processors.find(p => p.type === 'mask')
        if (maskProcessor?.type === 'mask') {
          expect(maskProcessor.shape).toEqual({
            type: 'rect',
            left: 0.2,
            right: 0.8,
            top: 0.1,
            bottom: 0.9,
            radiusTopLeft: 0,
            radiusTopRight: 0,
            radiusBottomLeft: 0,
            radiusBottomRight: 0,
            cutout: true,
          })
        }
      }
    })
  })

  describe('selectMidgroundSurface', () => {
    it('updates mask layer surface to stripe', () => {
      const stripeSurface = { type: 'stripe' as const, width1: 20, width2: 20, angle: 45 }
      usecase.selectMidgroundSurface(stripeSurface)

      const layer = repository.findLayer('mask')
      expect(layer?.type).toBe('surface')
      if (layer?.type === 'surface') {
        expect(layer.surface).toEqual(stripeSurface)
      }
    })

    it('updates mask layer surface to grid', () => {
      const gridSurface = { type: 'grid' as const, lineWidth: 2, cellSize: 30 }
      usecase.selectMidgroundSurface(gridSurface)

      const layer = repository.findLayer('mask')
      if (layer?.type === 'surface') {
        expect(layer.surface).toEqual(gridSurface)
      }
    })

    it('updates mask layer surface to polkaDot', () => {
      const polkaDotSurface = { type: 'polkaDot' as const, dotRadius: 10, spacing: 40, rowOffset: 0.5 }
      usecase.selectMidgroundSurface(polkaDotSurface)

      const layer = repository.findLayer('mask')
      if (layer?.type === 'surface') {
        expect(layer.surface).toEqual(polkaDotSurface)
      }
    })
  })

  describe('updateMaskColorKey', () => {
    it('updates primary mask color key', () => {
      usecase.updateMaskColorKey('primary', 'A')

      const config = repository.get()
      expect(config.colors.mask.primary).toBe('A')
      expect(config.colors.mask.secondary).toBe('auto')
    })

    it('updates secondary mask color key', () => {
      usecase.updateMaskColorKey('secondary', 'F5')

      const config = repository.get()
      expect(config.colors.mask.primary).toBe('auto')
      expect(config.colors.mask.secondary).toBe('F5')
    })

    it('sets secondary to auto', () => {
      usecase.updateMaskColorKey('secondary', 'F3')
      usecase.updateMaskColorKey('secondary', 'auto')

      const config = repository.get()
      expect(config.colors.mask.secondary).toBe('auto')
    })
  })

  describe('uploadMaskImage', () => {
    it('uploads image and sets as mask surface', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      await usecase.uploadMaskImage(file)

      expect(mockImageUpload.upload).toHaveBeenCalledWith(file)
      const layer = repository.findLayer('mask')
      if (layer?.type === 'surface') {
        expect(layer.surface).toEqual({ type: 'image', imageId: 'uploaded-mask-image-id' })
      }
    })

    it('throws error when imageUpload port is not configured', async () => {
      const usecaseWithoutPort = createMaskUsecase({ repository })
      const file = new File(['test'], 'test.jpg')

      await expect(usecaseWithoutPort.uploadMaskImage(file)).rejects.toThrow(
        'ImageUploadPort is not configured'
      )
    })
  })

  describe('clearMaskImage', () => {
    it('clears image and sets solid surface', async () => {
      const file = new File(['test'], 'test.jpg')
      await usecase.uploadMaskImage(file)

      usecase.clearMaskImage()

      const layer = repository.findLayer('mask')
      if (layer?.type === 'surface') {
        expect(layer.surface).toEqual({ type: 'solid' })
      }
    })
  })

  describe('loadRandomMaskImage', () => {
    it('fetches random image and sets as mask surface', async () => {
      await usecase.loadRandomMaskImage('abstract')

      expect(mockImageUpload.fetchRandom).toHaveBeenCalledWith('abstract')
      expect(mockImageUpload.upload).toHaveBeenCalled()
      const layer = repository.findLayer('mask')
      if (layer?.type === 'surface') {
        expect(layer.surface).toEqual({ type: 'image', imageId: 'uploaded-mask-image-id' })
      }
    })

    it('throws error when imageUpload port is not configured', async () => {
      const usecaseWithoutPort = createMaskUsecase({ repository })

      await expect(usecaseWithoutPort.loadRandomMaskImage()).rejects.toThrow(
        'ImageUploadPort is not configured'
      )
    })
  })

  describe('updateSurfaceParams', () => {
    it('updates stripe surface params', () => {
      usecase.selectMidgroundSurface({ type: 'stripe', width1: 20, width2: 20, angle: 45 })

      usecase.updateSurfaceParams({ type: 'stripe', width1: 30, angle: 90 })

      const layer = repository.findLayer('mask')
      if (layer?.type === 'surface') {
        expect(layer.surface).toEqual({ type: 'stripe', width1: 30, width2: 20, angle: 90 })
      }
    })

    it('updates grid surface params', () => {
      usecase.selectMidgroundSurface({ type: 'grid', lineWidth: 2, cellSize: 30 })
      usecase.updateSurfaceParams({ type: 'grid', cellSize: 50 })

      const layer = repository.findLayer('mask')
      if (layer?.type === 'surface') {
        expect(layer.surface).toEqual({ type: 'grid', lineWidth: 2, cellSize: 50 })
      }
    })

    it('does not update when surface type does not match', () => {
      usecase.selectMidgroundSurface({ type: 'stripe', width1: 20, width2: 20, angle: 45 })
      usecase.updateSurfaceParams({ type: 'grid', cellSize: 50 })

      const layer = repository.findLayer('mask')
      if (layer?.type === 'surface') {
        expect(layer.surface).toEqual({ type: 'stripe', width1: 20, width2: 20, angle: 45 })
      }
    })

    it('does not update solid surface', () => {
      usecase.selectMidgroundSurface({ type: 'solid' })
      usecase.updateSurfaceParams({ type: 'stripe', width1: 30 })

      const layer = repository.findLayer('mask')
      if (layer?.type === 'surface') {
        expect(layer.surface).toEqual({ type: 'solid' })
      }
    })
  })

  describe('repository subscription', () => {
    it('notifies subscribers when mask shape changes', () => {
      const callback = vi.fn()
      repository.subscribe(callback)

      usecase.selectMaskShape({ type: 'circle', centerX: 0.5, centerY: 0.5, radius: 0.4, cutout: true })

      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('notifies subscribers when surface changes', () => {
      const callback = vi.fn()
      repository.subscribe(callback)

      usecase.selectMidgroundSurface({ type: 'stripe', width1: 20, width2: 20, angle: 45 })

      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('notifies subscribers when mask color key changes', () => {
      const callback = vi.fn()
      repository.subscribe(callback)

      usecase.updateMaskColorKey('primary', 'A')

      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          colors: expect.objectContaining({
            mask: { primary: 'A', secondary: 'auto' },
          }),
        })
      )
    })
  })
})
