import { describe, it, expect } from 'vitest'
import { updateTextLayerFont } from './updateTextLayerFont'
import { createHeroViewInMemoryRepository } from '../../Infra/HeroViewInMemoryRepository'
import type { HeroViewConfig, TextLayerNodeConfig } from '../../Domain/HeroViewConfig'

describe('updateTextLayerFont', () => {
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

  it('should update fontFamily', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    const result = updateTextLayerFont('text-1', { fontFamily: 'serif' }, repository)

    expect(result).toBe(true)
    const layer = repository.get().layers[1] as TextLayerNodeConfig
    expect(layer.fontFamily).toBe('serif')
  })

  it('should update fontSize', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    updateTextLayerFont('text-1', { fontSize: 72 }, repository)

    const layer = repository.get().layers[1] as TextLayerNodeConfig
    expect(layer.fontSize).toBe(72)
  })

  it('should update fontWeight', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    updateTextLayerFont('text-1', { fontWeight: 700 }, repository)

    const layer = repository.get().layers[1] as TextLayerNodeConfig
    expect(layer.fontWeight).toBe(700)
  })

  it('should update letterSpacing', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    updateTextLayerFont('text-1', { letterSpacing: 0.1 }, repository)

    const layer = repository.get().layers[1] as TextLayerNodeConfig
    expect(layer.letterSpacing).toBe(0.1)
  })

  it('should update lineHeight', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    updateTextLayerFont('text-1', { lineHeight: 1.5 }, repository)

    const layer = repository.get().layers[1] as TextLayerNodeConfig
    expect(layer.lineHeight).toBe(1.5)
  })

  it('should update multiple font properties at once', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    updateTextLayerFont('text-1', {
      fontFamily: 'monospace',
      fontSize: 24,
      fontWeight: 600,
    }, repository)

    const layer = repository.get().layers[1] as TextLayerNodeConfig
    expect(layer.fontFamily).toBe('monospace')
    expect(layer.fontSize).toBe(24)
    expect(layer.fontWeight).toBe(600)
  })

  it('should return true for empty params', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    const result = updateTextLayerFont('text-1', {}, repository)

    expect(result).toBe(true)
  })

  it('should return false for non-existent layer', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    const result = updateTextLayerFont('non-existent', { fontSize: 72 }, repository)

    expect(result).toBe(false)
  })

  it('should return false for non-text layer', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    const result = updateTextLayerFont('base', { fontSize: 72 }, repository)

    expect(result).toBe(false)
  })

  it('should not affect non-font properties', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    updateTextLayerFont('text-1', { fontSize: 72 }, repository)

    const layer = repository.get().layers[1] as TextLayerNodeConfig
    expect(layer.text).toBe('Test Text')
    expect(layer.color).toBe('#000000')
    expect(layer.position).toEqual({ x: 0.5, y: 0.5, anchor: 'center' })
  })
})
