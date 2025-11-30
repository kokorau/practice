import { describe, it, expect } from 'vitest'
import { $ProfiledPalette, type ProfiledPalette } from './ProfiledPalette'
import type { ColorProfile } from './ColorProfile'
import { $Srgb, type Srgb } from '../../Color/Domain'

describe('$ProfiledPalette', () => {
  // Helper to create a color profile
  const createProfile = (
    r: number,
    g: number,
    b: number,
    role: ColorProfile['role'],
    weight: number,
    confidence: number
  ): ColorProfile => ({
    color: $Srgb.create(r, g, b),
    role,
    weight,
    confidence,
  })

  describe('create', () => {
    it('should create palette with colors', () => {
      const colors: ColorProfile[] = [
        createProfile(0.1, 0.1, 0.1, 'background', 0.5, 0.9),
        createProfile(0.9, 0.9, 0.9, 'text', 0.3, 0.8),
        createProfile(0.8, 0.2, 0.2, 'accent', 0.2, 0.7),
      ]

      const palette = $ProfiledPalette.create({ colors })

      expect(palette.colors).toHaveLength(3)
    })

    it('should find background color with highest confidence', () => {
      const colors: ColorProfile[] = [
        createProfile(0.1, 0.1, 0.1, 'background', 0.5, 0.7),
        createProfile(0.2, 0.2, 0.2, 'background', 0.3, 0.9), // higher confidence
        createProfile(0.9, 0.9, 0.9, 'text', 0.2, 0.8),
      ]

      const palette = $ProfiledPalette.create({ colors })

      expect(palette.background).not.toBeNull()
      expect(palette.background?.confidence).toBe(0.9)
    })

    it('should find text color with highest confidence', () => {
      const colors: ColorProfile[] = [
        createProfile(0.8, 0.8, 0.8, 'text', 0.3, 0.6),
        createProfile(0.9, 0.9, 0.9, 'text', 0.2, 0.95), // higher confidence
        createProfile(0.1, 0.1, 0.1, 'background', 0.5, 0.8),
      ]

      const palette = $ProfiledPalette.create({ colors })

      expect(palette.text).not.toBeNull()
      expect(palette.text?.confidence).toBe(0.95)
    })

    it('should find accent color with highest confidence', () => {
      const colors: ColorProfile[] = [
        createProfile(0.8, 0.2, 0.2, 'accent', 0.1, 0.5),
        createProfile(0.2, 0.8, 0.2, 'accent', 0.1, 0.85), // higher confidence
        createProfile(0.1, 0.1, 0.1, 'background', 0.5, 0.8),
      ]

      const palette = $ProfiledPalette.create({ colors })

      expect(palette.accent).not.toBeNull()
      expect(palette.accent?.confidence).toBe(0.85)
    })

    it('should return null for missing roles', () => {
      const colors: ColorProfile[] = [
        createProfile(0.1, 0.1, 0.1, 'background', 0.5, 0.9),
      ]

      const palette = $ProfiledPalette.create({ colors })

      expect(palette.background).not.toBeNull()
      expect(palette.text).toBeNull()
      expect(palette.accent).toBeNull()
    })

    it('should handle unknown role colors', () => {
      const colors: ColorProfile[] = [
        createProfile(0.5, 0.5, 0.5, 'unknown', 0.5, 0.7),
        createProfile(0.6, 0.6, 0.6, 'unknown', 0.3, 0.6),
      ]

      const palette = $ProfiledPalette.create({ colors })

      expect(palette.colors).toHaveLength(2)
      expect(palette.background).toBeNull()
      expect(palette.text).toBeNull()
      expect(palette.accent).toBeNull()
    })

    it('should handle empty color array', () => {
      const palette = $ProfiledPalette.create({ colors: [] })

      expect(palette.colors).toHaveLength(0)
      expect(palette.background).toBeNull()
      expect(palette.text).toBeNull()
      expect(palette.accent).toBeNull()
    })
  })

  describe('sortedByWeight', () => {
    it('should sort colors by weight in descending order', () => {
      const colors: ColorProfile[] = [
        createProfile(0.1, 0.1, 0.1, 'background', 0.3, 0.9),
        createProfile(0.9, 0.9, 0.9, 'text', 0.5, 0.8), // highest weight
        createProfile(0.8, 0.2, 0.2, 'accent', 0.2, 0.7),
      ]
      const palette = $ProfiledPalette.create({ colors })

      const sorted = $ProfiledPalette.sortedByWeight(palette)

      expect(sorted[0]?.weight).toBe(0.5)
      expect(sorted[1]?.weight).toBe(0.3)
      expect(sorted[2]?.weight).toBe(0.2)
    })

    it('should not modify original palette', () => {
      const colors: ColorProfile[] = [
        createProfile(0.1, 0.1, 0.1, 'background', 0.3, 0.9),
        createProfile(0.9, 0.9, 0.9, 'text', 0.5, 0.8),
      ]
      const palette = $ProfiledPalette.create({ colors })
      const originalFirst = palette.colors[0]

      $ProfiledPalette.sortedByWeight(palette)

      expect(palette.colors[0]).toBe(originalFirst)
    })

    it('should handle empty palette', () => {
      const palette = $ProfiledPalette.create({ colors: [] })

      const sorted = $ProfiledPalette.sortedByWeight(palette)

      expect(sorted).toHaveLength(0)
    })
  })

  describe('toHexArray', () => {
    it('should convert colors to hex strings', () => {
      const colors: ColorProfile[] = [
        createProfile(1, 0, 0, 'accent', 0.3, 0.9), // red
        createProfile(0, 1, 0, 'accent', 0.3, 0.8), // green
        createProfile(0, 0, 1, 'accent', 0.3, 0.7), // blue
      ]
      const palette = $ProfiledPalette.create({ colors })

      const hexArray = $ProfiledPalette.toHexArray(palette)

      expect(hexArray).toHaveLength(3)
      expect(hexArray[0]).toBe('#ff0000')
      expect(hexArray[1]).toBe('#00ff00')
      expect(hexArray[2]).toBe('#0000ff')
    })

    it('should handle black and white', () => {
      const colors: ColorProfile[] = [
        createProfile(0, 0, 0, 'background', 0.5, 0.9), // black
        createProfile(1, 1, 1, 'text', 0.5, 0.9), // white
      ]
      const palette = $ProfiledPalette.create({ colors })

      const hexArray = $ProfiledPalette.toHexArray(palette)

      expect(hexArray[0]).toBe('#000000')
      expect(hexArray[1]).toBe('#ffffff')
    })

    it('should handle empty palette', () => {
      const palette = $ProfiledPalette.create({ colors: [] })

      const hexArray = $ProfiledPalette.toHexArray(palette)

      expect(hexArray).toHaveLength(0)
    })
  })
})
