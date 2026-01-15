import { describe, it, expect } from 'vitest'
import { toCustomMaskShapeParams, fromCustomMaskShapeParams } from './MaskShapeMapper'
import type { MaskShapeConfig } from './HeroViewConfig'
import type { CustomMaskShapeParams } from '../types/HeroSceneState'

describe('toCustomMaskShapeParams', () => {
  describe('circle mask', () => {
    it('should convert circle mask config with all properties', () => {
      const config: MaskShapeConfig = {
        type: 'circle',
        centerX: 0.5,
        centerY: 0.5,
        radius: 0.3,
        cutout: false,
      }
      const result = toCustomMaskShapeParams(config)
      expect(result).toEqual({
        type: 'circle',
        centerX: 0.5,
        centerY: 0.5,
        radius: 0.3,
        cutout: false,
      })
    })

    it('should apply default cutout=true for circle', () => {
      const config = {
        type: 'circle',
        centerX: 0.5,
        centerY: 0.5,
        radius: 0.3,
      } as MaskShapeConfig
      const result = toCustomMaskShapeParams(config)
      expect(result.cutout).toBe(true)
    })
  })

  describe('rect mask', () => {
    it('should convert rect mask config with all properties', () => {
      const config: MaskShapeConfig = {
        type: 'rect',
        left: 0.1,
        right: 0.9,
        top: 0.1,
        bottom: 0.9,
        radiusTopLeft: 10,
        radiusTopRight: 10,
        radiusBottomLeft: 10,
        radiusBottomRight: 10,
        rotation: 45,
        perspectiveX: 0.1,
        perspectiveY: -0.1,
        cutout: true,
      }
      const result = toCustomMaskShapeParams(config)
      expect(result).toEqual({
        type: 'rect',
        left: 0.1,
        right: 0.9,
        top: 0.1,
        bottom: 0.9,
        radiusTopLeft: 10,
        radiusTopRight: 10,
        radiusBottomLeft: 10,
        radiusBottomRight: 10,
        rotation: 45,
        perspectiveX: 0.1,
        perspectiveY: -0.1,
        cutout: true,
      })
    })

    it('should apply default values for optional rect properties', () => {
      const config = {
        type: 'rect',
        left: 0.1,
        right: 0.9,
        top: 0.1,
        bottom: 0.9,
      } as MaskShapeConfig
      const result = toCustomMaskShapeParams(config)
      expect(result).toMatchObject({
        type: 'rect',
        radiusTopLeft: 0,
        radiusTopRight: 0,
        radiusBottomLeft: 0,
        radiusBottomRight: 0,
        rotation: 0,
        perspectiveX: 0,
        perspectiveY: 0,
        cutout: true,
      })
    })
  })

  describe('blob mask', () => {
    it('should convert blob mask config', () => {
      const config: MaskShapeConfig = {
        type: 'blob',
        centerX: 0.5,
        centerY: 0.5,
        baseRadius: 0.3,
        amplitude: 0.1,
        octaves: 3,
        seed: 42,
        cutout: true,
      }
      const result = toCustomMaskShapeParams(config)
      expect(result).toEqual({
        type: 'blob',
        centerX: 0.5,
        centerY: 0.5,
        baseRadius: 0.3,
        amplitude: 0.1,
        octaves: 3,
        seed: 42,
        cutout: true,
      })
    })

    it('should apply default cutout=true for blob', () => {
      const config = {
        type: 'blob',
        centerX: 0.5,
        centerY: 0.5,
        baseRadius: 0.3,
        amplitude: 0.1,
        octaves: 3,
        seed: 42,
      } as MaskShapeConfig
      const result = toCustomMaskShapeParams(config)
      expect(result.cutout).toBe(true)
    })
  })

  describe('perlin mask', () => {
    it('should convert perlin mask config', () => {
      const config: MaskShapeConfig = {
        type: 'perlin',
        seed: 123,
        threshold: 0.5,
        scale: 4,
        octaves: 4,
        cutout: true,
      }
      const result = toCustomMaskShapeParams(config)
      expect(result).toEqual({
        type: 'perlin',
        seed: 123,
        threshold: 0.5,
        scale: 4,
        octaves: 4,
        cutout: true,
      })
    })

    it('should apply default cutout=true for perlin', () => {
      const config = {
        type: 'perlin',
        seed: 123,
        threshold: 0.5,
        scale: 4,
        octaves: 4,
      } as MaskShapeConfig
      const result = toCustomMaskShapeParams(config)
      expect(result.cutout).toBe(true)
    })
  })

  describe('linearGradient mask', () => {
    it('should convert linearGradient mask config', () => {
      const config: MaskShapeConfig = {
        type: 'linearGradient',
        angle: 90,
        startOffset: 0.2,
        endOffset: 0.8,
        cutout: true,
      }
      const result = toCustomMaskShapeParams(config)
      expect(result).toEqual({
        type: 'linearGradient',
        angle: 90,
        startOffset: 0.2,
        endOffset: 0.8,
        cutout: true,
      })
    })

    it('should apply default cutout=false for linearGradient', () => {
      const config = {
        type: 'linearGradient',
        angle: 90,
        startOffset: 0.2,
        endOffset: 0.8,
      } as MaskShapeConfig
      const result = toCustomMaskShapeParams(config)
      expect(result.cutout).toBe(false)
    })
  })

  describe('radialGradient mask', () => {
    it('should convert radialGradient mask config', () => {
      const config: MaskShapeConfig = {
        type: 'radialGradient',
        centerX: 0.5,
        centerY: 0.5,
        innerRadius: 0.1,
        outerRadius: 0.5,
        aspectRatio: 1.0,
        cutout: true,
      }
      const result = toCustomMaskShapeParams(config)
      expect(result).toEqual({
        type: 'radialGradient',
        centerX: 0.5,
        centerY: 0.5,
        innerRadius: 0.1,
        outerRadius: 0.5,
        aspectRatio: 1.0,
        cutout: true,
      })
    })

    it('should apply default cutout=false for radialGradient', () => {
      const config = {
        type: 'radialGradient',
        centerX: 0.5,
        centerY: 0.5,
        innerRadius: 0.1,
        outerRadius: 0.5,
        aspectRatio: 1.0,
      } as MaskShapeConfig
      const result = toCustomMaskShapeParams(config)
      expect(result.cutout).toBe(false)
    })
  })

  describe('boxGradient mask', () => {
    it('should convert boxGradient mask config', () => {
      const config: MaskShapeConfig = {
        type: 'boxGradient',
        left: 0.1,
        right: 0.1,
        top: 0.1,
        bottom: 0.1,
        cornerRadius: 20,
        curve: 'smooth',
        cutout: true,
      }
      const result = toCustomMaskShapeParams(config)
      expect(result).toEqual({
        type: 'boxGradient',
        left: 0.1,
        right: 0.1,
        top: 0.1,
        bottom: 0.1,
        cornerRadius: 20,
        curve: 'smooth',
        cutout: true,
      })
    })

    it('should apply default cutout=false for boxGradient', () => {
      const config = {
        type: 'boxGradient',
        left: 0.1,
        right: 0.1,
        top: 0.1,
        bottom: 0.1,
        cornerRadius: 20,
        curve: 'linear',
      } as MaskShapeConfig
      const result = toCustomMaskShapeParams(config)
      expect(result.cutout).toBe(false)
    })
  })
})

