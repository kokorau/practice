import { describe, it, expect } from 'vitest'
import { updateLayer } from './updateLayer'
import { createHeroViewInMemoryRepository } from '../../Infra/HeroViewInMemoryRepository'
import type { HeroViewConfig } from '../../Domain/HeroViewConfig'

describe('updateLayer', () => {
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
        surface: { id: 'solid', params: {} },
        processors: [],
      },
      {
        type: 'surface',
        id: 'surface-1',
        name: 'Surface 1',
        visible: true,
        surface: { id: 'solid', params: {} },
        processors: [],
      },
    ],
    foreground: { elements: [] },
  })

  it('should update layer name', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    const result = updateLayer('surface-1', { name: 'Updated Name' }, repository)

    expect(result).toBe(true)
    const layer = repository.get().layers[1]
    expect(layer).toBeDefined()
    expect(layer!.name).toBe('Updated Name')
  })

  it('should update layer visibility', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    updateLayer('surface-1', { visible: false }, repository)

    const layer = repository.get().layers[1]
    expect(layer).toBeDefined()
    expect(layer!.visible).toBe(false)
  })

  it('should update multiple properties at once', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    updateLayer('surface-1', { name: 'New Name', visible: false }, repository)

    const layer = repository.get().layers[1]
    expect(layer).toBeDefined()
    expect(layer!.name).toBe('New Name')
    expect(layer!.visible).toBe(false)
  })

  it('should return false for non-existent layer', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    const result = updateLayer('non-existent', { name: 'Test' }, repository)

    expect(result).toBe(false)
  })

  it('should not affect other layers', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    updateLayer('surface-1', { name: 'Updated' }, repository)

    const baseLayer = repository.get().layers[0]
    expect(baseLayer).toBeDefined()
    expect(baseLayer!.name).toBe('Background')
  })
})
