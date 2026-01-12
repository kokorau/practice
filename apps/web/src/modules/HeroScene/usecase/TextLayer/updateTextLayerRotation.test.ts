import { describe, it, expect } from 'vitest'
import { updateTextLayerRotation } from './updateTextLayerRotation'
import { createHeroViewInMemoryRepository } from '../../Infra/HeroViewInMemoryRepository'
import type { HeroViewConfig, TextLayerNodeConfig } from '../../Domain/HeroViewConfig'

describe('updateTextLayerRotation', () => {
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
        type: 'text',
        id: 'text-1',
        name: 'Text Layer',
        visible: true,
        text: 'Test Text',
        fontFamily: 'sans-serif',
        fontSize: 48,
        fontWeight: 400,
        letterSpacing: 0,
        lineHeight: 1.2,
        color: '#000000',
        position: { x: 0.5, y: 0.5, anchor: 'center' },
        rotation: 0,
        processors: [],
      },
    ],
    foreground: { elements: [] },
  })

  it('should update rotation', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    const result = updateTextLayerRotation('text-1', Math.PI / 4, repository)

    expect(result).toBe(true)
    const layer = repository.get().layers[1] as TextLayerNodeConfig
    expect(layer.rotation).toBe(Math.PI / 4)
  })

  it('should accept negative rotation', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    updateTextLayerRotation('text-1', -Math.PI / 2, repository)

    const layer = repository.get().layers[1] as TextLayerNodeConfig
    expect(layer.rotation).toBe(-Math.PI / 2)
  })

  it('should accept zero rotation', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    // First set non-zero
    updateTextLayerRotation('text-1', Math.PI, repository)

    // Then reset to zero
    updateTextLayerRotation('text-1', 0, repository)

    const layer = repository.get().layers[1] as TextLayerNodeConfig
    expect(layer.rotation).toBe(0)
  })

  it('should return false for non-existent layer', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    const result = updateTextLayerRotation('non-existent', Math.PI, repository)

    expect(result).toBe(false)
  })

  it('should return false for non-text layer', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    const result = updateTextLayerRotation('base', Math.PI, repository)

    expect(result).toBe(false)
  })

  it('should not affect other properties', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    updateTextLayerRotation('text-1', Math.PI / 6, repository)

    const layer = repository.get().layers[1] as TextLayerNodeConfig
    expect(layer.text).toBe('Test Text')
    expect(layer.color).toBe('#000000')
    expect(layer.position).toEqual({ x: 0.5, y: 0.5, anchor: 'center' })
    expect(layer.fontSize).toBe(48)
  })
})