describe('fromCustomMaskShapeParams', () => {
  describe('circle mask', () => {
    it('should convert circle custom params to config', () => {
      const params: CustomMaskShapeParams = {
        type: 'circle',
        centerX: 0.5,
        centerY: 0.5,
        radius: 0.3,
        cutout: true,
      }
      const result = fromCustomMaskShapeParams(params)
      expect(result).toEqual({
        type: 'circle',
        centerX: 0.5,
        centerY: 0.5,
        radius: 0.3,
        cutout: true,
      })
    })
  })

  describe('rect mask', () => {
    it('should convert rect custom params to config', () => {
      const params: CustomMaskShapeParams = {
        type: 'rect',
        left: 0.1,
        right: 0.9,
        top: 0.1,
        bottom: 0.9,
        radiusTopLeft: 10,
        radiusTopRight: 10,
        radiusBottomLeft: 10,
        radiusBottomRight: 10,
        rotation: 45,
        perspectiveX: 0.1,
        perspectiveY: -0.1,
        cutout: false,
      }
      const result = fromCustomMaskShapeParams(params)
      expect(result).toEqual({
        type: 'rect',
        left: 0.1,
        right: 0.9,
        top: 0.1,
        bottom: 0.9,
        radiusTopLeft: 10,
        radiusTopRight: 10,
        radiusBottomLeft: 10,
        radiusBottomRight: 10,
        rotation: 45,
        perspectiveX: 0.1,
        perspectiveY: -0.1,
        cutout: false,
      })
    })
  })

  describe('blob mask', () => {
    it('should convert blob custom params to config', () => {
      const params: CustomMaskShapeParams = {
        type: 'blob',
        centerX: 0.5,
        centerY: 0.5,
        baseRadius: 0.3,
        amplitude: 0.1,
        octaves: 3,
        seed: 42,
        cutout: true,
      }
      const result = fromCustomMaskShapeParams(params)
      expect(result).toEqual({
        type: 'blob',
        centerX: 0.5,
        centerY: 0.5,
        baseRadius: 0.3,
        amplitude: 0.1,
        octaves: 3,
        seed: 42,
        cutout: true,
      })
    })
  })

  describe('gradient masks', () => {
    it('should convert linearGradient custom params to config', () => {
      const params: CustomMaskShapeParams = {
        type: 'linearGradient',
        angle: 90,
        startOffset: 0.2,
        endOffset: 0.8,
        cutout: false,
      }
      const result = fromCustomMaskShapeParams(params)
      expect(result).toEqual({
        type: 'linearGradient',
        angle: 90,
        startOffset: 0.2,
        endOffset: 0.8,
        cutout: false,
      })
    })

    it('should convert radialGradient custom params to config', () => {
      const params: CustomMaskShapeParams = {
        type: 'radialGradient',
        centerX: 0.5,
        centerY: 0.5,
        innerRadius: 0.1,
        outerRadius: 0.5,
        aspectRatio: 1.0,
        cutout: false,
      }
      const result = fromCustomMaskShapeParams(params)
      expect(result).toEqual({
        type: 'radialGradient',
        centerX: 0.5,
        centerY: 0.5,
        innerRadius: 0.1,
        outerRadius: 0.5,
        aspectRatio: 1.0,
        cutout: false,
      })
    })

    it('should convert boxGradient custom params to config', () => {
      const params: CustomMaskShapeParams = {
        type: 'boxGradient',
        left: 0.1,
        right: 0.1,
        top: 0.1,
        bottom: 0.1,
        cornerRadius: 20,
        curve: 'smooth',
        cutout: true,
      }
      const result = fromCustomMaskShapeParams(params)
      expect(result).toEqual({
        type: 'boxGradient',
        left: 0.1,
        right: 0.1,
        top: 0.1,
        bottom: 0.1,
        cornerRadius: 20,
        curve: 'smooth',
        cutout: true,
      })
    })
  })

  describe('perlin mask', () => {
    it('should convert perlin custom params to config', () => {
      const params: CustomMaskShapeParams = {
        type: 'perlin',
        seed: 123,
        threshold: 0.5,
        scale: 4,
        octaves: 4,
        cutout: true,
      }
      const result = fromCustomMaskShapeParams(params)
      expect(result).toEqual({
        type: 'perlin',
        seed: 123,
        threshold: 0.5,
        scale: 4,
        octaves: 4,
        cutout: true,
      })
    })
  })

  describe('round-trip conversion', () => {
    it('should preserve circle mask through round-trip', () => {
      const original: MaskShapeConfig = {
        type: 'circle',
        centerX: 0.5,
        centerY: 0.5,
        radius: 0.3,
        cutout: true,
      }
      const custom = toCustomMaskShapeParams(original)
      const result = fromCustomMaskShapeParams(custom)
      expect(result).toEqual(original)
    })

    it('should preserve blob mask through round-trip', () => {
      const original: MaskShapeConfig = {
        type: 'blob',
        centerX: 0.5,
        centerY: 0.5,
        baseRadius: 0.3,
        amplitude: 0.1,
        octaves: 3,
        seed: 42,
        cutout: false,
      }
      const custom = toCustomMaskShapeParams(original)
      const result = fromCustomMaskShapeParams(custom)
      expect(result).toEqual(original)
    })
  })
})
