import { describe, it, expect } from 'vitest'
import {
  defaultStylePack,
  roundedToCss,
  leadingToCss,
  gapToMultiplier,
  paddingToMultiplier,
  type StylePack,
  type RoundedSize,
  type SpacingSize,
} from './StylePack'

describe('StylePack', () => {
  describe('defaultStylePack', () => {
    it('should have all required properties', () => {
      expect(defaultStylePack).toHaveProperty('rounded')
      expect(defaultStylePack).toHaveProperty('font')
      expect(defaultStylePack).toHaveProperty('leading')
      expect(defaultStylePack).toHaveProperty('gap')
      expect(defaultStylePack).toHaveProperty('padding')
    })

    it('should have valid default values', () => {
      expect(defaultStylePack.rounded).toBe('md')
      expect(defaultStylePack.leading).toBe('normal')
      expect(defaultStylePack.gap).toBe('normal')
      expect(defaultStylePack.padding).toBe('normal')
    })

    it('should have font config with heading and body', () => {
      expect(defaultStylePack.font.heading).toBe('inherit')
      expect(defaultStylePack.font.body).toBe('inherit')
    })
  })

  describe('roundedToCss', () => {
    it('should have all rounded sizes', () => {
      const sizes: RoundedSize[] = ['none', 'sm', 'md', 'lg', 'full']
      sizes.forEach(size => {
        expect(roundedToCss).toHaveProperty(size)
      })
    })

    it('should map none to 0', () => {
      expect(roundedToCss.none).toBe('0')
    })

    it('should map sm to 0.25rem', () => {
      expect(roundedToCss.sm).toBe('0.25rem')
    })

    it('should map md to 0.5rem', () => {
      expect(roundedToCss.md).toBe('0.5rem')
    })

    it('should map lg to 1rem', () => {
      expect(roundedToCss.lg).toBe('1rem')
    })

    it('should map full to 9999px', () => {
      expect(roundedToCss.full).toBe('9999px')
    })

    it('should have increasing values from sm to lg', () => {
      const smValue = parseFloat(roundedToCss.sm)
      const mdValue = parseFloat(roundedToCss.md)
      const lgValue = parseFloat(roundedToCss.lg)

      expect(smValue).toBeLessThan(mdValue)
      expect(mdValue).toBeLessThan(lgValue)
    })
  })

  describe('leadingToCss', () => {
    it('should have all spacing sizes', () => {
      const sizes: SpacingSize[] = ['tight', 'normal', 'relaxed']
      sizes.forEach(size => {
        expect(leadingToCss).toHaveProperty(size)
      })
    })

    it('should map tight to 1.25', () => {
      expect(leadingToCss.tight).toBe('1.25')
    })

    it('should map normal to 1.5', () => {
      expect(leadingToCss.normal).toBe('1.5')
    })

    it('should map relaxed to 1.75', () => {
      expect(leadingToCss.relaxed).toBe('1.75')
    })

    it('should have increasing values from tight to relaxed', () => {
      expect(parseFloat(leadingToCss.tight)).toBeLessThan(parseFloat(leadingToCss.normal))
      expect(parseFloat(leadingToCss.normal)).toBeLessThan(parseFloat(leadingToCss.relaxed))
    })
  })

  describe('gapToMultiplier', () => {
    it('should have all spacing sizes', () => {
      const sizes: SpacingSize[] = ['tight', 'normal', 'relaxed']
      sizes.forEach(size => {
        expect(gapToMultiplier).toHaveProperty(size)
      })
    })

    it('should have normal at 1', () => {
      expect(gapToMultiplier.normal).toBe(1)
    })

    it('should have tight less than normal', () => {
      expect(gapToMultiplier.tight).toBeLessThan(gapToMultiplier.normal)
    })

    it('should have relaxed greater than normal', () => {
      expect(gapToMultiplier.relaxed).toBeGreaterThan(gapToMultiplier.normal)
    })

    it('should have correct multiplier values', () => {
      expect(gapToMultiplier.tight).toBe(0.75)
      expect(gapToMultiplier.relaxed).toBe(1.5)
    })
  })

  describe('paddingToMultiplier', () => {
    it('should have all spacing sizes', () => {
      const sizes: SpacingSize[] = ['tight', 'normal', 'relaxed']
      sizes.forEach(size => {
        expect(paddingToMultiplier).toHaveProperty(size)
      })
    })

    it('should have normal at 1', () => {
      expect(paddingToMultiplier.normal).toBe(1)
    })

    it('should have tight less than normal', () => {
      expect(paddingToMultiplier.tight).toBeLessThan(paddingToMultiplier.normal)
    })

    it('should have relaxed greater than normal', () => {
      expect(paddingToMultiplier.relaxed).toBeGreaterThan(paddingToMultiplier.normal)
    })

    it('should have correct multiplier values', () => {
      expect(paddingToMultiplier.tight).toBe(0.75)
      expect(paddingToMultiplier.relaxed).toBe(1.25)
    })
  })
})
