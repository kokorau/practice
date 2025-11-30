import { describe, it, expect } from 'vitest'
import {
  generateOklchPalette,
  getDefaultGeneratorConfig,
  ChromaRangePresets,
  HueOffsetPresets,
  type PaletteGeneratorConfig,
} from './ColorPaletteGenerator'

describe('ColorPaletteGenerator', () => {
  describe('generateOklchPalette', () => {
    it('should generate a valid palette with default config', () => {
      const config = getDefaultGeneratorConfig()
      const palette = generateOklchPalette(config)

      expect(palette.id).toBe('oklch-generated')
      expect(palette.base).toBeDefined()
      expect(palette.onBase).toBeDefined()
      expect(palette.primary).toBeDefined()
      expect(palette.onPrimary).toBeDefined()
      expect(palette.secondary).toBeDefined()
      expect(palette.onSecondary).toBeDefined()
      expect(palette.brand).toBeDefined()
      expect(palette.onBrand).toBeDefined()
    })

    it('should generate colors within sRGB gamut (0-1 range)', () => {
      const config = getDefaultGeneratorConfig()
      const palette = generateOklchPalette(config)

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

    it('should generate different palettes for different brand hues', () => {
      const config1: PaletteGeneratorConfig = {
        ...getDefaultGeneratorConfig(),
        brandHue: 0, // Red
      }
      const config2: PaletteGeneratorConfig = {
        ...getDefaultGeneratorConfig(),
        brandHue: 120, // Green
      }
      const config3: PaletteGeneratorConfig = {
        ...getDefaultGeneratorConfig(),
        brandHue: 240, // Blue
      }

      const palette1 = generateOklchPalette(config1)
      const palette2 = generateOklchPalette(config2)
      const palette3 = generateOklchPalette(config3)

      expect(palette1.brand).not.toEqual(palette2.brand)
      expect(palette2.brand).not.toEqual(palette3.brand)
      expect(palette1.brand).not.toEqual(palette3.brand)
    })

    it('should apply hue offset for primary and secondary', () => {
      const config: PaletteGeneratorConfig = {
        ...getDefaultGeneratorConfig(),
        brandHue: 0,
        primaryHueOffset: 'complementary', // +180
        secondaryHueOffset: 'triadic120',  // +120
      }

      const palette = generateOklchPalette(config)

      // Primary and secondary should be different from brand
      expect(palette.primary).not.toEqual(palette.brand)
      expect(palette.secondary).not.toEqual(palette.brand)
      expect(palette.primary).not.toEqual(palette.secondary)
    })

    it('should generate dark mode palette', () => {
      const lightConfig = getDefaultGeneratorConfig()
      const darkConfig: PaletteGeneratorConfig = {
        ...getDefaultGeneratorConfig(),
        isDark: true,
      }

      const lightPalette = generateOklchPalette(lightConfig)
      const darkPalette = generateOklchPalette(darkConfig)

      // Base should be darker in dark mode
      const lightBaseLuminance =
        0.299 * lightPalette.base.r +
        0.587 * lightPalette.base.g +
        0.114 * lightPalette.base.b

      const darkBaseLuminance =
        0.299 * darkPalette.base.r +
        0.587 * darkPalette.base.g +
        0.114 * darkPalette.base.b

      expect(darkBaseLuminance).toBeLessThan(lightBaseLuminance)
    })
  })

  describe('HueOffsetPresets', () => {
    it('should have correct offset values', () => {
      expect(HueOffsetPresets.same.offset).toBe(0)
      expect(HueOffsetPresets.complementary.offset).toBe(180)
      expect(HueOffsetPresets.triadic120.offset).toBe(120)
      expect(HueOffsetPresets.splitComp150.offset).toBe(150)
    })
  })

  describe('ChromaRangePresets', () => {
    it('should have valid preset values', () => {
      expect(ChromaRangePresets.subtle.min).toBeLessThan(ChromaRangePresets.subtle.max)
      expect(ChromaRangePresets.standard.min).toBeLessThan(ChromaRangePresets.standard.max)
      expect(ChromaRangePresets.vivid.min).toBeLessThan(ChromaRangePresets.vivid.max)
    })

    it('should have ascending intensity order', () => {
      expect(ChromaRangePresets.subtle.max).toBeLessThan(ChromaRangePresets.standard.max)
      expect(ChromaRangePresets.standard.max).toBeLessThan(ChromaRangePresets.vivid.max)
    })
  })

  describe('getDefaultGeneratorConfig', () => {
    it('should return valid default config', () => {
      const config = getDefaultGeneratorConfig()

      expect(config.brandHue).toBeGreaterThanOrEqual(0)
      expect(config.brandHue).toBeLessThanOrEqual(360)
      expect(config.lightness).toBeGreaterThanOrEqual(0.5)
      expect(config.lightness).toBeLessThanOrEqual(0.8)
      expect(config.chromaRange.min).toBeLessThan(config.chromaRange.max)
      expect(config.isDark).toBe(false)
      expect(config.primaryHueOffset).toBeDefined()
      expect(config.secondaryHueOffset).toBeDefined()
    })
  })
})
