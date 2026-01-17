import { describe, it, expect } from 'vitest'
import { applyPreset } from './applyPreset'
import { createHeroViewInMemoryRepository } from '../../Infra/HeroViewInMemoryRepository'
import type { HeroViewConfig } from '../../Domain/HeroViewConfig'
import type { HeroViewPreset } from '../../Domain/HeroViewPreset'

describe('applyPreset', () => {
  const createTestConfig = (): HeroViewConfig => ({
    viewport: { width: 1280, height: 720 },
    colors: {
      semanticContext: 'canvas',
    },
    layers: [],
    foreground: { elements: [] },
  })

  const createPresetConfig = (): HeroViewConfig => ({
    viewport: { width: 1920, height: 1080 },
    colors: {
      semanticContext: 'canvas',
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
    expect(result.layers).toHaveLength(1)
    expect(result.layers[0]?.id).toBe('preset-group')
  })

  it('should not write colorPreset to config.colors', () => {
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
    // colorPreset should NOT be written to config.colors
    // It's returned to the caller for UI state updates
    expect(result.colors).toEqual({ semanticContext: 'canvas' })
  })

  it('should preserve semanticContext from preset config', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())
    const presetConfig = createPresetConfig()
    presetConfig.colors.semanticContext = 'sectionTint'

    const preset: HeroViewPreset = {
      id: 'test-preset',
      name: 'Test Preset',
      config: presetConfig,
    }

    applyPreset(preset, repository)

    const result = repository.get()
    expect(result.colors.semanticContext).toBe('sectionTint')
  })
})
