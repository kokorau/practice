import { describe, it, expect } from 'vitest'
import { updateTextLayerPosition } from './updateTextLayerPosition'
import { createHeroViewInMemoryRepository } from '../../Infra/HeroViewInMemoryRepository'
import type { HeroViewConfig, TextLayerNodeConfig } from '../../Domain/HeroViewConfig'

describe('updateTextLayerPosition', () => {
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

  it('should update x position', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    const result = updateTextLayerPosition('text-1', { x: 0.25 }, repository)

    expect(result).toBe(true)
    const layer = repository.get().layers[1] as TextLayerNodeConfig
    expect(layer.position.x).toBe(0.25)
    expect(layer.position.y).toBe(0.5) // unchanged
    expect(layer.position.anchor).toBe('center') // unchanged
  })

  it('should update y position', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    updateTextLayerPosition('text-1', { y: 0.75 }, repository)

    const layer = repository.get().layers[1] as TextLayerNodeConfig
    expect(layer.position.x).toBe(0.5) // unchanged
    expect(layer.position.y).toBe(0.75)
    expect(layer.position.anchor).toBe('center') // unchanged
  })

  it('should update anchor', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    updateTextLayerPosition('text-1', { anchor: 'top-left' }, repository)

    const layer = repository.get().layers[1] as TextLayerNodeConfig
    expect(layer.position.x).toBe(0.5) // unchanged
    expect(layer.position.y).toBe(0.5) // unchanged
    expect(layer.position.anchor).toBe('top-left')
  })

  it('should update multiple position properties at once', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    updateTextLayerPosition('text-1', {
      x: 0.1,
      y: 0.9,
      anchor: 'bottom-right',
    }, repository)

    const layer = repository.get().layers[1] as TextLayerNodeConfig
    expect(layer.position).toEqual({
      x: 0.1,
      y: 0.9,
      anchor: 'bottom-right',
    })
  })

  it('should merge with existing position values', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    // First update
    updateTextLayerPosition('text-1', { x: 0.2 }, repository)

    // Second update - y should merge with the existing x
    updateTextLayerPosition('text-1', { y: 0.8 }, repository)

    const layer = repository.get().layers[1] as TextLayerNodeConfig
    expect(layer.position).toEqual({
      x: 0.2,
      y: 0.8,
      anchor: 'center',
    })
  })

  it('should return false for non-existent layer', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    const result = updateTextLayerPosition('non-existent', { x: 0.5 }, repository)

    expect(result).toBe(false)
  })

  it('should return false for non-text layer', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    const result = updateTextLayerPosition('base', { x: 0.5 }, repository)

    expect(result).toBe(false)
  })

  it('should not affect other properties', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    updateTextLayerPosition('text-1', { x: 0.1, y: 0.9 }, repository)

    const layer = repository.get().layers[1] as TextLayerNodeConfig
    expect(layer.text).toBe('Test Text')
    expect(layer.color).toBe('#000000')
    expect(layer.rotation).toBe(0)
  })
})
