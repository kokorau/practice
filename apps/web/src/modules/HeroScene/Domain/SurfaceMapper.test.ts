import { describe, it, expect, vi } from 'vitest'
import { toCustomSurfaceParams, toCustomBackgroundSurfaceParams } from './SurfaceMapper'
import type { SurfaceConfig } from './HeroViewConfig'
import type { RGBA } from '@practice/texture'

// Mock @practice/texture to provide actual values needed for tests
vi.mock('@practice/texture', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@practice/texture')>()
  return {
    ...actual,
  }
})

describe('toCustomSurfaceParams', () => {
  describe('solid surface', () => {
    it('should convert solid surface config', () => {
      const config: SurfaceConfig = { type: 'solid' }
      const result = toCustomSurfaceParams(config)
      expect(result).toEqual({ type: 'solid' })
    })
  })

  describe('stripe surface', () => {
    it('should convert stripe surface config', () => {
      const config: SurfaceConfig = {
        type: 'stripe',
        width1: 20,
        width2: 10,
        angle: 45,
      }
      const result = toCustomSurfaceParams(config)
      expect(result).toEqual({
        type: 'stripe',
        width1: 20,
        width2: 10,
        angle: 45,
      })
    })
  })

  describe('grid surface', () => {
    it('should convert grid surface config', () => {
      const config: SurfaceConfig = {
        type: 'grid',
        lineWidth: 2,
        cellSize: 50,
      }
      const result = toCustomSurfaceParams(config)
      expect(result).toEqual({
        type: 'grid',
        lineWidth: 2,
        cellSize: 50,
      })
    })
  })

  describe('polkaDot surface', () => {
    it('should convert polkaDot surface config', () => {
      const config: SurfaceConfig = {
        type: 'polkaDot',
        dotRadius: 5,
        spacing: 20,
        rowOffset: 0.5,
      }
      const result = toCustomSurfaceParams(config)
      expect(result).toEqual({
        type: 'polkaDot',
        dotRadius: 5,
        spacing: 20,
        rowOffset: 0.5,
      })
    })
  })

  describe('checker surface', () => {
    it('should convert checker surface config', () => {
      const config: SurfaceConfig = {
        type: 'checker',
        cellSize: 30,
        angle: 0,
      }
      const result = toCustomSurfaceParams(config)
      expect(result).toEqual({
        type: 'checker',
        cellSize: 30,
        angle: 0,
      })
    })
  })

  describe('triangle surface', () => {
    it('should convert triangle surface config', () => {
      const config: SurfaceConfig = {
        type: 'triangle',
        size: 40,
        angle: 30,
      }
      const result = toCustomSurfaceParams(config)
      expect(result).toEqual({
        type: 'triangle',
        size: 40,
        angle: 30,
      })
    })
  })

  describe('hexagon surface', () => {
    it('should convert hexagon surface config', () => {
      const config: SurfaceConfig = {
        type: 'hexagon',
        size: 35,
        angle: 15,
      }
      const result = toCustomSurfaceParams(config)
      expect(result).toEqual({
        type: 'hexagon',
        size: 35,
        angle: 15,
      })
    })
  })

  describe('asanoha surface', () => {
    it('should convert asanoha surface config', () => {
      const config: SurfaceConfig = {
        type: 'asanoha',
        size: 50,
        lineWidth: 2,
      }
      const result = toCustomSurfaceParams(config)
      expect(result).toEqual({
        type: 'asanoha',
        size: 50,
        lineWidth: 2,
      })
    })
  })

  describe('seigaiha surface', () => {
    it('should convert seigaiha surface config', () => {
      const config: SurfaceConfig = {
        type: 'seigaiha',
        radius: 30,
        rings: 5,
        lineWidth: 1,
      }
      const result = toCustomSurfaceParams(config)
      expect(result).toEqual({
        type: 'seigaiha',
        radius: 30,
        rings: 5,
        lineWidth: 1,
      })
    })
  })

  describe('wave surface', () => {
    it('should convert wave surface config', () => {
      const config: SurfaceConfig = {
        type: 'wave',
        amplitude: 10,
        wavelength: 50,
        thickness: 3,
        angle: 0,
      }
      const result = toCustomSurfaceParams(config)
      expect(result).toEqual({
        type: 'wave',
        amplitude: 10,
        wavelength: 50,
        thickness: 3,
        angle: 0,
      })
    })
  })

  describe('scales surface', () => {
    it('should convert scales surface config', () => {
      const config: SurfaceConfig = {
        type: 'scales',
        size: 25,
        overlap: 0.3,
        angle: 0,
      }
      const result = toCustomSurfaceParams(config)
      expect(result).toEqual({
        type: 'scales',
        size: 25,
        overlap: 0.3,
        angle: 0,
      })
    })
  })

  describe('ogee surface', () => {
    it('should convert ogee surface config', () => {
      const config: SurfaceConfig = {
        type: 'ogee',
        width: 40,
        height: 60,
        lineWidth: 2,
      }
      const result = toCustomSurfaceParams(config)
      expect(result).toEqual({
        type: 'ogee',
        width: 40,
        height: 60,
        lineWidth: 2,
      })
    })
  })

  describe('sunburst surface', () => {
    it('should convert sunburst surface config', () => {
      const config: SurfaceConfig = {
        type: 'sunburst',
        rays: 12,
        centerX: 0.5,
        centerY: 0.5,
        twist: 0,
      }
      const result = toCustomSurfaceParams(config)
      expect(result).toEqual({
        type: 'sunburst',
        rays: 12,
        centerX: 0.5,
        centerY: 0.5,
        twist: 0,
      })
    })
  })

  describe('gradientGrain surface', () => {
    it('should convert gradientGrain surface config with colors', () => {
      const config: SurfaceConfig = {
        type: 'gradientGrain',
        depthMapType: 'linear',
        angle: 45,
        centerX: 0.5,
        centerY: 0.5,
        radialStartAngle: 0,
        radialSweepAngle: 360,
        perlinScale: 4,
        perlinOctaves: 4,
        perlinContrast: 1,
        perlinOffset: 0,
        seed: 42,
        sparsity: 0.5,
      }
      const colorA: RGBA = [1, 0, 0, 1]
      const colorB: RGBA = [0, 0, 1, 1]

      const result = toCustomSurfaceParams(config, colorA, colorB)

      expect(result.type).toBe('gradientGrain')
      if (result.type === 'gradientGrain') {
        expect(result.depthMapType).toBe('linear')
        expect(result.angle).toBe(45)
        expect(result.colorA).toEqual(colorA)
        expect(result.colorB).toEqual(colorB)
        expect(result.curvePoints).toBeInstanceOf(Array)
        expect(result.curvePoints.length).toBeGreaterThan(0)
      }
    })

    it('should use default colors when not provided', () => {
      const config: SurfaceConfig = {
        type: 'gradientGrain',
        depthMapType: 'circular',
        angle: 0,
        centerX: 0.5,
        centerY: 0.5,
        radialStartAngle: 0,
        radialSweepAngle: 360,
        perlinScale: 4,
        perlinOctaves: 4,
        perlinContrast: 1,
        perlinOffset: 0,
        seed: 42,
        sparsity: 0.5,
      }

      const result = toCustomSurfaceParams(config)

      expect(result.type).toBe('gradientGrain')
      if (result.type === 'gradientGrain') {
        expect(result.colorA).toEqual([0, 0, 0, 1])
        expect(result.colorB).toEqual([1, 1, 1, 1])
      }
    })
  })

  describe('image surface', () => {
    it('should fallback to solid for image surface', () => {
      const config: SurfaceConfig = {
        type: 'image',
        imageId: 'some-image-id',
      }
      const result = toCustomSurfaceParams(config)
      expect(result).toEqual({ type: 'solid' })
    })
  })
})

