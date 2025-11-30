import { describe, it, expect } from 'vitest'
import {
  generateColorCssVariables,
  cssVariablesToStyleString,
  type ColorCssVariables,
} from './ColorCssVariables'
import type { ColorPalette } from '../../../ColorPalette/Domain/ValueObject'
import { $Srgb, type Srgb } from '../../../Color/Domain/ValueObject'

describe('ColorCssVariables', () => {
  // Helper to create a color palette for testing
  const createPalette = (overrides?: Partial<ColorPalette>): ColorPalette => ({
    base: $Srgb.create(1, 1, 1),       // white
    onBase: $Srgb.create(0, 0, 0),     // black
    primary: $Srgb.create(0.2, 0.4, 0.8),
    onPrimary: $Srgb.create(1, 1, 1),
    secondary: $Srgb.create(0.5, 0.5, 0.5),
    onSecondary: $Srgb.create(0, 0, 0),
    brand: $Srgb.create(0.8, 0.2, 0.2),
    onBrand: $Srgb.create(1, 1, 1),
    ...overrides,
  })

  describe('generateColorCssVariables', () => {
    it('should generate CSS variables for all palette colors', () => {
      const palette = createPalette()
      const vars = generateColorCssVariables(palette)

      expect(vars).toHaveProperty('--color-base')
      expect(vars).toHaveProperty('--color-on-base')
      expect(vars).toHaveProperty('--color-primary')
      expect(vars).toHaveProperty('--color-on-primary')
      expect(vars).toHaveProperty('--color-secondary')
      expect(vars).toHaveProperty('--color-on-secondary')
      expect(vars).toHaveProperty('--color-brand')
      expect(vars).toHaveProperty('--color-on-brand')
    })

    it('should convert white (1,1,1) to "255 255 255"', () => {
      const palette = createPalette({
        base: $Srgb.create(1, 1, 1),
      })

      const vars = generateColorCssVariables(palette)

      expect(vars['--color-base']).toBe('255 255 255')
    })

    it('should convert black (0,0,0) to "0 0 0"', () => {
      const palette = createPalette({
        onBase: $Srgb.create(0, 0, 0),
      })

      const vars = generateColorCssVariables(palette)

      expect(vars['--color-on-base']).toBe('0 0 0')
    })

    it('should convert mid-gray (0.5,0.5,0.5) to "128 128 128"', () => {
      const palette = createPalette({
        secondary: $Srgb.create(0.5, 0.5, 0.5),
      })

      const vars = generateColorCssVariables(palette)

      expect(vars['--color-secondary']).toBe('128 128 128')
    })

    it('should round color values correctly', () => {
      // 0.2 * 255 = 51
      // 0.4 * 255 = 102
      // 0.8 * 255 = 204
      const palette = createPalette({
        primary: $Srgb.create(0.2, 0.4, 0.8),
      })

      const vars = generateColorCssVariables(palette)

      expect(vars['--color-primary']).toBe('51 102 204')
    })

    it('should handle pure red color', () => {
      const palette = createPalette({
        brand: $Srgb.create(1, 0, 0),
      })

      const vars = generateColorCssVariables(palette)

      expect(vars['--color-brand']).toBe('255 0 0')
    })

    it('should handle pure green color', () => {
      const palette = createPalette({
        brand: $Srgb.create(0, 1, 0),
      })

      const vars = generateColorCssVariables(palette)

      expect(vars['--color-brand']).toBe('0 255 0')
    })

    it('should handle pure blue color', () => {
      const palette = createPalette({
        brand: $Srgb.create(0, 0, 1),
      })

      const vars = generateColorCssVariables(palette)

      expect(vars['--color-brand']).toBe('0 0 255')
    })
  })

  describe('cssVariablesToStyleString', () => {
    it('should convert CSS variables to style string', () => {
      const vars: ColorCssVariables = {
        '--color-base': '255 255 255',
        '--color-on-base': '0 0 0',
        '--color-primary': '51 102 204',
        '--color-on-primary': '255 255 255',
        '--color-secondary': '128 128 128',
        '--color-on-secondary': '0 0 0',
        '--color-brand': '204 51 51',
        '--color-on-brand': '255 255 255',
      }

      const styleString = cssVariablesToStyleString(vars)

      expect(styleString).toContain('--color-base: 255 255 255;')
      expect(styleString).toContain('--color-on-base: 0 0 0;')
      expect(styleString).toContain('--color-primary: 51 102 204;')
      expect(styleString).toContain('--color-on-primary: 255 255 255;')
      expect(styleString).toContain('--color-secondary: 128 128 128;')
      expect(styleString).toContain('--color-on-secondary: 0 0 0;')
      expect(styleString).toContain('--color-brand: 204 51 51;')
      expect(styleString).toContain('--color-on-brand: 255 255 255;')
    })

    it('should separate entries with newlines', () => {
      const vars: ColorCssVariables = {
        '--color-base': '255 255 255',
        '--color-on-base': '0 0 0',
        '--color-primary': '51 102 204',
        '--color-on-primary': '255 255 255',
        '--color-secondary': '128 128 128',
        '--color-on-secondary': '0 0 0',
        '--color-brand': '204 51 51',
        '--color-on-brand': '255 255 255',
      }

      const styleString = cssVariablesToStyleString(vars)
      const lines = styleString.split('\n')

      expect(lines.length).toBe(8)
    })

    it('should produce valid CSS syntax', () => {
      const vars: ColorCssVariables = {
        '--color-base': '100 150 200',
        '--color-on-base': '50 50 50',
        '--color-primary': '200 100 50',
        '--color-on-primary': '255 255 255',
        '--color-secondary': '75 125 175',
        '--color-on-secondary': '0 0 0',
        '--color-brand': '220 80 80',
        '--color-on-brand': '255 255 255',
      }

      const styleString = cssVariablesToStyleString(vars)

      // Each line should end with semicolon
      const lines = styleString.split('\n')
      lines.forEach(line => {
        expect(line).toMatch(/^--color-[a-z-]+: \d+ \d+ \d+;$/)
      })
    })
  })

  describe('integration', () => {
    it('should create usable CSS from palette', () => {
      const palette = createPalette()
      const vars = generateColorCssVariables(palette)
      const styleString = cssVariablesToStyleString(vars)

      // Should be a non-empty string with multiple lines
      expect(styleString.length).toBeGreaterThan(0)
      expect(styleString.split('\n').length).toBe(8)

      // Should contain all expected variable names
      expect(styleString).toContain('--color-base')
      expect(styleString).toContain('--color-on-base')
      expect(styleString).toContain('--color-primary')
      expect(styleString).toContain('--color-brand')
    })
  })
})
