import { describe, it, expect } from 'vitest'
import { removeLayer } from './removeLayer'
import { createHeroViewInMemoryRepository } from '../../Infra/HeroViewInMemoryRepository'
import type { HeroViewConfig } from '../../Domain/HeroViewConfig'

describe('removeLayer', () => {
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
      {
        type: 'surface',
        id: 'surface-1',
        name: 'Surface 1',
        visible: true,
        surface: { type: 'solid' },
        processors: [],
      },
      {
        type: 'surface',
        id: 'surface-2',
        name: 'Surface 2',
        visible: true,
        surface: { type: 'solid' },
        processors: [],
      },
    ],
    foreground: { elements: [] },
  })

  it('should remove existing layer', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    const result = removeLayer('surface-1', repository)

    expect(result).toBe(true)
    expect(repository.get().layers).toHaveLength(2)
    expect(repository.get().layers.find((l) => l.id === 'surface-1')).toBeUndefined()
  })

  it('should return false for non-existent layer', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    const result = removeLayer('non-existent', repository)

    expect(result).toBe(false)
    expect(repository.get().layers).toHaveLength(3)
  })

  it('should preserve other layers', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    removeLayer('surface-1', repository)

    const layers = repository.get().layers
    const firstLayer = layers[0]
    const secondLayer = layers[1]
    expect(firstLayer).toBeDefined()
    expect(secondLayer).toBeDefined()
    expect(firstLayer!.id).toBe('base')
    expect(secondLayer!.id).toBe('surface-2')
  })
})
