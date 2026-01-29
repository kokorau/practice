import { describe, it, expect } from 'vitest'
import {
  createDefaultMaskConfig,
  createMaskConfigForShape,
  migrateClipMaskConfig,
  migrateMaskModifier,
  toLegacyClipMaskConfig,
  toLegacyMaskModifier,
  isCircleMaskConfig,
  isRectMaskConfig,
  isBlobMaskConfig,
  isPerlinMaskConfig,
  type LegacyClipMaskConfig,
  type LegacyMaskModifier,
  type MaskConfig,
} from './MaskSchema'

describe('MaskSchema', () => {
  describe('createDefaultMaskConfig', () => {
    it('should create default circle mask config', () => {
      const config = createDefaultMaskConfig()
      expect(config.shape).toBe('circle')
      expect(config.enabled).toBe(true)
      expect(config.centerX).toBe(0.5)
      expect(config.centerY).toBe(0.5)
      expect(config.radius).toBe(0.3)
      expect(config.cutout).toBe(false)
    })
  })

  describe('createMaskConfigForShape', () => {
    it('should create circle mask config', () => {
      const config = createMaskConfigForShape('circle')
      expect(config.shape).toBe('circle')
      expect(isCircleMaskConfig(config)).toBe(true)
    })

    it('should create rect mask config', () => {
      const config = createMaskConfigForShape('rect')
      expect(config.shape).toBe('rect')
      expect(isRectMaskConfig(config)).toBe(true)
      if (isRectMaskConfig(config)) {
        expect(config.left).toBe(0.2)
        expect(config.right).toBe(0.8)
        expect(config.rotation).toBe(0)
      }
    })

    it('should create blob mask config', () => {
      const config = createMaskConfigForShape('blob')
      expect(config.shape).toBe('blob')
      expect(isBlobMaskConfig(config)).toBe(true)
    })

    it('should create perlin mask config', () => {
      const config = createMaskConfigForShape('perlin')
      expect(config.shape).toBe('perlin')
      expect(isPerlinMaskConfig(config)).toBe(true)
    })

    it('should create linearGradient mask config', () => {
      const config = createMaskConfigForShape('linearGradient')
      expect(config.shape).toBe('linearGradient')
    })

    it('should create radialGradient mask config', () => {
      const config = createMaskConfigForShape('radialGradient')
      expect(config.shape).toBe('radialGradient')
    })

    it('should create boxGradient mask config', () => {
      const config = createMaskConfigForShape('boxGradient')
      expect(config.shape).toBe('boxGradient')
    })

    it('should preserve existing base properties', () => {
      const config = createMaskConfigForShape('circle', {
        enabled: false,
        feather: 10,
      })
      expect(config.enabled).toBe(false)
      expect(config.feather).toBe(10)
    })
  })

  describe('migrateClipMaskConfig', () => {
    it('should migrate circle mask config', () => {
      const legacy: LegacyClipMaskConfig = {
        shape: 'circle',
        shapeParams: { type: 'circle', centerX: 0.3, centerY: 0.7, radius: 0.4 },
        feather: 5,
      }
      const result = migrateClipMaskConfig(legacy, true)
      expect(result).not.toBeNull()
      expect(result!.shape).toBe('circle')
      expect(result!.enabled).toBe(true)
      expect(result!.feather).toBe(5)
      if (isCircleMaskConfig(result!)) {
        expect(result.centerX).toBe(0.3)
        expect(result.centerY).toBe(0.7)
        expect(result.radius).toBe(0.4)
      }
    })

    it('should migrate rect mask config with centerX/Y format', () => {
      const legacy: LegacyClipMaskConfig = {
        shape: 'rect',
        shapeParams: {
          type: 'rect',
          centerX: 0.5,
          centerY: 0.5,
          width: 0.6,
          height: 0.4,
          cornerRadius: [0.1, 0.1, 0.1, 0.1] as [number, number, number, number],
        },
        feather: 0,
      }
      const result = migrateClipMaskConfig(legacy)
      expect(result).not.toBeNull()
      expect(result!.shape).toBe('rect')
      if (isRectMaskConfig(result!)) {
        expect(result.left).toBe(0.2)
        expect(result.right).toBe(0.8)
        expect(result.top).toBe(0.3)
        expect(result.bottom).toBe(0.7)
        expect(result.radiusTopLeft).toBe(0.1)
      }
    })

    it('should migrate perlin mask config', () => {
      const legacy: LegacyClipMaskConfig = {
        shape: 'perlin',
        shapeParams: { type: 'perlin', seed: 123, threshold: 0.6, scale: 8, octaves: 6 },
        feather: 0,
      }
      const result = migrateClipMaskConfig(legacy)
      expect(result).not.toBeNull()
      expect(result!.shape).toBe('perlin')
      if (isPerlinMaskConfig(result!)) {
        expect(result.seed).toBe(123)
        expect(result.threshold).toBe(0.6)
        expect(result.scale).toBe(8)
        expect(result.octaves).toBe(6)
      }
    })

    it('should return null for image mask', () => {
      const legacy: LegacyClipMaskConfig = {
        shape: 'image',
        shapeParams: { type: 'image', source: 'test.png' },
        feather: 0,
      }
      const result = migrateClipMaskConfig(legacy)
      expect(result).toBeNull()
    })
  })

  describe('migrateMaskModifier', () => {
    it('should migrate mask modifier', () => {
      const modifier: LegacyMaskModifier = {
        type: 'mask',
        enabled: false,
        config: {
          shape: 'circle',
          shapeParams: { type: 'circle', centerX: 0.5, centerY: 0.5, radius: 0.3 },
          feather: 0,
        },
      }
      const result = migrateMaskModifier(modifier)
      expect(result).not.toBeNull()
      expect(result!.enabled).toBe(false)
    })
  })

  describe('toLegacyClipMaskConfig', () => {
    it('should convert circle mask to legacy format', () => {
      const config: MaskConfig = {
        shape: 'circle',
        enabled: true,
        feather: 5,
        centerX: 0.3,
        centerY: 0.7,
        radius: 0.4,
        cutout: false,
      }
      const legacy = toLegacyClipMaskConfig(config)
      expect(legacy.shape).toBe('circle')
      expect(legacy.feather).toBe(5)
      expect(legacy.shapeParams.type).toBe('circle')
      expect(legacy.shapeParams.centerX).toBe(0.3)
      expect(legacy.shapeParams.centerY).toBe(0.7)
      expect(legacy.shapeParams.radius).toBe(0.4)
    })
  })

  describe('toLegacyMaskModifier', () => {
    it('should convert mask config to legacy modifier format', () => {
      const config: MaskConfig = {
        shape: 'circle',
        enabled: false,
        feather: 0,
        centerX: 0.5,
        centerY: 0.5,
        radius: 0.3,
        cutout: false,
      }
      const modifier = toLegacyMaskModifier(config)
      expect(modifier.type).toBe('mask')
      expect(modifier.enabled).toBe(false)
      expect(modifier.config.shape).toBe('circle')
    })
  })
})
