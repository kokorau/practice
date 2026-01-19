import { describe, it, expect } from 'vitest'
import {
  // Surface normalization
  SURFACE_TYPES,
  isNormalizedSurfaceConfig,
  normalizeSurfaceConfig,
  getSurfaceAsNormalized,
  // Mask normalization
  MASK_SHAPE_TYPE_IDS,
  isNormalizedMaskConfig,
  normalizeMaskConfig,
  getMaskAsNormalized,
  // Effect normalization
  EFFECT_TYPES,
  isEffectOfType,
  isVignetteEffect,
  isChromaticAberrationEffect,
  isDotHalftoneEffect,
  isLineHalftoneEffect,
  isBlurEffect,
  createSingleEffectConfig,
  extractEnabledEffects,
  denormalizeToLayerEffectConfig,
  // Types
  type NormalizedSurfaceConfig,
  type NormalizedMaskConfig,
  type SingleEffectConfig,
  type LayerEffectConfig,
} from './index'
// Internal imports for denormalize functions and legacy type guards (used in tests only)
import {
  type SurfaceConfig,
  type MaskShapeConfig,
  isLegacyTypeSurfaceConfig,
  isLegacyTypeMaskConfig,
  denormalizeSurfaceConfig,
  getSurfaceAsLegacy,
  denormalizeMaskConfig,
  getMaskAsLegacy,
} from './HeroViewConfig'

