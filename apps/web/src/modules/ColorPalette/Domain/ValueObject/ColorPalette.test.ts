import { describe, it, expect } from 'vitest'
import { $ColorPalette } from './ColorPalette'

describe('ColorPalette', () => {
  describe('$ColorPalette.createDefault', () => {
    it('should create a default palette with all required colors', () => {
      const palette = $ColorPalette.createDefault()

      expect(palette.id).toBe('default')
      expect(palette.name).toBe('Default Palette')

      // Check all color pairs exist
      expect(palette.base).toBeDefined()
      expect(palette.onBase).toBeDefined()
      expect(palette.primary).toBeDefined()
      expect(palette.onPrimary).toBeDefined()
      expect(palette.secondary).toBeDefined()
      expect(palette.onSecondary).toBeDefined()
      expect(palette.brand).toBeDefined()
      expect(palette.onBrand).toBeDefined()
    })

    it('should have valid sRGB values (0-1 range)', () => {
      const palette = $ColorPalette.createDefault()

      const colors = [
        palette.base,
        palette.onBase,
        palette.primary,
        palette.onPrimary,
        palette.secondary,
        palette.onSecondary,
        palette.brand,
        palette.onBrand,
      ]

      colors.forEach((color) => {
        expect(color.r).toBeGreaterThanOrEqual(0)
        expect(color.r).toBeLessThanOrEqual(1)
        expect(color.g).toBeGreaterThanOrEqual(0)
        expect(color.g).toBeLessThanOrEqual(1)
        expect(color.b).toBeGreaterThanOrEqual(0)
        expect(color.b).toBeLessThanOrEqual(1)
      })
    })
  })

  describe('$ColorPalette.create', () => {
    it('should create a custom palette with provided values', () => {
      const palette = $ColorPalette.create({
        id: 'custom',
        name: 'Custom Palette',
        primary: { r: 1, g: 0, b: 0 },
      })

      expect(palette.id).toBe('custom')
      expect(palette.name).toBe('Custom Palette')
      expect(palette.primary).toEqual({ r: 1, g: 0, b: 0 })
    })

    it('should use default values for unspecified colors', () => {
      const defaultPalette = $ColorPalette.createDefault()
      const customPalette = $ColorPalette.create({
        id: 'partial',
        primary: { r: 0.5, g: 0.5, b: 0.5 },
      })

      // Custom value should be applied
      expect(customPalette.primary).toEqual({ r: 0.5, g: 0.5, b: 0.5 })

      // Other values should be defaults
      expect(customPalette.base).toEqual(defaultPalette.base)
      expect(customPalette.secondary).toEqual(defaultPalette.secondary)
    })
  })
})
