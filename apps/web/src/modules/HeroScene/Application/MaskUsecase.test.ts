import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMaskUsecase,
  type MaskUsecase,
  type ImageUploadPort,
} from './MaskUsecase'
import { createHeroViewInMemoryRepository } from '../Infra/HeroViewInMemoryRepository'
import type { HeroViewRepository } from './ports/HeroViewRepository'
import type { HeroViewConfig } from '../Domain/HeroViewConfig'
import { SCENE_LAYER_IDS } from '../Domain/LayerNode'

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
      brand: { hue: 220, saturation: 0.8, value: 0.6 },
      accent: { hue: 340, saturation: 0.7, value: 0.5 },
      foundation: { hue: 0, saturation: 0, value: 0.5 },
    },
    layers: [
      {
        type: 'base',
        id: SCENE_LAYER_IDS.BASE,
        name: 'Background',
        visible: true,
        surface: { type: 'solid' },
        filters: [],
      },
      {
        type: 'surface',
        id: SCENE_LAYER_IDS.MASK,
        name: 'Mask Layer',
        visible: true,
        surface: { type: 'solid' },
        filters: [],
      },
      // Masks are now on processor nodes, not on surface layers
      {
        type: 'processor',
        id: 'processor-mask',
        name: 'Mask Processor',
        visible: true,
        modifiers: [
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

  // NOTE: selectMaskShape and updateMaskShapeParams are now deprecated no-ops
  // Masks are now on ProcessorNodeConfig.modifiers, not on surface layers
  describe('selectMaskShape (deprecated)', () => {
    it('is a no-op since masks are now on processor nodes', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const originalConfig = JSON.stringify(repository.get())

      const circleShape = { type: 'circle' as const, centerX: 0.3, centerY: 0.7, radius: 0.4, cutout: false }
      usecase.selectMaskShape(circleShape)

      // Config should not change
      expect(JSON.stringify(repository.get())).toBe(originalConfig)
      expect(consoleSpy).toHaveBeenCalledWith('MaskUsecase.selectMaskShape is deprecated. Use processor nodes instead.')

      consoleSpy.mockRestore()
    })
  })

  describe('updateMaskShapeParams (deprecated)', () => {
    it('is a no-op since masks are now on processor nodes', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const originalConfig = JSON.stringify(repository.get())

      usecase.updateMaskShapeParams({ type: 'circle', radius: 0.5, centerX: 0.2 })

      // Config should not change
      expect(JSON.stringify(repository.get())).toBe(originalConfig)
      expect(consoleSpy).toHaveBeenCalledWith('MaskUsecase.updateMaskShapeParams is deprecated. Use processor nodes instead.')

      consoleSpy.mockRestore()
    })
  })

  describe('selectMidgroundSurface', () => {
    it('updates mask layer surface to stripe', () => {
      const stripeSurface = { type: 'stripe' as const, width1: 20, width2: 20, angle: 45 }
      usecase.selectMidgroundSurface(stripeSurface)

      const layer = repository.findLayer(SCENE_LAYER_IDS.MASK)
      expect(layer?.type).toBe('surface')
      if (layer?.type === 'surface') {
        expect(layer.surface).toEqual(stripeSurface)
      }
    })

    it('updates mask layer surface to grid', () => {
      const gridSurface = { type: 'grid' as const, lineWidth: 2, cellSize: 30 }
      usecase.selectMidgroundSurface(gridSurface)

      const layer = repository.findLayer(SCENE_LAYER_IDS.MASK)
      if (layer?.type === 'surface') {
        expect(layer.surface).toEqual(gridSurface)
      }
    })

    it('updates mask layer surface to polkaDot', () => {
      const polkaDotSurface = { type: 'polkaDot' as const, dotRadius: 10, spacing: 40, rowOffset: 0.5 }
      usecase.selectMidgroundSurface(polkaDotSurface)

      const layer = repository.findLayer(SCENE_LAYER_IDS.MASK)
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
      const layer = repository.findLayer(SCENE_LAYER_IDS.MASK)
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

      const layer = repository.findLayer(SCENE_LAYER_IDS.MASK)
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
      const layer = repository.findLayer(SCENE_LAYER_IDS.MASK)
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

      const layer = repository.findLayer(SCENE_LAYER_IDS.MASK)
      if (layer?.type === 'surface') {
        expect(layer.surface).toEqual({ type: 'stripe', width1: 30, width2: 20, angle: 90 })
      }
    })

    it('updates grid surface params', () => {
      usecase.selectMidgroundSurface({ type: 'grid', lineWidth: 2, cellSize: 30 })
      usecase.updateSurfaceParams({ type: 'grid', cellSize: 50 })

      const layer = repository.findLayer(SCENE_LAYER_IDS.MASK)
      if (layer?.type === 'surface') {
        expect(layer.surface).toEqual({ type: 'grid', lineWidth: 2, cellSize: 50 })
      }
    })

    it('does not update when surface type does not match', () => {
      usecase.selectMidgroundSurface({ type: 'stripe', width1: 20, width2: 20, angle: 45 })
      usecase.updateSurfaceParams({ type: 'grid', cellSize: 50 })

      const layer = repository.findLayer(SCENE_LAYER_IDS.MASK)
      if (layer?.type === 'surface') {
        expect(layer.surface).toEqual({ type: 'stripe', width1: 20, width2: 20, angle: 45 })
      }
    })

    it('does not update solid surface', () => {
      usecase.selectMidgroundSurface({ type: 'solid' })
      usecase.updateSurfaceParams({ type: 'stripe', width1: 30 })

      const layer = repository.findLayer(SCENE_LAYER_IDS.MASK)
      if (layer?.type === 'surface') {
        expect(layer.surface).toEqual({ type: 'solid' })
      }
    })
  })

  describe('repository subscription', () => {
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