describe('Surface Config Normalization', () => {
  describe('SURFACE_TYPES', () => {
    it('should contain all expected surface types', () => {
      expect(SURFACE_TYPES).toContain('solid')
      expect(SURFACE_TYPES).toContain('stripe')
      expect(SURFACE_TYPES).toContain('grid')
      expect(SURFACE_TYPES).toContain('polkaDot')
      expect(SURFACE_TYPES).toContain('checker')
      expect(SURFACE_TYPES).toContain('image')
      expect(SURFACE_TYPES).toContain('gradientGrain')
      expect(SURFACE_TYPES).toContain('triangle')
      expect(SURFACE_TYPES).toContain('hexagon')
      expect(SURFACE_TYPES).toContain('asanoha')
      expect(SURFACE_TYPES).toContain('seigaiha')
      expect(SURFACE_TYPES).toContain('wave')
      expect(SURFACE_TYPES).toContain('scales')
      expect(SURFACE_TYPES).toContain('ogee')
      expect(SURFACE_TYPES).toContain('sunburst')
      expect(SURFACE_TYPES).toHaveLength(15)
    })
  })

  describe('isNormalizedSurfaceConfig', () => {
    it('should return true for normalized config', () => {
      const normalized: NormalizedSurfaceConfig = {
        id: 'stripe',
        params: { width1: 20, width2: 20, angle: 45 },
      }
      expect(isNormalizedSurfaceConfig(normalized)).toBe(true)
    })

    it('should return false for legacy config', () => {
      const legacy: SurfaceConfig = { type: 'stripe', width1: 20, width2: 20, angle: 45 }
      expect(isNormalizedSurfaceConfig(legacy)).toBe(false)
    })
  })

  describe('isLegacyTypeSurfaceConfig', () => {
    it('should return true for legacy config', () => {
      const legacy: SurfaceConfig = { type: 'stripe', width1: 20, width2: 20, angle: 45 }
      expect(isLegacyTypeSurfaceConfig(legacy)).toBe(true)
    })

    it('should return false for normalized config', () => {
      const normalized: NormalizedSurfaceConfig = {
        id: 'stripe',
        params: { width1: 20, width2: 20, angle: 45 },
      }
      expect(isLegacyTypeSurfaceConfig(normalized)).toBe(false)
    })
  })

  describe('normalizeSurfaceConfig', () => {
    it('should convert stripe config', () => {
      const legacy: SurfaceConfig = { type: 'stripe', width1: 20, width2: 30, angle: 45 }
      const result = normalizeSurfaceConfig(legacy)

      expect(result.id).toBe('stripe')
      expect(result.params).toEqual({ width1: 20, width2: 30, angle: 45 })
    })

    it('should convert solid config', () => {
      const legacy: SurfaceConfig = { type: 'solid' }
      const result = normalizeSurfaceConfig(legacy)

      expect(result.id).toBe('solid')
      expect(result.params).toEqual({})
    })

    it('should convert grid config', () => {
      const legacy: SurfaceConfig = { type: 'grid', lineWidth: 2, cellSize: 32 }
      const result = normalizeSurfaceConfig(legacy)

      expect(result.id).toBe('grid')
      expect(result.params).toEqual({ lineWidth: 2, cellSize: 32 })
    })
  })

  describe('denormalizeSurfaceConfig', () => {
    it('should convert normalized stripe config', () => {
      const normalized: NormalizedSurfaceConfig = {
        id: 'stripe',
        params: { width1: 20, width2: 30, angle: 45 },
      }
      const result = denormalizeSurfaceConfig(normalized)

      expect(result).toEqual({ type: 'stripe', width1: 20, width2: 30, angle: 45 })
    })

    it('should convert normalized solid config', () => {
      const normalized: NormalizedSurfaceConfig = { id: 'solid', params: {} }
      const result = denormalizeSurfaceConfig(normalized)

      expect(result).toEqual({ type: 'solid' })
    })
  })

  describe('getSurfaceAsNormalized', () => {
    it('should pass through normalized config', () => {
      const normalized: NormalizedSurfaceConfig = {
        id: 'stripe',
        params: { width1: 20, width2: 20, angle: 45 },
      }
      const result = getSurfaceAsNormalized(normalized)
      expect(result).toEqual(normalized)
    })

    it('should convert legacy config', () => {
      const legacy: SurfaceConfig = { type: 'stripe', width1: 20, width2: 20, angle: 45 }
      const result = getSurfaceAsNormalized(legacy)

      expect(result.id).toBe('stripe')
      expect(result.params).toEqual({ width1: 20, width2: 20, angle: 45 })
    })
  })

  describe('getSurfaceAsLegacy', () => {
    it('should pass through legacy config', () => {
      const legacy: SurfaceConfig = { type: 'stripe', width1: 20, width2: 20, angle: 45 }
      const result = getSurfaceAsLegacy(legacy)
      expect(result).toEqual(legacy)
    })

    it('should convert normalized config', () => {
      const normalized: NormalizedSurfaceConfig = {
        id: 'stripe',
        params: { width1: 20, width2: 20, angle: 45 },
      }
      const result = getSurfaceAsLegacy(normalized)

      expect(result).toEqual({ type: 'stripe', width1: 20, width2: 20, angle: 45 })
    })
  })

  describe('Round-trip conversion', () => {
    it('should preserve stripe config through round-trip', () => {
      const original: SurfaceConfig = { type: 'stripe', width1: 15, width2: 25, angle: 30 }
      const normalized = normalizeSurfaceConfig(original)
      const denormalized = denormalizeSurfaceConfig(normalized)

      expect(denormalized).toEqual(original)
    })

    it('should preserve polkaDot config through round-trip', () => {
      const original: SurfaceConfig = { type: 'polkaDot', dotRadius: 10, spacing: 20, rowOffset: 0.5 }
      const normalized = normalizeSurfaceConfig(original)
      const denormalized = denormalizeSurfaceConfig(normalized)

      expect(denormalized).toEqual(original)
    })
  })
})

