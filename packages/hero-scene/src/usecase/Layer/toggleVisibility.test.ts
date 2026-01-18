import { describe, it, expect } from 'vitest'
import { toggleVisibility } from './toggleVisibility'
import { createHeroViewInMemoryRepository } from '../../Infra/HeroViewInMemoryRepository'
import type { HeroViewConfig } from '../../Domain/HeroViewConfig'

describe('toggleVisibility', () => {
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

  it('should toggle visibility from true to false', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    const result = toggleVisibility('surface-1', repository)

    expect(result).toBe(false)
    const layer = repository.get().layers[1]
    expect(layer).toBeDefined()
    expect(layer!.visible).toBe(false)
  })

  it('should toggle visibility from false to true', () => {
    const config = createTestConfig()
    const layer = config.layers[1]
    expect(layer).toBeDefined()
    layer!.visible = false
    const repository = createHeroViewInMemoryRepository(config)

    const result = toggleVisibility('surface-1', repository)

    expect(result).toBe(true)
    const updatedLayer = repository.get().layers[1]
    expect(updatedLayer).toBeDefined()
    expect(updatedLayer!.visible).toBe(true)
  })

  it('should return null for non-existent layer', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    const result = toggleVisibility('non-existent', repository)

    expect(result).toBeNull()
  })

  it('should not affect other layers', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    toggleVisibility('surface-1', repository)

    const baseLayer = repository.get().layers[0]
    expect(baseLayer).toBeDefined()
    expect(baseLayer!.visible).toBe(true)
  })

  it('should toggle visibility for nested layer inside group', () => {
    const config: HeroViewConfig = {
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
          type: 'group',
          id: 'group-1',
          name: 'Group 1',
          visible: true,
          children: [
            {
              type: 'surface',
              id: 'nested-surface',
              name: 'Nested Surface',
              visible: true,
              surface: { id: 'solid', params: {} },
              processors: [],
            },
          ],
        },
      ],
      foreground: { elements: [] },
    }
    const repository = createHeroViewInMemoryRepository(config)

    const result = toggleVisibility('nested-surface', repository)

    expect(result).toBe(false)
    const group = repository.get().layers[0]
    expect(group?.type).toBe('group')
    if (group?.type === 'group') {
      expect(group.children[0]?.visible).toBe(false)
    }
  })

  it('should toggle visibility for deeply nested layer', () => {
    const config: HeroViewConfig = {
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
          type: 'group',
          id: 'outer-group',
          name: 'Outer Group',
          visible: true,
          children: [
            {
              type: 'group',
              id: 'inner-group',
              name: 'Inner Group',
              visible: true,
              children: [
                {
                  type: 'text',
                  id: 'deep-text',
                  name: 'Deep Text',
                  visible: true,
                  text: 'Hello',
                  fontFamily: 'sans-serif',
                  fontSize: 24,
                  fontWeight: 400,
                  letterSpacing: 0,
                  lineHeight: 1.2,
                  color: '#ffffff',
                  position: { x: 0.5, y: 0.5, anchor: 'center' },
                  rotation: 0,
                },
              ],
            },
          ],
        },
      ],
      foreground: { elements: [] },
    }
    const repository = createHeroViewInMemoryRepository(config)

    const result = toggleVisibility('deep-text', repository)

    expect(result).toBe(false)
    const outerGroup = repository.get().layers[0]
    expect(outerGroup?.type).toBe('group')
    if (outerGroup?.type === 'group') {
      const innerGroup = outerGroup.children[0]
      expect(innerGroup?.type).toBe('group')
      if (innerGroup?.type === 'group') {
        expect(innerGroup.children[0]?.visible).toBe(false)
      }
    }
  })
})
