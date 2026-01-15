import { describe, it, expect } from 'vitest'
import {
  // Surface normalization
  SURFACE_TYPES,
  isNormalizedSurfaceConfig,
  isLegacyTypeSurfaceConfig,
  normalizeSurfaceConfig,
  denormalizeSurfaceConfig,
  getSurfaceAsNormalized,
  getSurfaceAsLegacy,
  // Mask normalization
  MASK_SHAPE_TYPE_IDS,
  isNormalizedMaskConfig,
  isLegacyTypeMaskConfig,
  normalizeMaskConfig,
  denormalizeMaskConfig,
  getMaskAsNormalized,
  getMaskAsLegacy,
  // Types
  type SurfaceConfig,
  type NormalizedSurfaceConfig,
  type MaskShapeConfig,
  type NormalizedMaskConfig,
} from './index'

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
      expect(MASK_SHAPE_TYPE_IDS).toHaveLength(7)
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