describe('Mask Config Normalization', () => {
  describe('MASK_SHAPE_TYPE_IDS', () => {
    it('should contain all expected mask shape types', () => {
      expect(MASK_SHAPE_TYPE_IDS).toContain('circle')
      expect(MASK_SHAPE_TYPE_IDS).toContain('rect')
      expect(MASK_SHAPE_TYPE_IDS).toContain('blob')
      expect(MASK_SHAPE_TYPE_IDS).toContain('perlin')
      expect(MASK_SHAPE_TYPE_IDS).toContain('linearGradient')
      expect(MASK_SHAPE_TYPE_IDS).toContain('radialGradient')
      expect(MASK_SHAPE_TYPE_IDS).toContain('boxGradient')
      expect(MASK_SHAPE_TYPE_IDS).toContain('wavyLine')
      expect(MASK_SHAPE_TYPE_IDS).toHaveLength(8)
    })
  })

  describe('isNormalizedMaskConfig', () => {
    it('should return true for normalized config', () => {
      const normalized: NormalizedMaskConfig = {
        id: 'circle',
        params: { centerX: 0.5, centerY: 0.5, radius: 0.3, cutout: true },
      }
      expect(isNormalizedMaskConfig(normalized)).toBe(true)
    })

    it('should return false for legacy config', () => {
      const legacy: MaskShapeConfig = {
        type: 'circle',
        centerX: 0.5,
        centerY: 0.5,
        radius: 0.3,
        cutout: true,
      }
      expect(isNormalizedMaskConfig(legacy)).toBe(false)
    })
  })

  describe('isLegacyTypeMaskConfig', () => {
    it('should return true for legacy config', () => {
      const legacy: MaskShapeConfig = {
        type: 'circle',
        centerX: 0.5,
        centerY: 0.5,
        radius: 0.3,
        cutout: true,
      }
      expect(isLegacyTypeMaskConfig(legacy)).toBe(true)
    })

    it('should return false for normalized config', () => {
      const normalized: NormalizedMaskConfig = {
        id: 'circle',
        params: { centerX: 0.5, centerY: 0.5, radius: 0.3, cutout: true },
      }
      expect(isLegacyTypeMaskConfig(normalized)).toBe(false)
    })
  })

  describe('normalizeMaskConfig', () => {
    it('should convert circle config', () => {
      const legacy: MaskShapeConfig = {
        type: 'circle',
        centerX: 0.5,
        centerY: 0.5,
        radius: 0.3,
        cutout: true,
      }
      const result = normalizeMaskConfig(legacy)

      expect(result.id).toBe('circle')
      expect(result.params).toEqual({ centerX: 0.5, centerY: 0.5, radius: 0.3, cutout: true })
    })

    it('should convert rect config', () => {
      const legacy: MaskShapeConfig = {
        type: 'rect',
        left: 0.1,
        right: 0.9,
        top: 0.1,
        bottom: 0.9,
        radiusTopLeft: 0,
        radiusTopRight: 0,
        radiusBottomLeft: 0,
        radiusBottomRight: 0,
        rotation: 0,
        perspectiveX: 0,
        perspectiveY: 0,
        cutout: false,
      }
      const result = normalizeMaskConfig(legacy)

      expect(result.id).toBe('rect')
      expect(result.params).toEqual({
        left: 0.1,
        right: 0.9,
        top: 0.1,
        bottom: 0.9,
        radiusTopLeft: 0,
        radiusTopRight: 0,
        radiusBottomLeft: 0,
        radiusBottomRight: 0,
        rotation: 0,
        perspectiveX: 0,
        perspectiveY: 0,
        cutout: false,
      })
    })

    it('should convert linearGradient config', () => {
      const legacy: MaskShapeConfig = {
        type: 'linearGradient',
        angle: 90,
        startOffset: 0,
        endOffset: 1,
        cutout: false,
      }
      const result = normalizeMaskConfig(legacy)

      expect(result.id).toBe('linearGradient')
      expect(result.params).toEqual({
        angle: 90,
        startOffset: 0,
        endOffset: 1,
        cutout: false,
      })
    })
  })

  describe('denormalizeMaskConfig', () => {
    it('should convert normalized circle config', () => {
      const normalized: NormalizedMaskConfig = {
        id: 'circle',
        params: { centerX: 0.5, centerY: 0.5, radius: 0.3, cutout: true },
      }
      const result = denormalizeMaskConfig(normalized)

      expect(result).toEqual({
        type: 'circle',
        centerX: 0.5,
        centerY: 0.5,
        radius: 0.3,
        cutout: true,
      })
    })

    it('should convert normalized boxGradient config', () => {
      const normalized: NormalizedMaskConfig = {
        id: 'boxGradient',
        params: {
          left: 0.1,
          right: 0.1,
          top: 0.1,
          bottom: 0.1,
          cornerRadius: 0.05,
          curve: 'smooth',
          cutout: false,
        },
      }
      const result = denormalizeMaskConfig(normalized)

      expect(result).toEqual({
        type: 'boxGradient',
        left: 0.1,
        right: 0.1,
        top: 0.1,
        bottom: 0.1,
        cornerRadius: 0.05,
        curve: 'smooth',
        cutout: false,
      })
    })
  })

  describe('getMaskAsNormalized', () => {
    it('should pass through normalized config', () => {
      const normalized: NormalizedMaskConfig = {
        id: 'circle',
        params: { centerX: 0.5, centerY: 0.5, radius: 0.3, cutout: true },
      }
      const result = getMaskAsNormalized(normalized)
      expect(result).toEqual(normalized)
    })

    it('should convert legacy config', () => {
      const legacy: MaskShapeConfig = {
        type: 'circle',
        centerX: 0.5,
        centerY: 0.5,
        radius: 0.3,
        cutout: true,
      }
      const result = getMaskAsNormalized(legacy)

      expect(result.id).toBe('circle')
      expect(result.params).toEqual({ centerX: 0.5, centerY: 0.5, radius: 0.3, cutout: true })
    })
  })

  describe('getMaskAsLegacy', () => {
    it('should pass through legacy config', () => {
      const legacy: MaskShapeConfig = {
        type: 'circle',
        centerX: 0.5,
        centerY: 0.5,
        radius: 0.3,
        cutout: true,
      }
      const result = getMaskAsLegacy(legacy)
      expect(result).toEqual(legacy)
    })

    it('should convert normalized config', () => {
      const normalized: NormalizedMaskConfig = {
        id: 'circle',
        params: { centerX: 0.5, centerY: 0.5, radius: 0.3, cutout: true },
      }
      const result = getMaskAsLegacy(normalized)

      expect(result).toEqual({
        type: 'circle',
        centerX: 0.5,
        centerY: 0.5,
        radius: 0.3,
        cutout: true,
      })
    })
  })

  describe('Round-trip conversion', () => {
    it('should preserve circle config through round-trip', () => {
      const original: MaskShapeConfig = {
        type: 'circle',
        centerX: 0.5,
        centerY: 0.5,
        radius: 0.3,
        cutout: true,
      }
      const normalized = normalizeMaskConfig(original)
      const denormalized = denormalizeMaskConfig(normalized)

      expect(denormalized).toEqual(original)
    })

    it('should preserve blob config through round-trip', () => {
      const original: MaskShapeConfig = {
        type: 'blob',
        centerX: 0.5,
        centerY: 0.5,
        baseRadius: 0.3,
        amplitude: 0.1,
        octaves: 4,
        seed: 42,
        cutout: false,
      }
      const normalized = normalizeMaskConfig(original)
      const denormalized = denormalizeMaskConfig(normalized)

      expect(denormalized).toEqual(original)
    })

    it('should preserve perlin config through round-trip', () => {
      const original: MaskShapeConfig = {
        type: 'perlin',
        seed: 123,
        threshold: 0.5,
        scale: 4,
        octaves: 3,
        cutout: true,
      }
      const normalized = normalizeMaskConfig(original)
      const denormalized = denormalizeMaskConfig(normalized)

      expect(denormalized).toEqual(original)
    })

    it('should preserve radialGradient config through round-trip', () => {
      const original: MaskShapeConfig = {
        type: 'radialGradient',
        centerX: 0.5,
        centerY: 0.5,
        innerRadius: 0.1,
        outerRadius: 0.5,
        aspectRatio: 1.0,
        cutout: false,
      }
      const normalized = normalizeMaskConfig(original)
      const denormalized = denormalizeMaskConfig(normalized)

      expect(denormalized).toEqual(original)
    })
  })
})

