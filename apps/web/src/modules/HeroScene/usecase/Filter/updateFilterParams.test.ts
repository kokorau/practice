import { describe, it, expect } from 'vitest'
import {
  updateVignetteParams,
  updateChromaticAberrationParams,
  updateDotHalftoneParams,
  updateLineHalftoneParams,
  getVignetteParams,
  getChromaticAberrationParams,
  getDotHalftoneParams,
  getLineHalftoneParams,
} from './updateFilterParams'
import { createHeroViewInMemoryRepository } from '../../Infra/HeroViewInMemoryRepository'
import type { HeroViewConfig, BaseLayerNodeConfig, EffectProcessorConfig } from '../../Domain/HeroViewConfig'

describe('updateFilterParams', () => {
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
              vignette: { shape: 'ellipse', enabled: true, intensity: 0.5, softness: 0.4, color: [0, 0, 0, 1], radius: 0.8, centerX: 0.5, centerY: 0.5, aspectRatio: 1 },
              chromaticAberration: { enabled: false, intensity: 3 },
              dotHalftone: { enabled: false, dotSize: 8, spacing: 16, angle: 45 },
              lineHalftone: { enabled: false, lineWidth: 4, spacing: 12, angle: 45 },
              blur: { enabled: false, radius: 8 },
            },
          },
        ],
      },
    ],
    foreground: { elements: [] },
  })

  describe('updateVignetteParams', () => {
    it('should update vignette intensity', () => {
      const repository = createHeroViewInMemoryRepository(createTestConfig())

      updateVignetteParams(repository, 'base', { intensity: 0.8 })

      const result = repository.get()
      const layer = result.layers[0] as BaseLayerNodeConfig
      const effectProcessor = (layer.processors ?? [])[0] as EffectProcessorConfig

      expect(effectProcessor.config.vignette.intensity).toBe(0.8)
      // Check shape-specific params for ellipse
      const vignetteConfig = effectProcessor.config.vignette
      if (vignetteConfig.shape === 'ellipse') {
        expect(vignetteConfig.radius).toBe(0.8) // unchanged
      }
      expect(effectProcessor.config.vignette.softness).toBe(0.4) // unchanged
    })

    it('should update multiple vignette params', () => {
      const repository = createHeroViewInMemoryRepository(createTestConfig())

      updateVignetteParams(repository, 'base', { intensity: 0.9, radius: 1.0, softness: 0.6 })

      const result = repository.get()
      const layer = result.layers[0] as BaseLayerNodeConfig
      const effectProcessor = (layer.processors ?? [])[0] as EffectProcessorConfig

      expect(effectProcessor.config.vignette.intensity).toBe(0.9)
      // Check shape-specific params for ellipse
      const vignetteConfig = effectProcessor.config.vignette
      if (vignetteConfig.shape === 'ellipse') {
        expect(vignetteConfig.radius).toBe(1.0)
      }
      expect(effectProcessor.config.vignette.softness).toBe(0.6)
    })

    it('should preserve enabled state when updating params', () => {
      const repository = createHeroViewInMemoryRepository(createTestConfig())

      updateVignetteParams(repository, 'base', { intensity: 0.7 })

      const result = repository.get()
      const layer = result.layers[0] as BaseLayerNodeConfig
      const effectProcessor = (layer.processors ?? [])[0] as EffectProcessorConfig

      expect(effectProcessor.config.vignette.enabled).toBe(true)
    })
  })

  describe('updateChromaticAberrationParams', () => {
    it('should update chromatic aberration intensity', () => {
      const repository = createHeroViewInMemoryRepository(createTestConfig())

      updateChromaticAberrationParams(repository, 'base', { intensity: 10 })

      const result = repository.get()
      const layer = result.layers[0] as BaseLayerNodeConfig
      const effectProcessor = (layer.processors ?? [])[0] as EffectProcessorConfig

      expect(effectProcessor.config.chromaticAberration.intensity).toBe(10)
    })
  })

  describe('updateDotHalftoneParams', () => {
    it('should update dot halftone params', () => {
      const repository = createHeroViewInMemoryRepository(createTestConfig())

      updateDotHalftoneParams(repository, 'base', { dotSize: 12, spacing: 20, angle: 30 })

      const result = repository.get()
      const layer = result.layers[0] as BaseLayerNodeConfig
      const effectProcessor = (layer.processors ?? [])[0] as EffectProcessorConfig

      expect(effectProcessor.config.dotHalftone.dotSize).toBe(12)
      expect(effectProcessor.config.dotHalftone.spacing).toBe(20)
      expect(effectProcessor.config.dotHalftone.angle).toBe(30)
    })
  })

  describe('updateLineHalftoneParams', () => {
    it('should update line halftone params', () => {
      const repository = createHeroViewInMemoryRepository(createTestConfig())

      updateLineHalftoneParams(repository, 'base', { lineWidth: 8, spacing: 24, angle: 60 })

      const result = repository.get()
      const layer = result.layers[0] as BaseLayerNodeConfig
      const effectProcessor = (layer.processors ?? [])[0] as EffectProcessorConfig

      expect(effectProcessor.config.lineHalftone.lineWidth).toBe(8)
      expect(effectProcessor.config.lineHalftone.spacing).toBe(24)
      expect(effectProcessor.config.lineHalftone.angle).toBe(60)
    })
  })

  describe('non-existent layer', () => {
    it('should not modify anything for non-existent layer', () => {
      const repository = createHeroViewInMemoryRepository(createTestConfig())
      const originalConfig = repository.get()

      updateVignetteParams(repository, 'non-existent', { intensity: 1.0 })

      const result = repository.get()
      expect(result).toEqual(originalConfig)
    })
  })
})

