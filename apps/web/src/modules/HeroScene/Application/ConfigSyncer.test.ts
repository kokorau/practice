import { describe, it, expect } from 'vitest'
import { syncBackgroundSurfaceParams } from './ConfigSyncer'
import type { HeroViewConfig, SurfaceConfig } from '../Domain/HeroViewConfig'
import type { RGBA } from '@practice/texture'

const createTestConfig = (surface: SurfaceConfig): HeroViewConfig => ({
  viewport: { width: 1920, height: 1080 },
  colors: {
    background: { primary: 'BN0', secondary: 'BN9' },
    mask: { primary: 'auto', secondary: 'auto' },
    semanticContext: 'canvas',
    brand: { hue: 220, saturation: 80, value: 60 },
    accent: { hue: 340, saturation: 70, value: 50 },
    foundation: { hue: 20, saturation: 10, value: 95 },
  },
  layers: [
    {
      type: 'base',
      id: 'base',
      name: 'Background',
      visible: true,
      surface,
    },
  ],
  foreground: { elements: [] },
})

const defaultColorA: RGBA = [1, 0, 0, 1]
const defaultColorB: RGBA = [0, 0, 1, 1]

describe('syncBackgroundSurfaceParams', () => {
  describe('solid surface', () => {
    it('should sync solid surface params', () => {
      const config = createTestConfig({ type: 'solid' })
      const result = syncBackgroundSurfaceParams(config, defaultColorA, defaultColorB)

      expect(result.surfaceParams).toEqual({ type: 'solid' })
    })
  })

  describe('stripe surface', () => {
    it('should sync stripe surface params', () => {
      const config = createTestConfig({
        type: 'stripe',
        width1: 20,
        width2: 10,
        angle: 45,
      })
      const result = syncBackgroundSurfaceParams(config, defaultColorA, defaultColorB)

      expect(result.surfaceParams).toEqual({
        type: 'stripe',
        width1: 20,
        width2: 10,
        angle: 45,
      })
    })
  })

  describe('grid surface', () => {
    it('should sync grid surface params', () => {
      const config = createTestConfig({
        type: 'grid',
        lineWidth: 2,
        cellSize: 50,
      })
      const result = syncBackgroundSurfaceParams(config, defaultColorA, defaultColorB)

      expect(result.surfaceParams).toEqual({
        type: 'grid',
        lineWidth: 2,
        cellSize: 50,
      })
    })
  })

  describe('polkaDot surface', () => {
    it('should sync polkaDot surface params', () => {
      const config = createTestConfig({
        type: 'polkaDot',
        dotRadius: 5,
        spacing: 20,
        rowOffset: 0.5,
      })
      const result = syncBackgroundSurfaceParams(config, defaultColorA, defaultColorB)

      expect(result.surfaceParams).toEqual({
        type: 'polkaDot',
        dotRadius: 5,
        spacing: 20,
        rowOffset: 0.5,
      })
    })
  })

  describe('checker surface', () => {
    it('should sync checker surface params', () => {
      const config = createTestConfig({
        type: 'checker',
        cellSize: 30,
        angle: 0,
      })
      const result = syncBackgroundSurfaceParams(config, defaultColorA, defaultColorB)

      expect(result.surfaceParams).toEqual({
        type: 'checker',
        cellSize: 30,
        angle: 0,
      })
    })
  })

  describe('gradientGrain surface', () => {
    it('should sync gradientGrain surface params with provided colors', () => {
      const config = createTestConfig({
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
      })
      const result = syncBackgroundSurfaceParams(config, defaultColorA, defaultColorB)

      expect(result.surfaceParams).not.toBeNull()
      expect(result.surfaceParams?.type).toBe('gradientGrain')
      if (result.surfaceParams?.type === 'gradientGrain') {
        expect(result.surfaceParams.colorA).toEqual(defaultColorA)
        expect(result.surfaceParams.colorB).toEqual(defaultColorB)
        expect(result.surfaceParams.curvePoints).toBeInstanceOf(Array)
      }
    })
  })

  describe('textile surfaces', () => {
    it('should sync asanoha surface params', () => {
      const config = createTestConfig({
        type: 'asanoha',
        size: 50,
        lineWidth: 2,
      })
      const result = syncBackgroundSurfaceParams(config, defaultColorA, defaultColorB)

      expect(result.surfaceParams).toEqual({
        type: 'asanoha',
        size: 50,
        lineWidth: 2,
      })
    })

    it('should sync seigaiha surface params', () => {
      const config = createTestConfig({
        type: 'seigaiha',
        radius: 30,
        rings: 5,
        lineWidth: 1,
      })
      const result = syncBackgroundSurfaceParams(config, defaultColorA, defaultColorB)

      expect(result.surfaceParams).toEqual({
        type: 'seigaiha',
        radius: 30,
        rings: 5,
        lineWidth: 1,
      })
    })

    it('should sync wave surface params', () => {
      const config = createTestConfig({
        type: 'wave',
        amplitude: 10,
        wavelength: 50,
        thickness: 3,
        angle: 0,
      })
      const result = syncBackgroundSurfaceParams(config, defaultColorA, defaultColorB)

      expect(result.surfaceParams).toEqual({
        type: 'wave',
        amplitude: 10,
        wavelength: 50,
        thickness: 3,
        angle: 0,
      })
    })

    it('should sync scales surface params', () => {
      const config = createTestConfig({
        type: 'scales',
        size: 25,
        overlap: 0.3,
        angle: 0,
      })
      const result = syncBackgroundSurfaceParams(config, defaultColorA, defaultColorB)

      expect(result.surfaceParams).toEqual({
        type: 'scales',
        size: 25,
        overlap: 0.3,
        angle: 0,
      })
    })

    it('should sync ogee surface params', () => {
      const config = createTestConfig({
        type: 'ogee',
        width: 40,
        height: 60,
        lineWidth: 2,
      })
      const result = syncBackgroundSurfaceParams(config, defaultColorA, defaultColorB)

      expect(result.surfaceParams).toEqual({
        type: 'ogee',
        width: 40,
        height: 60,
        lineWidth: 2,
      })
    })

    it('should sync sunburst surface params', () => {
      const config = createTestConfig({
        type: 'sunburst',
        rays: 12,
        centerX: 0.5,
        centerY: 0.5,
        twist: 0,
      })
      const result = syncBackgroundSurfaceParams(config, defaultColorA, defaultColorB)

      expect(result.surfaceParams).toEqual({
        type: 'sunburst',
        rays: 12,
        centerX: 0.5,
        centerY: 0.5,
        twist: 0,
      })
    })
  })

  describe('image surface', () => {
    it('should return null for image surface (handled separately)', () => {
      const config = createTestConfig({
        type: 'image',
        imageId: 'some-image-id',
      })
      const result = syncBackgroundSurfaceParams(config, defaultColorA, defaultColorB)

      expect(result.surfaceParams).toBeNull()
    })
  })

  describe('missing base layer', () => {
    it('should return null when base layer is not found', () => {
      const config: HeroViewConfig = {
        viewport: { width: 1920, height: 1080 },
        colors: {
          background: { primary: 'BN0', secondary: 'BN9' },
          mask: { primary: 'auto', secondary: 'auto' },
          semanticContext: 'canvas',
          brand: { hue: 220, saturation: 80, value: 60 },
          accent: { hue: 340, saturation: 70, value: 50 },
          foundation: { hue: 20, saturation: 10, value: 95 },
        },
        layers: [],
        foreground: { elements: [] },
      }
      const result = syncBackgroundSurfaceParams(config, defaultColorA, defaultColorB)

      expect(result.surfaceParams).toBeNull()
    })
  })
})