describe('toCustomBackgroundSurfaceParams', () => {
  it('should convert surface config same as toCustomSurfaceParams', () => {
    const config: SurfaceConfig = {
      type: 'stripe',
      width1: 20,
      width2: 10,
      angle: 45,
    }
    const result = toCustomBackgroundSurfaceParams(config)
    expect(result).toEqual({
      type: 'stripe',
      width1: 20,
      width2: 10,
      angle: 45,
    })
  })

  it('should handle gradientGrain with colors', () => {
    const config: SurfaceConfig = {
      type: 'gradientGrain',
      depthMapType: 'radial',
      angle: 0,
      centerX: 0.5,
      centerY: 0.5,
      radialStartAngle: 0,
      radialSweepAngle: 360,
      perlinScale: 4,
      perlinOctaves: 4,
      perlinContrast: 1,
      perlinOffset: 0,
      seed: 42,
      sparsity: 0.5,
    }
    const colorA: RGBA = [0.5, 0.5, 0.5, 1]
    const colorB: RGBA = [0.8, 0.8, 0.8, 1]

    const result = toCustomBackgroundSurfaceParams(config, colorA, colorB)

    expect(result.type).toBe('gradientGrain')
    if (result.type === 'gradientGrain') {
      expect(result.colorA).toEqual(colorA)
      expect(result.colorB).toEqual(colorB)
    }
  })
})
