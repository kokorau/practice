import { describe, it, expect } from 'vitest'
import {
  approxEqual,
  findSurfacePresetIndex,
  findMaskPatternIndex,
  type SurfacePresetParams,
  type MaskPatternConfig,
} from './ReverseLookup'

describe('ReverseLookup', () => {
  describe('approxEqual', () => {
    it('returns true for equal numbers', () => {
      expect(approxEqual(1.0, 1.0)).toBe(true)
    })

    it('returns true for numbers within epsilon', () => {
      expect(approxEqual(1.0, 1.00001)).toBe(true)
    })

    it('returns false for numbers outside epsilon', () => {
      expect(approxEqual(1.0, 1.001)).toBe(false)
    })
  })

  describe('findSurfacePresetIndex', () => {
    const presets: { params: SurfacePresetParams }[] = [
      { params: { type: 'solid' } },
      { params: { type: 'stripe', width1: 20, width2: 20, angle: Math.PI / 4 } },
      { params: { type: 'grid', lineWidth: 2, cellSize: 30 } },
      { params: { type: 'polkaDot', dotRadius: 10, spacing: 40, rowOffset: 0.5 } },
      { params: { type: 'checker', cellSize: 30, angle: 0 } },
    ]

    it('finds solid preset', () => {
      expect(findSurfacePresetIndex({ type: 'solid' }, presets)).toBe(0)
    })

    it('finds stripe preset with matching params', () => {
      const config = { type: 'stripe' as const, width1: 20, width2: 20, angle: Math.PI / 4 }
      expect(findSurfacePresetIndex(config, presets)).toBe(1)
    })

    it('returns null for stripe with different params', () => {
      const config = { type: 'stripe' as const, width1: 15, width2: 15, angle: 0 }
      expect(findSurfacePresetIndex(config, presets)).toBeNull()
    })

    it('finds grid preset with matching params', () => {
      const config = { type: 'grid' as const, lineWidth: 2, cellSize: 30 }
      expect(findSurfacePresetIndex(config, presets)).toBe(2)
    })

    it('finds polkaDot preset with matching params', () => {
      const config = { type: 'polkaDot' as const, dotRadius: 10, spacing: 40, rowOffset: 0.5 }
      expect(findSurfacePresetIndex(config, presets)).toBe(3)
    })

    it('finds checker preset with matching params', () => {
      const config = { type: 'checker' as const, cellSize: 30, angle: 0 }
      expect(findSurfacePresetIndex(config, presets)).toBe(4)
    })

    it('returns null for image type', () => {
      const config = { type: 'image' as const, imageId: 'test.jpg' }
      expect(findSurfacePresetIndex(config, presets)).toBeNull()
    })
  })

  describe('findMaskPatternIndex', () => {
    const patterns: { maskConfig: MaskPatternConfig }[] = [
      { maskConfig: { type: 'circle', centerX: 0.5, centerY: 0.5, radius: 0.3 } },
      { maskConfig: { type: 'circle', centerX: 0.5, centerY: 0.5, radius: 0.3, cutout: false } },
      { maskConfig: { type: 'rect', left: 0, right: 1, top: 0, bottom: 0.5 } },
      { maskConfig: { type: 'rect', left: 0.25, right: 0.75, top: 0.15, bottom: 0.85, radiusTopLeft: 0.05, radiusTopRight: 0.05, radiusBottomLeft: 0.05, radiusBottomRight: 0.05 } },
      { maskConfig: { type: 'blob', centerX: 0.5, centerY: 0.5, baseRadius: 0.4, amplitude: 0.08, octaves: 2, seed: 1 } },
    ]

    it('finds circle mask with cutout true (default)', () => {
      const config = { type: 'circle' as const, centerX: 0.5, centerY: 0.5, radius: 0.3, cutout: true }
      expect(findMaskPatternIndex(config, patterns)).toBe(0)
    })

    it('finds circle mask with cutout false', () => {
      const config = { type: 'circle' as const, centerX: 0.5, centerY: 0.5, radius: 0.3, cutout: false }
      expect(findMaskPatternIndex(config, patterns)).toBe(1)
    })

    it('finds rect mask without corner radius', () => {
      const config = { type: 'rect' as const, left: 0, right: 1, top: 0, bottom: 0.5, radiusTopLeft: 0, radiusTopRight: 0, radiusBottomLeft: 0, radiusBottomRight: 0, rotation: 0, perspectiveX: 0, perspectiveY: 0, cutout: true }
      expect(findMaskPatternIndex(config, patterns)).toBe(2)
    })

    it('finds rect mask with corner radius', () => {
      const config = { type: 'rect' as const, left: 0.25, right: 0.75, top: 0.15, bottom: 0.85, radiusTopLeft: 0.05, radiusTopRight: 0.05, radiusBottomLeft: 0.05, radiusBottomRight: 0.05, rotation: 0, perspectiveX: 0, perspectiveY: 0, cutout: true }
      expect(findMaskPatternIndex(config, patterns)).toBe(3)
    })

    it('finds blob mask with matching params', () => {
      const config = { type: 'blob' as const, centerX: 0.5, centerY: 0.5, baseRadius: 0.4, amplitude: 0.08, octaves: 2, seed: 1, cutout: true }
      expect(findMaskPatternIndex(config, patterns)).toBe(4)
    })

    it('returns null for blob with different seed', () => {
      const config = { type: 'blob' as const, centerX: 0.5, centerY: 0.5, baseRadius: 0.4, amplitude: 0.08, octaves: 2, seed: 999, cutout: true }
      expect(findMaskPatternIndex(config, patterns)).toBeNull()
    })

    it('returns null for custom params not in presets', () => {
      const config = { type: 'circle' as const, centerX: 0.2, centerY: 0.8, radius: 0.5, cutout: true }
      expect(findMaskPatternIndex(config, patterns)).toBeNull()
    })
  })
})
