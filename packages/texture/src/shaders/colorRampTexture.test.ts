import { describe, it, expect } from 'vitest'
import { generateColorRampData, COLOR_RAMP_WIDTH, type ColorStop } from './colorRampTexture'

describe('colorRampTexture', () => {
  describe('generateColorRampData', () => {
    it('generates correct size output', () => {
      const stops: ColorStop[] = [
        { color: [1, 0, 0, 1], position: 0 },
        { color: [0, 0, 1, 1], position: 1 },
      ]

      const data = generateColorRampData(stops)

      expect(data).toBeInstanceOf(Uint8Array)
      expect(data.length).toBe(COLOR_RAMP_WIDTH * 4)
    })

    it('generates solid color for single stop', () => {
      const stops: ColorStop[] = [
        { color: [1, 0, 0, 1], position: 0.5 },
      ]

      const data = generateColorRampData(stops)

      // All pixels should be red
      for (let i = 0; i < COLOR_RAMP_WIDTH; i++) {
        const offset = i * 4
        expect(data[offset]).toBe(255)     // R
        expect(data[offset + 1]).toBe(0)   // G
        expect(data[offset + 2]).toBe(0)   // B
        expect(data[offset + 3]).toBe(255) // A
      }
    })

    it('interpolates between two stops', () => {
      const stops: ColorStop[] = [
        { color: [1, 0, 0, 1], position: 0 },
        { color: [0, 0, 1, 1], position: 1 },
      ]

      const data = generateColorRampData(stops)

      // First pixel should be red
      expect(data[0]).toBe(255) // R
      expect(data[1]).toBe(0)   // G
      expect(data[2]).toBe(0)   // B
      expect(data[3]).toBe(255) // A

      // Last pixel should be blue
      const lastOffset = (COLOR_RAMP_WIDTH - 1) * 4
      expect(data[lastOffset]).toBe(0)     // R
      expect(data[lastOffset + 1]).toBe(0) // G
      expect(data[lastOffset + 2]).toBe(255) // B
      expect(data[lastOffset + 3]).toBe(255) // A

      // Middle pixel should be somewhere in between (OKLAB interpolation)
      const midOffset = Math.floor(COLOR_RAMP_WIDTH / 2) * 4
      // With OKLAB, red-to-blue goes through purple, not muddy gray
      expect(data[midOffset]).toBeGreaterThan(0)   // Some R
      expect(data[midOffset + 2]).toBeGreaterThan(0) // Some B
    })

    it('handles multiple stops', () => {
      const stops: ColorStop[] = [
        { color: [1, 0, 0, 1], position: 0 },
        { color: [0, 1, 0, 1], position: 0.5 },
        { color: [0, 0, 1, 1], position: 1 },
      ]

      const data = generateColorRampData(stops)

      // First pixel should be red
      expect(data[0]).toBe(255)
      expect(data[1]).toBe(0)
      expect(data[2]).toBe(0)

      // Middle pixel should be green
      const midOffset = Math.floor(COLOR_RAMP_WIDTH / 2) * 4
      expect(data[midOffset]).toBeLessThan(50)     // Low R
      expect(data[midOffset + 1]).toBeGreaterThan(200) // High G
      expect(data[midOffset + 2]).toBeLessThan(50) // Low B

      // Last pixel should be blue
      const lastOffset = (COLOR_RAMP_WIDTH - 1) * 4
      expect(data[lastOffset]).toBe(0)
      expect(data[lastOffset + 1]).toBe(0)
      expect(data[lastOffset + 2]).toBe(255)
    })

    it('sorts stops by position', () => {
      const stops: ColorStop[] = [
        { color: [0, 0, 1, 1], position: 1 },
        { color: [1, 0, 0, 1], position: 0 },
      ]

      const data = generateColorRampData(stops)

      // First pixel should still be red (sorted by position)
      expect(data[0]).toBe(255)
      expect(data[1]).toBe(0)
      expect(data[2]).toBe(0)

      // Last pixel should be blue
      const lastOffset = (COLOR_RAMP_WIDTH - 1) * 4
      expect(data[lastOffset]).toBe(0)
      expect(data[lastOffset + 1]).toBe(0)
      expect(data[lastOffset + 2]).toBe(255)
    })

    it('handles alpha interpolation', () => {
      const stops: ColorStop[] = [
        { color: [1, 0, 0, 1], position: 0 },
        { color: [1, 0, 0, 0], position: 1 },
      ]

      const data = generateColorRampData(stops)

      // First pixel should have full alpha
      expect(data[3]).toBe(255)

      // Last pixel should have zero alpha
      const lastOffset = (COLOR_RAMP_WIDTH - 1) * 4
      expect(data[lastOffset + 3]).toBe(0)

      // Middle should be around 50%
      const midOffset = Math.floor(COLOR_RAMP_WIDTH / 2) * 4
      expect(data[midOffset + 3]).toBeGreaterThan(100)
      expect(data[midOffset + 3]).toBeLessThan(150)
    })

    it('extends first stop to position 0 if needed', () => {
      const stops: ColorStop[] = [
        { color: [0, 1, 0, 1], position: 0.5 },
        { color: [0, 0, 1, 1], position: 1 },
      ]

      const data = generateColorRampData(stops)

      // First pixel should be green (extended from position 0.5)
      expect(data[0]).toBe(0)
      expect(data[1]).toBe(255)
      expect(data[2]).toBe(0)
    })

    it('extends last stop to position 1 if needed', () => {
      const stops: ColorStop[] = [
        { color: [1, 0, 0, 1], position: 0 },
        { color: [0, 1, 0, 1], position: 0.5 },
      ]

      const data = generateColorRampData(stops)

      // Last pixel should be green (extended from position 0.5)
      const lastOffset = (COLOR_RAMP_WIDTH - 1) * 4
      expect(data[lastOffset]).toBe(0)
      expect(data[lastOffset + 1]).toBe(255)
      expect(data[lastOffset + 2]).toBe(0)
    })

    it('throws error for empty stops array', () => {
      expect(() => generateColorRampData([])).toThrow('At least one color stop is required')
    })

    it('handles many stops (no limit)', () => {
      // Create 10 stops (previously limited to 8)
      const stops: ColorStop[] = Array.from({ length: 10 }, (_, i) => ({
        color: [i / 9, 0, 0, 1] as [number, number, number, number],
        position: i / 9,
      }))

      const data = generateColorRampData(stops)

      expect(data.length).toBe(COLOR_RAMP_WIDTH * 4)
      // Should complete without error
    })
  })

  describe('COLOR_RAMP_WIDTH', () => {
    it('is 1024', () => {
      expect(COLOR_RAMP_WIDTH).toBe(1024)
    })
  })
})
