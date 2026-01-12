import { describe, it, expect } from 'vitest'
import { moveLayer } from './moveLayer'
import { createHeroViewInMemoryRepository } from '../../Infra/HeroViewInMemoryRepository'
import type { HeroViewConfig } from '../../Domain/HeroViewConfig'

describe('moveLayer', () => {
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
      {
        type: 'surface',
        id: 'surface-3',
        name: 'Surface 3',
        visible: true,
        surface: { type: 'solid' },
        processors: [],
      },
    ],
    foreground: { elements: [] },
  })

  it('should move layer before target', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    const result = moveLayer('surface-3', 'surface-1', 'before', repository)

    expect(result).toBe(true)
    const layers = repository.get().layers
    expect(layers.map((l) => l.id)).toEqual(['base', 'surface-3', 'surface-1', 'surface-2'])
  })

  it('should move layer after target', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    const result = moveLayer('surface-1', 'surface-3', 'after', repository)

    expect(result).toBe(true)
    const layers = repository.get().layers
    expect(layers.map((l) => l.id)).toEqual(['base', 'surface-2', 'surface-3', 'surface-1'])
  })

  it('should return false when moving to same position', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    const result = moveLayer('surface-1', 'surface-1', 'before', repository)

    expect(result).toBe(false)
  })

  it('should return false for non-existent source', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    const result = moveLayer('non-existent', 'surface-1', 'before', repository)

    expect(result).toBe(false)
  })

  it('should return false for non-existent target', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    const result = moveLayer('surface-1', 'non-existent', 'before', repository)

    expect(result).toBe(false)
  })

  it('should return false for "into" position on non-group target', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    const result = moveLayer('surface-1', 'surface-2', 'into', repository)

    expect(result).toBe(false)
  })
})
