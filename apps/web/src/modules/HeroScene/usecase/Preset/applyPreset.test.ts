import { describe, it, expect } from 'vitest'
import { applyPreset } from './applyPreset'
import { createHeroViewInMemoryRepository } from '../../Infra/HeroViewInMemoryRepository'
import type { HeroViewConfig } from '../../Domain/HeroViewConfig'
import type { HeroViewPreset } from '../../Domain/HeroViewPreset'

describe('applyPreset', () => {
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
    layers: [],
    foreground: { elements: [] },
  })

  const createPresetConfig = (): HeroViewConfig => ({
    viewport: { width: 1920, height: 1080 },
    colors: {
      background: { primary: 'F5', secondary: 'auto' },
      mask: { primary: 'auto', secondary: 'auto' },
      semanticContext: 'canvas',
      brand: { hue: 100, saturation: 50, value: 50 },
      accent: { hue: 200, saturation: 60, value: 70 },
      foundation: { hue: 10, saturation: 5, value: 95 },
    },
    layers: [
      {
        type: 'group',
        id: 'preset-group',
        name: 'Preset Group',
        visible: true,
        children: [],
        processors: [],
      },
    ],
    foreground: { elements: [] },
  })

  it('should apply preset config to repository', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())
    const preset: HeroViewPreset = {
      id: 'test-preset',
      name: 'Test Preset',
      config: createPresetConfig(),
    }

    applyPreset(preset, repository)

    const result = repository.get()
    expect(result.viewport.width).toBe(1920)
    expect(result.viewport.height).toBe(1080)
    expect(result.colors.background.primary).toBe('F5')
    expect(result.layers).toHaveLength(1)
    expect(result.layers[0]?.id).toBe('preset-group')
  })

  it('should apply color preset when available', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())
    const preset: HeroViewPreset = {
      id: 'test-preset',
      name: 'Test Preset',
      config: createPresetConfig(),
      colorPreset: {
        brand: { hue: 250, saturation: 80, value: 70 },
        accent: { hue: 350, saturation: 90, value: 80 },
        foundation: { hue: 20, saturation: 10, value: 98 },
      },
    }

    applyPreset(preset, repository)

    const result = repository.get()
    // Color preset should override config colors
    expect(result.colors.brand).toEqual({ hue: 250, saturation: 80, value: 70 })
    expect(result.colors.accent).toEqual({ hue: 350, saturation: 90, value: 80 })
    expect(result.colors.foundation).toEqual({ hue: 20, saturation: 10, value: 98 })
  })

  it('should not override colors when colorPreset is not provided', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())
    const preset: HeroViewPreset = {
      id: 'test-preset',
      name: 'Test Preset',
      config: createPresetConfig(),
      // No colorPreset
    }

    applyPreset(preset, repository)

    const result = repository.get()
    // Should use colors from config, not original
    expect(result.colors.brand).toEqual({ hue: 100, saturation: 50, value: 50 })
  })
})
