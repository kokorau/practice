import { describe, it, expect } from 'vitest'
import { $Palette, type PaletteColor } from './Palette'
import type { Srgb } from '../../Color/Domain'

describe('$Palette', () => {
  const createTestColor = (r: number, g: number, b: number, weight: number): PaletteColor => ({
    color: { r, g, b } as Srgb,
    weight,
  })

  describe('create', () => {
    it('should create a palette with 4 colors', () => {
      const colors: [PaletteColor, PaletteColor, PaletteColor, PaletteColor] = [
        createTestColor(1, 0, 0, 0.4),
        createTestColor(0, 1, 0, 0.3),
        createTestColor(0, 0, 1, 0.2),
        createTestColor(1, 1, 1, 0.1),
      ]

      const palette = $Palette.create({ colors })

      expect(palette.colors).toHaveLength(4)
      expect(palette.colors[0]).toBe(colors[0])
      expect(palette.colors[1]).toBe(colors[1])
      expect(palette.colors[2]).toBe(colors[2])
      expect(palette.colors[3]).toBe(colors[3])
    })
  })

  describe('sortedByWeight', () => {
    it('should sort colors by weight descending', () => {
      const colors: [PaletteColor, PaletteColor, PaletteColor, PaletteColor] = [
        createTestColor(1, 0, 0, 0.1), // smallest
        createTestColor(0, 1, 0, 0.4), // largest
        createTestColor(0, 0, 1, 0.2),
        createTestColor(1, 1, 1, 0.3),
      ]

      const palette = $Palette.create({ colors })
      const sorted = $Palette.sortedByWeight(palette)

      expect(sorted[0]!.weight).toBe(0.4) // green first
      expect(sorted[1]!.weight).toBe(0.3)
      expect(sorted[2]!.weight).toBe(0.2)
      expect(sorted[3]!.weight).toBe(0.1) // red last
    })

    it('should not modify the original palette', () => {
      const colors: [PaletteColor, PaletteColor, PaletteColor, PaletteColor] = [
        createTestColor(1, 0, 0, 0.1),
        createTestColor(0, 1, 0, 0.4),
        createTestColor(0, 0, 1, 0.2),
        createTestColor(1, 1, 1, 0.3),
      ]

      const palette = $Palette.create({ colors })
      $Palette.sortedByWeight(palette)

      // Original order should be preserved
      expect(palette.colors[0]!.weight).toBe(0.1)
      expect(palette.colors[1]!.weight).toBe(0.4)
    })
  })

  describe('dominant', () => {
    it('should return the color with highest weight', () => {
      const colors: [PaletteColor, PaletteColor, PaletteColor, PaletteColor] = [
        createTestColor(1, 0, 0, 0.1),
        createTestColor(0, 1, 0, 0.5), // dominant
        createTestColor(0, 0, 1, 0.2),
        createTestColor(1, 1, 1, 0.2),
      ]

      const palette = $Palette.create({ colors })
      const dominant = $Palette.dominant(palette)

      expect(dominant.weight).toBe(0.5)
      expect(dominant.color.g).toBe(1) // green is dominant
    })
  })

  describe('toHexArray', () => {
    it('should convert all colors to hex strings', () => {
      const colors: [PaletteColor, PaletteColor, PaletteColor, PaletteColor] = [
        createTestColor(1, 0, 0, 0.25), // #ff0000
        createTestColor(0, 1, 0, 0.25), // #00ff00
        createTestColor(0, 0, 1, 0.25), // #0000ff
        createTestColor(1, 1, 1, 0.25), // #ffffff
      ]

      const palette = $Palette.create({ colors })
      const hexArray = $Palette.toHexArray(palette)

      expect(hexArray).toHaveLength(4)
      expect(hexArray[0]).toBe('#ff0000')
      expect(hexArray[1]).toBe('#00ff00')
      expect(hexArray[2]).toBe('#0000ff')
      expect(hexArray[3]).toBe('#ffffff')
    })

    it('should preserve order from palette', () => {
      const colors: [PaletteColor, PaletteColor, PaletteColor, PaletteColor] = [
        createTestColor(0, 0, 0, 0.1), // #000000
        createTestColor(0.5, 0.5, 0.5, 0.3), // ~#808080
        createTestColor(1, 0.5, 0, 0.4), // ~#ff8000
        createTestColor(1, 1, 1, 0.2), // #ffffff
      ]

      const palette = $Palette.create({ colors })
      const hexArray = $Palette.toHexArray(palette)

      expect(hexArray[0]).toBe('#000000')
      expect(hexArray[3]).toBe('#ffffff')
    })
  })
})
