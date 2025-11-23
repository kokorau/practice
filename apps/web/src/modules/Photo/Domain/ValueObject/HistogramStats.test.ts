import { describe, it, expect } from 'vitest'
import { $HistogramStats } from './HistogramStats'
import type { Histogram } from './Histogram'

const createHistogram = (r: number[], g: number[], b: number[], luminance: number[] = []): Histogram => {
  const rArr = new Uint32Array(256)
  const gArr = new Uint32Array(256)
  const bArr = new Uint32Array(256)
  const lumArr = new Uint32Array(256)

  r.forEach((count, i) => (rArr[i] = count))
  g.forEach((count, i) => (gArr[i] = count))
  b.forEach((count, i) => (bArr[i] = count))
  luminance.forEach((count, i) => (lumArr[i] = count))

  return { r: rArr, g: gArr, b: bArr, luminance: lumArr }
}

describe('$HistogramStats', () => {
  describe('mean', () => {
    it('should calculate mean correctly', () => {
      // All pixels at value 100
      const r = new Array(256).fill(0)
      r[100] = 10
      const histogram = createHistogram(r, r, r)
      const stats = $HistogramStats.create(histogram)

      expect(stats.r.mean).toBe(100)
    })

    it('should calculate weighted mean', () => {
      // 5 pixels at 0, 5 pixels at 200 -> mean = 100
      const r = new Array(256).fill(0)
      r[0] = 5
      r[200] = 5
      const histogram = createHistogram(r, r, r)
      const stats = $HistogramStats.create(histogram)

      expect(stats.r.mean).toBe(100)
    })
  })

  describe('shadows/midtones/highlights', () => {
    it('should classify shadows (0-85)', () => {
      const r = new Array(256).fill(0)
      r[50] = 100  // All in shadows
      const histogram = createHistogram(r, r, r)
      const stats = $HistogramStats.create(histogram)

      expect(stats.r.shadows).toBe(1)
      expect(stats.r.midtones).toBe(0)
      expect(stats.r.highlights).toBe(0)
    })

    it('should classify midtones (86-170)', () => {
      const r = new Array(256).fill(0)
      r[128] = 100  // All in midtones
      const histogram = createHistogram(r, r, r)
      const stats = $HistogramStats.create(histogram)

      expect(stats.r.shadows).toBe(0)
      expect(stats.r.midtones).toBe(1)
      expect(stats.r.highlights).toBe(0)
    })

    it('should classify highlights (171-255)', () => {
      const r = new Array(256).fill(0)
      r[200] = 100  // All in highlights
      const histogram = createHistogram(r, r, r)
      const stats = $HistogramStats.create(histogram)

      expect(stats.r.shadows).toBe(0)
      expect(stats.r.midtones).toBe(0)
      expect(stats.r.highlights).toBe(1)
    })

    it('should calculate mixed distribution', () => {
      const r = new Array(256).fill(0)
      r[50] = 50   // shadows
      r[128] = 30  // midtones
      r[200] = 20  // highlights
      const histogram = createHistogram(r, r, r)
      const stats = $HistogramStats.create(histogram)

      expect(stats.r.shadows).toBe(0.5)
      expect(stats.r.midtones).toBe(0.3)
      expect(stats.r.highlights).toBe(0.2)
    })
  })

  describe('clipping', () => {
    it('should detect black clipping', () => {
      const r = new Array(256).fill(0)
      r[0] = 20    // 20% clipped black
      r[128] = 80  // rest in midtones
      const histogram = createHistogram(r, r, r)
      const stats = $HistogramStats.create(histogram)

      expect(stats.r.clippedBlack).toBe(0.2)
      expect(stats.r.clippedWhite).toBe(0)
    })

    it('should detect white clipping', () => {
      const r = new Array(256).fill(0)
      r[255] = 30  // 30% clipped white
      r[128] = 70  // rest in midtones
      const histogram = createHistogram(r, r, r)
      const stats = $HistogramStats.create(histogram)

      expect(stats.r.clippedBlack).toBe(0)
      expect(stats.r.clippedWhite).toBe(0.3)
    })
  })

  describe('empty histogram', () => {
    it('should handle empty histogram', () => {
      const histogram = createHistogram([], [], [])
      const stats = $HistogramStats.create(histogram)

      expect(stats.r.mean).toBe(0)
      expect(stats.r.shadows).toBe(0)
      expect(stats.r.clippedBlack).toBe(0)
    })
  })
})
