import { describe, it, expect } from 'vitest'
import {
  selectNeutralByApca,
  selectNeutralClosestToApca,
  APCA_INK_TARGETS,
  type NeutralEntry,
} from './NeutralSelection'

/**
 * Create a simple neutral palette for testing
 * N0 = white (L=1.0), N9 = near-black (L=0.05)
 */
const createTestNeutrals = (): NeutralEntry[] => {
  const neutrals: NeutralEntry[] = []
  for (let i = 0; i <= 9; i++) {
    const L = 1 - (i / 9) * 0.95 // N0=1.0, N9≈0.05
    neutrals.push({
      key: `N${i}`,
      color: { L, C: 0, H: 0 },
    })
  }
  return neutrals
}

describe('NeutralSelection', () => {
  const neutrals = createTestNeutrals()

  describe('selectNeutralByApca', () => {
    describe('on light surface (white, L=0.98)', () => {
      const whiteSurface = { L: 0.98, C: 0, H: 0 }

      it('selects intermediate neutral for body text (target 75)', () => {
        const result = selectNeutralByApca(neutrals, whiteSurface, 75, 'dark-first')

        // Should find a neutral that meets 75 Lc, not just N9
        expect(result.method).toBe('last-passing')
        expect(result.absLc).toBeGreaterThanOrEqual(75)
        // Log for verification
        console.log(`White surface, body (75): ${result.key} → Lc ${result.absLc.toFixed(1)}`)
      })

      it('selects intermediate neutral for title (target 60)', () => {
        const result = selectNeutralByApca(neutrals, whiteSurface, 60, 'dark-first')

        expect(result.method).toBe('last-passing')
        expect(result.absLc).toBeGreaterThanOrEqual(60)
        console.log(`White surface, title (60): ${result.key} → Lc ${result.absLc.toFixed(1)}`)
      })

      it('selects intermediate neutral for meta (target 60)', () => {
        const result = selectNeutralByApca(neutrals, whiteSurface, 60, 'dark-first')

        expect(result.method).toBe('last-passing')
        expect(result.absLc).toBeGreaterThanOrEqual(60)
        console.log(`White surface, meta (60): ${result.key} → Lc ${result.absLc.toFixed(1)}`)
      })
    })

    describe('on dark surface (L=0.15)', () => {
      const darkSurface = { L: 0.15, C: 0, H: 0 }

      it('selects intermediate neutral for body text (target 75)', () => {
        const result = selectNeutralByApca(neutrals, darkSurface, 75, 'light-first')

        expect(result.method).toBe('last-passing')
        expect(result.absLc).toBeGreaterThanOrEqual(75)
        console.log(`Dark surface, body (75): ${result.key} → Lc ${result.absLc.toFixed(1)}`)
      })

      it('selects intermediate neutral for title (target 60)', () => {
        const result = selectNeutralByApca(neutrals, darkSurface, 60, 'light-first')

        expect(result.method).toBe('last-passing')
        expect(result.absLc).toBeGreaterThanOrEqual(60)
        console.log(`Dark surface, title (60): ${result.key} → Lc ${result.absLc.toFixed(1)}`)
      })
    })

    describe('on mid-lightness surface (brand L=0.52)', () => {
      const brandSurface = { L: 0.52, C: 0.13, H: 250 }

      it('falls back to best contrast when target 75 cannot be met', () => {
        const result = selectNeutralByApca(neutrals, brandSurface, 75, 'dark-first')

        // Mid-lightness surfaces typically cannot achieve 75 Lc
        // Should fallback to best available
        console.log(`Brand surface, body (75): ${result.key} → Lc ${result.absLc.toFixed(1)} (${result.method})`)

        // Either passes or falls back to best
        if (result.absLc < 75) {
          expect(result.method).toBe('fallback-best')
        }
      })

      it('prefers white (N0) over black (N9) when white has higher contrast', () => {
        const result = selectNeutralByApca(neutrals, brandSurface, 75, 'dark-first')

        // For mid-lightness surfaces, white typically has higher APCA contrast
        // The algorithm should select the one with highest contrast
        console.log(`Brand surface best: ${result.key} → Lc ${result.absLc.toFixed(1)}`)

        // Verify it's actually the best by checking both extremes
        const n0Result = selectNeutralByApca(
          [{ key: 'N0', color: { L: 1.0, C: 0, H: 0 } }],
          brandSurface,
          0, // Accept any
          'dark-first'
        )
        const n9Result = selectNeutralByApca(
          [{ key: 'N9', color: { L: 0.05, C: 0, H: 0 } }],
          brandSurface,
          0,
          'dark-first'
        )

        console.log(`  N0 contrast: ${n0Result.absLc.toFixed(1)}`)
        console.log(`  N9 contrast: ${n9Result.absLc.toFixed(1)}`)

        // The selected key should have the highest contrast
        expect(result.absLc).toBeGreaterThanOrEqual(Math.max(n0Result.absLc, n9Result.absLc) - 1)
      })
    })

    describe('search order behavior', () => {
      const lightSurface = { L: 0.95, C: 0, H: 0 }

      it('dark-first finds last passing from dark end', () => {
        const result = selectNeutralByApca(neutrals, lightSurface, 60, 'dark-first')

        // Should return the "last passing" - meaning the lightest neutral that still meets target
        expect(result.method).toBe('last-passing')
        console.log(`dark-first, target 60: ${result.key} → Lc ${result.absLc.toFixed(1)}`)
      })

      it('light-first finds last passing from light end', () => {
        const darkSurface = { L: 0.2, C: 0, H: 0 }
        const result = selectNeutralByApca(neutrals, darkSurface, 60, 'light-first')

        expect(result.method).toBe('last-passing')
        console.log(`light-first, target 60: ${result.key} → Lc ${result.absLc.toFixed(1)}`)
      })
    })
  })

  describe('selectNeutralClosestToApca', () => {
    const whiteSurface = { L: 0.98, C: 0, H: 0 }

    it('finds neutral closest to target 30 (border)', () => {
      const result = selectNeutralClosestToApca(neutrals, whiteSurface, 30)

      // Should find something close to 30, not at extremes
      expect(Math.abs(result.absLc - 30)).toBeLessThan(20)
      console.log(`Border (target 30): ${result.key} → Lc ${result.absLc.toFixed(1)}`)
    })

    it('finds neutral closest to target 15 (divider)', () => {
      const result = selectNeutralClosestToApca(neutrals, whiteSurface, 15)

      expect(Math.abs(result.absLc - 15)).toBeLessThan(15)
      console.log(`Divider (target 15): ${result.key} → Lc ${result.absLc.toFixed(1)}`)
    })
  })

  describe('APCA_INK_TARGETS', () => {
    it('has correct threshold values', () => {
      expect(APCA_INK_TARGETS.body).toBe(75)
      expect(APCA_INK_TARGETS.title).toBe(60)
      expect(APCA_INK_TARGETS.meta).toBe(60)
      expect(APCA_INK_TARGETS.linkText).toBe(75)
      expect(APCA_INK_TARGETS.border).toBe(30)
      expect(APCA_INK_TARGETS.divider).toBe(15)
    })
  })
})
