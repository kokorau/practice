import { describe, it, expect } from 'vitest'
import { addLayer } from './addLayer'
import { createHeroViewInMemoryRepository } from '../../Infra/HeroViewInMemoryRepository'
import type { HeroViewConfig, SurfaceLayerNodeConfig } from '../../Domain/HeroViewConfig'

describe('addLayer', () => {
  const createTestConfig = (): HeroViewConfig => ({
    viewport: { width: 1280, height: 720 },
    colors: {
      background: { primary: 'B', secondary: 'auto' },
      mask: { primary: 'auto', secondary: 'auto' },
      semanticContext: 'canvas',
      brand: { hue: 198, saturation: 70, value: 65 },
      accent: { hue: 30, saturation: 80, value: 60 },
      foundation: { hue: 0, saturation: 0, value: 97 },
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

  const createSurfaceLayer = (id: string): SurfaceLayerNodeConfig => ({
    type: 'surface',
    id,
    name: 'New Surface',
    visible: true,
    surface: { type: 'solid' },
    processors: [],
  })

  it('should add layer to the end by default', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())
    const newLayer = createSurfaceLayer('surface-new')

    const result = addLayer(newLayer, repository)

    expect(result).toBe('surface-new')
    expect(repository.get().layers).toHaveLength(2)
    const layer = repository.get().layers[1]
    expect(layer).toBeDefined()
    expect(layer!.id).toBe('surface-new')
  })

  it('should add layer at specified index', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())
    const newLayer = createSurfaceLayer('surface-new')

    addLayer(newLayer, repository, 0)

    expect(repository.get().layers).toHaveLength(2)
    const firstLayer = repository.get().layers[0]
    const secondLayer = repository.get().layers[1]
    expect(firstLayer).toBeDefined()
    expect(secondLayer).toBeDefined()
    expect(firstLayer!.id).toBe('surface-new')
    expect(secondLayer!.id).toBe('base')
  })

  it('should preserve layer properties', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())
    const newLayer = createSurfaceLayer('surface-new')
    newLayer.name = 'Custom Name'
    newLayer.visible = false

    addLayer(newLayer, repository)

    const addedLayer = repository.get().layers[1]
    expect(addedLayer).toBeDefined()
    expect(addedLayer!.name).toBe('Custom Name')
    expect(addedLayer!.visible).toBe(false)
  })
})
