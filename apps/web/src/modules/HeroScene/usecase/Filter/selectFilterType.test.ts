import { describe, it, expect } from 'vitest'
import { selectFilterType, getFilterType } from './selectFilterType'
import { createHeroViewInMemoryRepository } from '../../Infra/HeroViewInMemoryRepository'
import type { HeroViewConfig, BaseLayerNodeConfig, EffectProcessorConfig } from '../../Domain/HeroViewConfig'

describe('selectFilterType', () => {
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
        processors: [
          {
            type: 'effect',
            enabled: true,
            config: {
              vignette: { shape: 'ellipse', enabled: false, intensity: 0.5, softness: 0.4, color: [0, 0, 0, 1], radius: 0.8, centerX: 0.5, centerY: 0.5, aspectRatio: 1 },
              chromaticAberration: { enabled: false, intensity: 3 },
              dotHalftone: { enabled: false, dotSize: 8, spacing: 16, angle: 45 },
              lineHalftone: { enabled: false, lineWidth: 4, spacing: 12, angle: 45 },
            },
          },
        ],
      },
    ],
    foreground: { elements: [] },
  })

  it('should select vignette filter and disable others', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    selectFilterType(repository, 'base', 'vignette')

    const result = repository.get()
    const layer = result.layers[0] as BaseLayerNodeConfig
    const effectProcessor = layer.processors[0] as EffectProcessorConfig

    expect(effectProcessor.config.vignette.enabled).toBe(true)
    expect(effectProcessor.config.chromaticAberration.enabled).toBe(false)
    expect(effectProcessor.config.dotHalftone.enabled).toBe(false)
    expect(effectProcessor.config.lineHalftone.enabled).toBe(false)
  })

  it('should select chromaticAberration filter and disable others', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    selectFilterType(repository, 'base', 'chromaticAberration')

    const result = repository.get()
    const layer = result.layers[0] as BaseLayerNodeConfig
    const effectProcessor = layer.processors[0] as EffectProcessorConfig

    expect(effectProcessor.config.vignette.enabled).toBe(false)
    expect(effectProcessor.config.chromaticAberration.enabled).toBe(true)
    expect(effectProcessor.config.dotHalftone.enabled).toBe(false)
    expect(effectProcessor.config.lineHalftone.enabled).toBe(false)
  })

  it('should select dotHalftone filter and disable others', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    selectFilterType(repository, 'base', 'dotHalftone')

    const result = repository.get()
    const layer = result.layers[0] as BaseLayerNodeConfig
    const effectProcessor = layer.processors[0] as EffectProcessorConfig

    expect(effectProcessor.config.vignette.enabled).toBe(false)
    expect(effectProcessor.config.chromaticAberration.enabled).toBe(false)
    expect(effectProcessor.config.dotHalftone.enabled).toBe(true)
    expect(effectProcessor.config.lineHalftone.enabled).toBe(false)
  })

  it('should select lineHalftone filter and disable others', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    selectFilterType(repository, 'base', 'lineHalftone')

    const result = repository.get()
    const layer = result.layers[0] as BaseLayerNodeConfig
    const effectProcessor = layer.processors[0] as EffectProcessorConfig

    expect(effectProcessor.config.vignette.enabled).toBe(false)
    expect(effectProcessor.config.chromaticAberration.enabled).toBe(false)
    expect(effectProcessor.config.dotHalftone.enabled).toBe(false)
    expect(effectProcessor.config.lineHalftone.enabled).toBe(true)
  })

  it('should disable all filters when selecting void', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    // First enable a filter
    selectFilterType(repository, 'base', 'vignette')

    // Then select void
    selectFilterType(repository, 'base', 'void')

    const result = repository.get()
    const layer = result.layers[0] as BaseLayerNodeConfig
    const effectProcessor = layer.processors[0] as EffectProcessorConfig

    expect(effectProcessor.config.vignette.enabled).toBe(false)
    expect(effectProcessor.config.chromaticAberration.enabled).toBe(false)
    expect(effectProcessor.config.dotHalftone.enabled).toBe(false)
    expect(effectProcessor.config.lineHalftone.enabled).toBe(false)
  })

  it('should preserve other effect parameters when switching filter type', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    // First set vignette with custom params
    selectFilterType(repository, 'base', 'vignette')

    // Then switch to chromatic aberration
    selectFilterType(repository, 'base', 'chromaticAberration')

    const result = repository.get()
    const layer = result.layers[0] as BaseLayerNodeConfig
    const effectProcessor = layer.processors[0] as EffectProcessorConfig

    // Vignette params should be preserved (just disabled)
    expect(effectProcessor.config.vignette.intensity).toBe(0.5)
    // Check shape-specific params for ellipse
    const vignetteConfig = effectProcessor.config.vignette
    if (vignetteConfig.shape === 'ellipse') {
      expect(vignetteConfig.radius).toBe(0.8)
    }
  })

  it('should not modify anything for non-existent layer', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())
    const originalConfig = repository.get()

    selectFilterType(repository, 'non-existent', 'vignette')

    const result = repository.get()
    expect(result).toEqual(originalConfig)
  })
})

describe('getFilterType', () => {
  const createTestConfig = (enabledFilter?: 'vignette' | 'chromaticAberration' | 'dotHalftone' | 'lineHalftone'): HeroViewConfig => ({
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
        processors: [
          {
            type: 'effect',
            enabled: true,
            config: {
              vignette: { shape: 'ellipse', enabled: enabledFilter === 'vignette', intensity: 0.5, softness: 0.4, color: [0, 0, 0, 1], radius: 0.8, centerX: 0.5, centerY: 0.5, aspectRatio: 1 },
              chromaticAberration: { enabled: enabledFilter === 'chromaticAberration', intensity: 3 },
              dotHalftone: { enabled: enabledFilter === 'dotHalftone', dotSize: 8, spacing: 16, angle: 45 },
              lineHalftone: { enabled: enabledFilter === 'lineHalftone', lineWidth: 4, spacing: 12, angle: 45 },
            },
          },
        ],
      },
    ],
    foreground: { elements: [] },
  })

  it('should return void when no filter is enabled', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    expect(getFilterType(repository, 'base')).toBe('void')
  })

  it('should return vignette when vignette is enabled', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig('vignette'))

    expect(getFilterType(repository, 'base')).toBe('vignette')
  })

  it('should return chromaticAberration when chromaticAberration is enabled', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig('chromaticAberration'))

    expect(getFilterType(repository, 'base')).toBe('chromaticAberration')
  })

  it('should return dotHalftone when dotHalftone is enabled', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig('dotHalftone'))

    expect(getFilterType(repository, 'base')).toBe('dotHalftone')
  })

  it('should return lineHalftone when lineHalftone is enabled', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig('lineHalftone'))

    expect(getFilterType(repository, 'base')).toBe('lineHalftone')
  })

  it('should return void for non-existent layer', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig('vignette'))

    expect(getFilterType(repository, 'non-existent')).toBe('void')
  })
})
