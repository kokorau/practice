import { describe, it, expect, vi } from 'vitest'
import { syncBackgroundSurfaceParams } from './ConfigSyncer'
import type { HeroViewConfig, NormalizedSurfaceConfig } from '../Domain/HeroViewConfig'
import type { RGBA } from '@practice/texture'

// Ensure actual module is used (not mocked by other tests)
vi.unmock('@practice/texture')

const createTestConfig = (surface: NormalizedSurfaceConfig): HeroViewConfig => ({
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
      const config = createTestConfig({ id: 'solid', params: {} })
      const result = syncBackgroundSurfaceParams(config, defaultColorA, defaultColorB)

      expect(result.surfaceParams).toEqual({ id: 'solid' })
    })
  })

  describe('stripe surface', () => {
    it('should sync stripe surface params', () => {
      const config = createTestConfig({
        id: 'stripe',
        params: { width1: 20, width2: 10, angle: 45 },
      })
      const result = syncBackgroundSurfaceParams(config, defaultColorA, defaultColorB)

      expect(result.surfaceParams).toEqual({
        id: 'stripe',
        width1: 20,
        width2: 10,
        angle: 45,
      })
    })
  })

  describe('grid surface', () => {
    it('should sync grid surface params', () => {
      const config = createTestConfig({
        id: 'grid',
        params: { lineWidth: 2, cellSize: 50 },
      })
      const result = syncBackgroundSurfaceParams(config, defaultColorA, defaultColorB)

      expect(result.surfaceParams).toEqual({
        id: 'grid',
        lineWidth: 2,
        cellSize: 50,
      })
    })
  })

  describe('polkaDot surface', () => {
    it('should sync polkaDot surface params', () => {
      const config = createTestConfig({
        id: 'polkaDot',
        params: { dotRadius: 5, spacing: 20, rowOffset: 0.5 },
      })
      const result = syncBackgroundSurfaceParams(config, defaultColorA, defaultColorB)

      expect(result.surfaceParams).toEqual({
        id: 'polkaDot',
        dotRadius: 5,
        spacing: 20,
        rowOffset: 0.5,
      })
    })
  })

  describe('checker surface', () => {
    it('should sync checker surface params', () => {
      const config = createTestConfig({
        id: 'checker',
        params: { cellSize: 30, angle: 0 },
      })
      const result = syncBackgroundSurfaceParams(config, defaultColorA, defaultColorB)

      expect(result.surfaceParams).toEqual({
        id: 'checker',
        cellSize: 30,
        angle: 0,
      })
    })
  })

  describe('gradientGrain surface', () => {
    it('should sync gradientGrain surface params with provided colors', () => {
      const config = createTestConfig({
        id: 'gradientGrain',
        params: {
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
        },
      })
      const result = syncBackgroundSurfaceParams(config, defaultColorA, defaultColorB)

      expect(result.surfaceParams).not.toBeNull()
      expect(result.surfaceParams?.id).toBe('gradientGrain')
      if (result.surfaceParams?.id === 'gradientGrain') {
        expect(result.surfaceParams.colorA).toEqual(defaultColorA)
        expect(result.surfaceParams.colorB).toEqual(defaultColorB)
        expect(result.surfaceParams.curvePoints).toBeInstanceOf(Array)
      }
    })
  })

  describe('textile surfaces', () => {
    it('should sync asanoha surface params', () => {
      const config = createTestConfig({
        id: 'asanoha',
        params: { size: 50, lineWidth: 2 },
      })
      const result = syncBackgroundSurfaceParams(config, defaultColorA, defaultColorB)

      expect(result.surfaceParams).toEqual({
        id: 'asanoha',
        size: 50,
        lineWidth: 2,
      })
    })

    it('should sync seigaiha surface params', () => {
      const config = createTestConfig({
        id: 'seigaiha',
        params: { radius: 30, rings: 5, lineWidth: 1 },
      })
      const result = syncBackgroundSurfaceParams(config, defaultColorA, defaultColorB)

      expect(result.surfaceParams).toEqual({
        id: 'seigaiha',
        radius: 30,
        rings: 5,
        lineWidth: 1,
      })
    })

    it('should sync wave surface params', () => {
      const config = createTestConfig({
        id: 'wave',
        params: { amplitude: 10, wavelength: 50, thickness: 3, angle: 0 },
      })
      const result = syncBackgroundSurfaceParams(config, defaultColorA, defaultColorB)

      expect(result.surfaceParams).toEqual({
        id: 'wave',
        amplitude: 10,
        wavelength: 50,
        thickness: 3,
        angle: 0,
      })
    })

    it('should sync scales surface params', () => {
      const config = createTestConfig({
        id: 'scales',
        params: { size: 25, overlap: 0.3, angle: 0 },
      })
      const result = syncBackgroundSurfaceParams(config, defaultColorA, defaultColorB)

      expect(result.surfaceParams).toEqual({
        id: 'scales',
        size: 25,
        overlap: 0.3,
        angle: 0,
      })
    })

    it('should sync ogee surface params', () => {
      const config = createTestConfig({
        id: 'ogee',
        params: { width: 40, height: 60, lineWidth: 2 },
      })
      const result = syncBackgroundSurfaceParams(config, defaultColorA, defaultColorB)

      expect(result.surfaceParams).toEqual({
        id: 'ogee',
        width: 40,
        height: 60,
        lineWidth: 2,
      })
    })

    it('should sync sunburst surface params', () => {
      const config = createTestConfig({
        id: 'sunburst',
        params: { rays: 12, centerX: 0.5, centerY: 0.5, twist: 0 },
      })
      const result = syncBackgroundSurfaceParams(config, defaultColorA, defaultColorB)

      expect(result.surfaceParams).toEqual({
        id: 'sunburst',
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
        id: 'image',
        params: { imageId: 'some-image-id' },
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
