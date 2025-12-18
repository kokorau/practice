import { describe, it, expect } from 'vitest'
import {
  apcaFromSrgb,
  apcaFromDisplayP3,
  apcaFromOklch,
  apcaFromY,
  meetsBodyText,
  meetsLargeText,
  meetsHeadline,
  meetsNonText,
  APCA_THRESHOLD,
  $APCA,
} from './APCA'

describe('APCA', () => {
  describe('apcaFromSrgb', () => {
    it('calculates high contrast for black on white', () => {
      const result = apcaFromSrgb(
        { r: 0, g: 0, b: 0 },      // black text
        { r: 1, g: 1, b: 1 }       // white bg
      )

      // Black on white should give high positive Lc
      expect(result.Lc).toBeGreaterThan(100)
      expect(result.polarity).toBe('dark-on-light')
      expect(meetsBodyText(result)).toBe(true)
    })

    it('calculates high contrast for white on black', () => {
      const result = apcaFromSrgb(
        { r: 1, g: 1, b: 1 },      // white text
        { r: 0, g: 0, b: 0 }       // black bg
      )

      // White on black should give high negative Lc
      expect(result.Lc).toBeLessThan(-100)
      expect(result.polarity).toBe('light-on-dark')
      expect(meetsBodyText(result)).toBe(true)
    })

    it('calculates zero contrast for same colors', () => {
      const gray = { r: 0.5, g: 0.5, b: 0.5 }
      const result = apcaFromSrgb(gray, gray)

      expect(result.Lc).toBe(0)
      expect(result.absLc).toBe(0)
    })

    it('calculates correct contrast for #246bb3 (brand) vs black/white', () => {
      // #246bb3 = rgb(36, 107, 179) = sRGB(0.141, 0.420, 0.702)
      const brand = { r: 36 / 255, g: 107 / 255, b: 179 / 255 }
      const white = { r: 1, g: 1, b: 1 }
      const black = { r: 0, g: 0, b: 0 }

      const whiteOnBrand = apcaFromSrgb(white, brand)
      const blackOnBrand = apcaFromSrgb(black, brand)

      // White text on blue bg should be light-on-dark (negative Lc)
      expect(whiteOnBrand.polarity).toBe('light-on-dark')
      expect(whiteOnBrand.Lc).toBeLessThan(0)

      // Black text on blue bg should be dark-on-light (positive Lc)
      expect(blackOnBrand.polarity).toBe('dark-on-light')
      expect(blackOnBrand.Lc).toBeGreaterThan(0)

      console.log('Brand #246bb3 contrast:')
      console.log(`  White on Brand: Lc = ${whiteOnBrand.Lc.toFixed(1)}`)
      console.log(`  Black on Brand: Lc = ${blackOnBrand.Lc.toFixed(1)}`)
    })

    it('is asymmetric (text vs bg order matters)', () => {
      const dark = { r: 0.2, g: 0.2, b: 0.2 }
      const light = { r: 0.9, g: 0.9, b: 0.9 }

      const darkOnLight = apcaFromSrgb(dark, light)
      const lightOnDark = apcaFromSrgb(light, dark)

      // Lc values should have opposite signs
      expect(darkOnLight.Lc).toBeGreaterThan(0)
      expect(lightOnDark.Lc).toBeLessThan(0)

      // Absolute values should be similar but not identical
      // (APCA uses different exponents for each polarity)
      expect(Math.abs(darkOnLight.Lc - Math.abs(lightOnDark.Lc))).toBeLessThan(10)
    })
  })

  describe('apcaFromDisplayP3', () => {
    it('calculates contrast for P3 colors', () => {
      // P3 white and black
      const white = { r: 1, g: 1, b: 1 }
      const black = { r: 0, g: 0, b: 0 }

      const result = apcaFromDisplayP3(black, white)

      // Should still give high contrast
      expect(result.absLc).toBeGreaterThan(100)
      expect(result.polarity).toBe('dark-on-light')
    })

    it('handles P3 colors outside sRGB gamut', () => {
      // Vivid P3 green (outside sRGB)
      const vividGreen = { r: 0, g: 1, b: 0 }
      const white = { r: 1, g: 1, b: 1 }

      const result = apcaFromDisplayP3(vividGreen, white)

      // Should calculate without error
      expect(typeof result.Lc).toBe('number')
      expect(result.textY).toBeGreaterThan(0)
    })
  })

  describe('apcaFromOklch', () => {
    it('calculates contrast for Oklch colors', () => {
      const white = { L: 1, C: 0, H: 0 }
      const black = { L: 0, C: 0, H: 0 }

      const result = apcaFromOklch(black, white)

      expect(result.absLc).toBeGreaterThan(100)
    })

    it('handles chromatic Oklch colors', () => {
      const blue = { L: 0.5, C: 0.15, H: 260 }
      const white = { L: 1, C: 0, H: 0 }

      const result = apcaFromOklch(blue, white)

      expect(result.polarity).toBe('dark-on-light')
      expect(result.Lc).toBeGreaterThan(0)
    })
  })

  describe('apcaFromY', () => {
    it('calculates Lc directly from Y values', () => {
      // Y=0 (black) on Y=1 (white)
      const Lc = apcaFromY(0, 1)
      expect(Lc).toBeGreaterThan(100)
    })
  })

  describe('threshold checks', () => {
    it('correctly identifies body text compliance', () => {
      const compliant = { Lc: 80, absLc: 80 } as any
      const nonCompliant = { Lc: 60, absLc: 60 } as any

      expect(meetsBodyText(compliant)).toBe(true)
      expect(meetsBodyText(nonCompliant)).toBe(false)
    })

    it('correctly identifies large text compliance', () => {
      const compliant = { Lc: 65, absLc: 65 } as any
      const nonCompliant = { Lc: 50, absLc: 50 } as any

      expect(meetsLargeText(compliant)).toBe(true)
      expect(meetsLargeText(nonCompliant)).toBe(false)
    })

    it('correctly identifies headline compliance', () => {
      const compliant = { Lc: 50, absLc: 50 } as any
      const nonCompliant = { Lc: 40, absLc: 40 } as any

      expect(meetsHeadline(compliant)).toBe(true)
      expect(meetsHeadline(nonCompliant)).toBe(false)
    })

    it('correctly identifies non-text compliance', () => {
      const compliant = { Lc: 35, absLc: 35 } as any
      const nonCompliant = { Lc: 25, absLc: 25 } as any

      expect(meetsNonText(compliant)).toBe(true)
      expect(meetsNonText(nonCompliant)).toBe(false)
    })
  })

  describe('$APCA namespace', () => {
    it('exports all functions', () => {
      expect($APCA.fromSrgb).toBeDefined()
      expect($APCA.fromDisplayP3).toBeDefined()
      expect($APCA.fromOklch).toBeDefined()
      expect($APCA.fromY).toBeDefined()
      expect($APCA.meetsBodyText).toBeDefined()
      expect($APCA.meetsLargeText).toBeDefined()
      expect($APCA.meetsHeadline).toBeDefined()
      expect($APCA.meetsNonText).toBeDefined()
      expect($APCA.THRESHOLD).toBe(APCA_THRESHOLD)
    })
  })
})
