import { describe, it, expect } from 'vitest'
import { updateTextLayerColor } from './updateTextLayerColor'
import { createHeroViewInMemoryRepository } from '../../Infra/HeroViewInMemoryRepository'
import type { HeroViewConfig, TextLayerNodeConfig } from '../../Domain/HeroViewConfig'

describe('updateTextLayerColor', () => {
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

  it('should update color', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    const result = updateTextLayerColor('text-1', '#ff0000', repository)

    expect(result).toBe(true)
    const layer = repository.get().layers[1] as TextLayerNodeConfig
    expect(layer.color).toBe('#ff0000')
  })

  it('should accept various color formats', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    updateTextLayerColor('text-1', 'rgb(255, 0, 0)', repository)
    let layer = repository.get().layers[1] as TextLayerNodeConfig
    expect(layer.color).toBe('rgb(255, 0, 0)')

    updateTextLayerColor('text-1', 'rgba(0, 255, 0, 0.5)', repository)
    layer = repository.get().layers[1] as TextLayerNodeConfig
    expect(layer.color).toBe('rgba(0, 255, 0, 0.5)')

    updateTextLayerColor('text-1', 'blue', repository)
    layer = repository.get().layers[1] as TextLayerNodeConfig
    expect(layer.color).toBe('blue')
  })

  it('should return false for non-existent layer', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    const result = updateTextLayerColor('non-existent', '#ff0000', repository)

    expect(result).toBe(false)
  })

  it('should return false for non-text layer', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    const result = updateTextLayerColor('base', '#ff0000', repository)

    expect(result).toBe(false)
  })

  it('should not affect other properties', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    updateTextLayerColor('text-1', '#ff0000', repository)

    const layer = repository.get().layers[1] as TextLayerNodeConfig
    expect(layer.text).toBe('Test Text')
    expect(layer.fontFamily).toBe('sans-serif')
    expect(layer.fontSize).toBe(48)
  })
})