describe('getFilterParams', () => {
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
              vignette: { shape: 'ellipse', enabled: true, intensity: 0.5, softness: 0.4, color: [0, 0, 0, 1], radius: 0.8, centerX: 0.5, centerY: 0.5, aspectRatio: 1 },
              chromaticAberration: { enabled: false, intensity: 3 },
              dotHalftone: { enabled: false, dotSize: 8, spacing: 16, angle: 45 },
              lineHalftone: { enabled: false, lineWidth: 4, spacing: 12, angle: 45 },
              blur: { enabled: false, radius: 8 },
            },
          },
        ],
      },
    ],
    foreground: { elements: [] },
  })

  describe('getVignetteParams', () => {
    it('should return vignette params', () => {
      const repository = createHeroViewInMemoryRepository(createTestConfig())

      const params = getVignetteParams(repository, 'base')

      expect(params).toEqual({
        shape: 'ellipse',
        enabled: true,
        intensity: 0.5,
        softness: 0.4,
        color: [0, 0, 0, 1],
        radius: 0.8,
        centerX: 0.5,
        centerY: 0.5,
        aspectRatio: 1,
      })
    })

    it('should return undefined for non-existent layer', () => {
      const repository = createHeroViewInMemoryRepository(createTestConfig())

      const params = getVignetteParams(repository, 'non-existent')

      expect(params).toBeUndefined()
    })
  })

  describe('getChromaticAberrationParams', () => {
    it('should return chromatic aberration params', () => {
      const repository = createHeroViewInMemoryRepository(createTestConfig())

      const params = getChromaticAberrationParams(repository, 'base')

      expect(params).toEqual({
        enabled: false,
        intensity: 3,
      })
    })
  })

  describe('getDotHalftoneParams', () => {
    it('should return dot halftone params', () => {
      const repository = createHeroViewInMemoryRepository(createTestConfig())

      const params = getDotHalftoneParams(repository, 'base')

      expect(params).toEqual({
        enabled: false,
        dotSize: 8,
        spacing: 16,
        angle: 45,
      })
    })
  })

  describe('getLineHalftoneParams', () => {
    it('should return line halftone params', () => {
      const repository = createHeroViewInMemoryRepository(createTestConfig())

      const params = getLineHalftoneParams(repository, 'base')

      expect(params).toEqual({
        enabled: false,
        lineWidth: 4,
        spacing: 12,
        angle: 45,
      })
    })
  })
})
