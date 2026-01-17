import { describe, it, expect, vi } from 'vitest'
import { createHeroViewInMemoryRepository } from './HeroViewInMemoryRepository'
import { createDefaultHeroViewConfig } from '../Domain/HeroViewConfig'

describe('HeroViewInMemoryRepository', () => {
  describe('createHeroViewInMemoryRepository', () => {
    it('should initialize with default config when no initial config provided', () => {
      const repository = createHeroViewInMemoryRepository()
      const config = repository.get()

      expect(config).toEqual(createDefaultHeroViewConfig())
    })

    it('should initialize with provided config', () => {
      const customConfig = {
        ...createDefaultHeroViewConfig(),
        viewport: { width: 800, height: 600 },
      }
      const repository = createHeroViewInMemoryRepository(customConfig)
      const config = repository.get()

      expect(config.viewport).toEqual({ width: 800, height: 600 })
    })

    it('should update config via set()', () => {
      const repository = createHeroViewInMemoryRepository()
      const newConfig = {
        ...createDefaultHeroViewConfig(),
        viewport: { width: 1600, height: 900 },
      }

      repository.set(newConfig)
      const config = repository.get()

      expect(config.viewport).toEqual({ width: 1600, height: 900 })
    })

    it('should notify subscribers when config changes', () => {
      const repository = createHeroViewInMemoryRepository()
      const subscriber = vi.fn()

      repository.subscribe(subscriber)

      // Should NOT be called immediately (lazy subscription)
      expect(subscriber).toHaveBeenCalledTimes(0)

      // Update config
      const newConfig = {
        ...createDefaultHeroViewConfig(),
        viewport: { width: 1600, height: 900 },
      }
      repository.set(newConfig)

      // Should be called with new value
      expect(subscriber).toHaveBeenCalledTimes(1)
      expect(subscriber).toHaveBeenLastCalledWith(newConfig)
    })

    it('should allow unsubscribing', () => {
      const repository = createHeroViewInMemoryRepository()
      const subscriber = vi.fn()

      const unsubscribe = repository.subscribe(subscriber)
      expect(subscriber).toHaveBeenCalledTimes(0)

      // Unsubscribe
      unsubscribe()

      // Update config
      const newConfig = {
        ...createDefaultHeroViewConfig(),
        viewport: { width: 1600, height: 900 },
      }
      repository.set(newConfig)

      // Should NOT be called at all
      expect(subscriber).toHaveBeenCalledTimes(0)
    })

    it('should support multiple subscribers', () => {
      const repository = createHeroViewInMemoryRepository()
      const subscriber1 = vi.fn()
      const subscriber2 = vi.fn()

      repository.subscribe(subscriber1)
      repository.subscribe(subscriber2)

      expect(subscriber1).toHaveBeenCalledTimes(0)
      expect(subscriber2).toHaveBeenCalledTimes(0)

      // Update config
      const newConfig = {
        ...createDefaultHeroViewConfig(),
        viewport: { width: 1600, height: 900 },
      }
      repository.set(newConfig)

      expect(subscriber1).toHaveBeenCalledTimes(1)
      expect(subscriber2).toHaveBeenCalledTimes(1)
    })
  })

  describe('updateColors', () => {
    it('should partially update colors and notify subscribers', () => {
      const repository = createHeroViewInMemoryRepository()
      const subscriber = vi.fn()
      repository.subscribe(subscriber)

      repository.updateColors({ semanticContext: 'sectionTint' })

      expect(subscriber).toHaveBeenCalledTimes(1)
      expect(repository.get().colors.semanticContext).toBe('sectionTint')
    })
  })

  describe('updateViewport', () => {
    it('should partially update viewport and notify subscribers', () => {
      const repository = createHeroViewInMemoryRepository()
      const subscriber = vi.fn()
      repository.subscribe(subscriber)

      repository.updateViewport({ width: 1920 })

      expect(subscriber).toHaveBeenCalledTimes(1)
      expect(repository.get().viewport.width).toBe(1920)
      expect(repository.get().viewport.height).toBe(720) // unchanged
    })
  })

  describe('updateForeground', () => {
    it('should partially update foreground and notify subscribers', () => {
      const repository = createHeroViewInMemoryRepository()
      const subscriber = vi.fn()
      repository.subscribe(subscriber)

      repository.updateForeground({ elements: [] })

      expect(subscriber).toHaveBeenCalledTimes(1)
      expect(repository.get().foreground.elements).toEqual([])
    })
  })

  describe('updateLayer', () => {
    it('should update specific layer by id', () => {
      const repository = createHeroViewInMemoryRepository()
      const subscriber = vi.fn()
      repository.subscribe(subscriber)

      // Update the nested 'background' layer inside 'background-group'
      repository.updateLayer('background', { name: 'Updated Background' })

      expect(subscriber).toHaveBeenCalledTimes(1)
      // Find in nested structure
      const group = repository.get().layers[0]
      expect(group?.type).toBe('group')
      if (group?.type === 'group') {
        const layer = group.children.find((l) => l.id === 'background')
        expect(layer?.name).toBe('Updated Background')
      }
    })

    it('should not modify other layers', () => {
      const config = createDefaultHeroViewConfig()
      config.layers.push({
        type: 'surface',
        id: 'surface-1',
        name: 'Surface 1',
        visible: true,
        surface: { type: 'solid' },
      })
      const repository = createHeroViewInMemoryRepository(config)

      repository.updateLayer('background', { name: 'Updated' })

      const surfaceLayer = repository.get().layers.find((l) => l.id === 'surface-1')
      expect(surfaceLayer?.name).toBe('Surface 1')
    })
  })

  describe('addLayer', () => {
    it('should add layer to the end by default', () => {
      const repository = createHeroViewInMemoryRepository()
      const newLayer = {
        type: 'surface' as const,
        id: 'surface-1',
        name: 'New Surface',
        visible: true,
        surface: { type: 'solid' as const },
        processors: [],
      }

      repository.addLayer(newLayer)

      const layers = repository.get().layers
      expect(layers.length).toBe(3) // background-group + clip-group + new layer
      expect(layers[2]!.id).toBe('surface-1')
    })

    it('should add layer at specified index', () => {
      const repository = createHeroViewInMemoryRepository()
      const newLayer = {
        type: 'surface' as const,
        id: 'surface-1',
        name: 'New Surface',
        visible: true,
        surface: { type: 'solid' as const },
      }

      repository.addLayer(newLayer, 0)

      const layers = repository.get().layers
      expect(layers.length).toBe(3) // new layer + background-group + clip-group
      expect(layers[0]!.id).toBe('surface-1')
      expect(layers[1]!.id).toBe('background-group')
      expect(layers[2]!.id).toBe('clip-group')
    })
  })

  describe('removeLayer', () => {
    it('should remove layer by id', () => {
      const config = createDefaultHeroViewConfig()
      config.layers.push({
        type: 'surface',
        id: 'surface-1',
        name: 'Surface 1',
        visible: true,
        surface: { type: 'solid' },
        processors: [],
      })
      const repository = createHeroViewInMemoryRepository(config)

      repository.removeLayer('surface-1')

      const layers = repository.get().layers
      expect(layers.length).toBe(2) // background-group and clip-group remain
      expect(layers.find((l) => l.id === 'surface-1')).toBeUndefined()
    })
  })

  describe('reorderLayers', () => {
    it('should reorder layers according to provided ids', () => {
      const config = createDefaultHeroViewConfig()
      config.layers = [
        { type: 'base', id: 'layer-1', name: 'Layer 1', visible: true, surface: { type: 'solid' }, processors: [] },
        { type: 'surface', id: 'layer-2', name: 'Layer 2', visible: true, surface: { type: 'solid' }, processors: [] },
        { type: 'surface', id: 'layer-3', name: 'Layer 3', visible: true, surface: { type: 'solid' }, processors: [] },
      ]
      const repository = createHeroViewInMemoryRepository(config)

      repository.reorderLayers(['layer-3', 'layer-1', 'layer-2'])

      const layers = repository.get().layers
      expect(layers[0]!.id).toBe('layer-3')
      expect(layers[1]!.id).toBe('layer-1')
      expect(layers[2]!.id).toBe('layer-2')
    })

    it('should only include layers that exist', () => {
      const config = createDefaultHeroViewConfig()
      config.layers = [
        { type: 'base', id: 'layer-1', name: 'Layer 1', visible: true, surface: { type: 'solid' }, processors: [] },
        { type: 'surface', id: 'layer-2', name: 'Layer 2', visible: true, surface: { type: 'solid' }, processors: [] },
      ]
      const repository = createHeroViewInMemoryRepository(config)

      repository.reorderLayers(['layer-2', 'non-existent', 'layer-1'])

      const layers = repository.get().layers
      expect(layers.length).toBe(2)
      expect(layers[0]!.id).toBe('layer-2')
      expect(layers[1]!.id).toBe('layer-1')
    })
  })
})
