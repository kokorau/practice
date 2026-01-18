import { describe, it, expect } from 'vitest'
import { updateTextLayerText } from './updateTextLayerText'
import { createHeroViewInMemoryRepository } from '../../Infra/HeroViewInMemoryRepository'
import type { HeroViewConfig, TextLayerNodeConfig } from '../../Domain/HeroViewConfig'

describe('updateTextLayerText', () => {
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
        type: 'text',
        id: 'text-1',
        name: 'Text Layer',
        visible: true,
        text: 'Original Text',
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

  it('should update text content', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    const result = updateTextLayerText('text-1', 'New Text', repository)

    expect(result).toBe(true)
    const layer = repository.get().layers[1] as TextLayerNodeConfig
    expect(layer.text).toBe('New Text')
  })

  it('should return false for non-existent layer', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    const result = updateTextLayerText('non-existent', 'Test', repository)

    expect(result).toBe(false)
  })

  it('should return false for non-text layer', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    const result = updateTextLayerText('base', 'Test', repository)

    expect(result).toBe(false)
  })

  it('should not affect other properties', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    updateTextLayerText('text-1', 'Updated', repository)

    const layer = repository.get().layers[1] as TextLayerNodeConfig
    expect(layer.fontFamily).toBe('sans-serif')
    expect(layer.fontSize).toBe(48)
    expect(layer.color).toBe('#000000')
  })
})