describe('Effect Config Normalization', () => {
  describe('EFFECT_TYPES', () => {
    it('should contain all expected effect types', () => {
      expect(EFFECT_TYPES).toContain('vignette')
      expect(EFFECT_TYPES).toContain('chromaticAberration')
      expect(EFFECT_TYPES).toContain('dotHalftone')
      expect(EFFECT_TYPES).toContain('lineHalftone')
      expect(EFFECT_TYPES).toContain('blur')
      expect(EFFECT_TYPES).toHaveLength(5)
    })
  })

  describe('Effect type guards', () => {
    const vignetteEffect: SingleEffectConfig = {
      type: 'effect',
      id: 'vignette',
      params: { intensity: 0.5 },
    }

    const blurEffect: SingleEffectConfig = {
      type: 'effect',
      id: 'blur',
      params: { radius: 8 },
    }

    describe('isEffectOfType', () => {
      it('should return true for matching effect type', () => {
        expect(isEffectOfType(vignetteEffect, 'vignette')).toBe(true)
        expect(isEffectOfType(blurEffect, 'blur')).toBe(true)
      })

      it('should return false for non-matching effect type', () => {
        expect(isEffectOfType(vignetteEffect, 'blur')).toBe(false)
        expect(isEffectOfType(blurEffect, 'vignette')).toBe(false)
      })
    })

    describe('individual type guards', () => {
      it('isVignetteEffect should work correctly', () => {
        expect(isVignetteEffect(vignetteEffect)).toBe(true)
        expect(isVignetteEffect(blurEffect)).toBe(false)
      })

      it('isBlurEffect should work correctly', () => {
        expect(isBlurEffect(blurEffect)).toBe(true)
        expect(isBlurEffect(vignetteEffect)).toBe(false)
      })

      it('isChromaticAberrationEffect should work correctly', () => {
        const caEffect: SingleEffectConfig = {
          type: 'effect',
          id: 'chromaticAberration',
          params: { intensity: 3 },
        }
        expect(isChromaticAberrationEffect(caEffect)).toBe(true)
        expect(isChromaticAberrationEffect(blurEffect)).toBe(false)
      })

      it('isDotHalftoneEffect should work correctly', () => {
        const dotEffect: SingleEffectConfig = {
          type: 'effect',
          id: 'dotHalftone',
          params: { dotSize: 8, spacing: 16, angle: 45 },
        }
        expect(isDotHalftoneEffect(dotEffect)).toBe(true)
        expect(isDotHalftoneEffect(blurEffect)).toBe(false)
      })

      it('isLineHalftoneEffect should work correctly', () => {
        const lineEffect: SingleEffectConfig = {
          type: 'effect',
          id: 'lineHalftone',
          params: { lineWidth: 4, spacing: 12, angle: 45 },
        }
        expect(isLineHalftoneEffect(lineEffect)).toBe(true)
        expect(isLineHalftoneEffect(blurEffect)).toBe(false)
      })
    })
  })

  describe('createSingleEffectConfig', () => {
    it('should create blur effect with default params', () => {
      const effect = createSingleEffectConfig('blur')

      expect(effect.type).toBe('effect')
      expect(effect.id).toBe('blur')
      expect(effect.params).toHaveProperty('radius')
      expect(effect.params).not.toHaveProperty('enabled')
    })

    it('should create blur effect with custom params', () => {
      const effect = createSingleEffectConfig('blur', { radius: 16 })

      expect(effect.type).toBe('effect')
      expect(effect.id).toBe('blur')
      expect(effect.params.radius).toBe(16)
    })

    it('should create vignette effect with default params', () => {
      const effect = createSingleEffectConfig('vignette')

      expect(effect.type).toBe('effect')
      expect(effect.id).toBe('vignette')
      expect(effect.params).not.toHaveProperty('enabled')
    })

    it('should create chromatic aberration effect', () => {
      const effect = createSingleEffectConfig('chromaticAberration', { intensity: 5 })

      expect(effect.type).toBe('effect')
      expect(effect.id).toBe('chromaticAberration')
      expect(effect.params.intensity).toBe(5)
    })
  })

  describe('extractEnabledEffects', () => {
    it('should extract enabled effects from LayerEffectConfig', () => {
      const legacyConfig = {
        vignette: { enabled: true, shape: 'ellipse', intensity: 0.5, softness: 0.4, radius: 0.8, centerX: 0.5, centerY: 0.5, aspectRatio: 1, color: [0, 0, 0, 1] },
        blur: { enabled: true, radius: 8 },
        chromaticAberration: { enabled: false, intensity: 3 },
        dotHalftone: { enabled: false, dotSize: 8, spacing: 16, angle: 45 },
        lineHalftone: { enabled: false, lineWidth: 4, spacing: 12, angle: 45 },
      } as LayerEffectConfig

      const effects = extractEnabledEffects(legacyConfig)

      expect(effects).toHaveLength(2)
      expect(effects[0]!.id).toBe('vignette')
      expect(effects[0]!.params).not.toHaveProperty('enabled')
      expect(effects[1]!.id).toBe('blur')
      expect(effects[1]!.params.radius).toBe(8)
    })

    it('should return empty array when no effects are enabled', () => {
      const legacyConfig = {
        vignette: { enabled: false, shape: 'ellipse', intensity: 0.5, softness: 0.4, radius: 0.8, centerX: 0.5, centerY: 0.5, aspectRatio: 1, color: [0, 0, 0, 1] },
        blur: { enabled: false, radius: 8 },
        chromaticAberration: { enabled: false, intensity: 3 },
        dotHalftone: { enabled: false, dotSize: 8, spacing: 16, angle: 45 },
        lineHalftone: { enabled: false, lineWidth: 4, spacing: 12, angle: 45 },
      } as LayerEffectConfig

      const effects = extractEnabledEffects(legacyConfig)

      expect(effects).toHaveLength(0)
    })
  })

  describe('denormalizeToLayerEffectConfig', () => {
    it('should convert SingleEffectConfig[] to LayerEffectConfig', () => {
      const effects: SingleEffectConfig[] = [
        { type: 'effect', id: 'blur', params: { radius: 16 } },
        { type: 'effect', id: 'vignette', params: { intensity: 0.7, softness: 0.5 } },
      ]

      const legacyConfig = denormalizeToLayerEffectConfig(effects)

      expect(legacyConfig.blur.enabled).toBe(true)
      expect(legacyConfig.blur.radius).toBe(16)
      expect(legacyConfig.vignette.enabled).toBe(true)
      expect(legacyConfig.vignette.intensity).toBe(0.7)
      // Other effects should have default values
      expect(legacyConfig.chromaticAberration.enabled).toBe(false)
    })

    it('should return default config for empty array', () => {
      const effects: SingleEffectConfig[] = []

      const legacyConfig = denormalizeToLayerEffectConfig(effects)

      expect(legacyConfig.blur.enabled).toBe(false)
      expect(legacyConfig.vignette.enabled).toBe(false)
      expect(legacyConfig.chromaticAberration.enabled).toBe(false)
    })
  })

  describe('Round-trip conversion', () => {
    it('should preserve effect params through round-trip (partial)', () => {
      // Note: Round-trip is lossy because legacy format bundles all effects
      // and we only extract enabled ones
      const effects: SingleEffectConfig[] = [
        { type: 'effect', id: 'blur', params: { radius: 16 } },
      ]

      const legacy = denormalizeToLayerEffectConfig(effects)
      const normalized = extractEnabledEffects(legacy)

      expect(normalized).toHaveLength(1)
      expect(normalized[0]!.id).toBe('blur')
      expect(normalized[0]!.params.radius).toBe(16)
    })
  })
})
