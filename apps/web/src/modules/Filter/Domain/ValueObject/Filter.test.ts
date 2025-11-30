import { describe, it, expect } from 'vitest'
import { $Filter } from './Filter'
import { type Curve } from './Curve'
import { $Adjustment } from './Adjustment'

describe('$Filter', () => {
  describe('identity', () => {
    it('should create identity filter with default point count', () => {
      const filter = $Filter.identity()

      expect(filter.master.points).toHaveLength(7)
      expect(filter.r).toBeNull()
      expect(filter.g).toBeNull()
      expect(filter.b).toBeNull()
    })

    it('should create identity filter with custom point count', () => {
      const filter = $Filter.identity(5)

      expect(filter.master.points).toHaveLength(5)
    })

    it('should have identity adjustment', () => {
      const filter = $Filter.identity()

      expect(filter.adjustment.brightness).toBe(0)
      expect(filter.adjustment.contrast).toBe(0)
      expect(filter.adjustment.exposure).toBe(0)
    })
  })

  describe('fromMaster', () => {
    it('should create filter from master curve', () => {
      const curve: Curve = { points: [0, 0.3, 0.7, 1] }
      const filter = $Filter.fromMaster(curve)

      expect(filter.master).toBe(curve)
      expect(filter.r).toBeNull()
      expect(filter.g).toBeNull()
      expect(filter.b).toBeNull()
    })
  })

  describe('toLut', () => {
    it('should create LUT from identity filter', () => {
      const filter = $Filter.identity()
      const lut = $Filter.toLut(filter)

      expect(lut.type).toBe('lut1d')
      expect(lut.r.length).toBe(256)
      expect(lut.g.length).toBe(256)
      expect(lut.b.length).toBe(256)

      // Identity should map 0 -> 0, 255 -> 1
      expect(lut.r[0]).toBeCloseTo(0, 3)
      expect(lut.r[255]).toBeCloseTo(1, 3)
    })

    it('should apply adjustment to LUT', () => {
      const filter = $Filter.identity()
      filter.adjustment.contrast = 0.5

      const lut = $Filter.toLut(filter)

      // With positive contrast, mid values should move away from center
      // Just verify it changed
      const identityLut = $Filter.toLut($Filter.identity())
      expect(lut.r[128]).not.toBeCloseTo(identityLut.r[128]!, 3)
    })
  })

  describe('setters', () => {
    it('should set exposure', () => {
      const filter = $Filter.identity()
      const updated = $Filter.setExposure(filter, 0.5)

      expect(updated.adjustment.exposure).toBe(0.5)
      expect(filter.adjustment.exposure).toBe(0) // original unchanged
    })

    it('should set brightness', () => {
      const filter = $Filter.identity()
      const updated = $Filter.setBrightness(filter, 0.3)

      expect(updated.adjustment.brightness).toBe(0.3)
    })

    it('should set contrast', () => {
      const filter = $Filter.identity()
      const updated = $Filter.setContrast(filter, -0.5)

      expect(updated.adjustment.contrast).toBe(-0.5)
    })

    it('should set highlights', () => {
      const filter = $Filter.identity()
      const updated = $Filter.setHighlights(filter, 0.7)

      expect(updated.adjustment.highlights).toBe(0.7)
    })

    it('should set shadows', () => {
      const filter = $Filter.identity()
      const updated = $Filter.setShadows(filter, -0.3)

      expect(updated.adjustment.shadows).toBe(-0.3)
    })

    it('should set temperature', () => {
      const filter = $Filter.identity()
      const updated = $Filter.setTemperature(filter, 30)

      expect(updated.adjustment.temperature).toBe(30)
    })

    it('should set vibrance', () => {
      const filter = $Filter.identity()
      const updated = $Filter.setVibrance(filter, 0.5)

      expect(updated.adjustment.vibrance).toBe(0.5)
    })

    it('should set fade', () => {
      const filter = $Filter.identity()
      const updated = $Filter.setFade(filter, 0.2)

      expect(updated.adjustment.fade).toBe(0.2)
    })
  })

  describe('setMaster', () => {
    it('should update master curve', () => {
      const filter = $Filter.identity()
      const newCurve: Curve = { points: [0, 0.2, 0.8, 1] }
      const updated = $Filter.setMaster(filter, newCurve)

      expect(updated.master).toBe(newCurve)
      expect(filter.master).not.toBe(newCurve) // original unchanged
    })
  })

  describe('setChannel', () => {
    it('should set individual channel curve', () => {
      const filter = $Filter.identity()
      const redCurve: Curve = { points: [0, 0.3, 0.7, 1] }
      const updated = $Filter.setChannel(filter, 'r', redCurve)

      expect(updated.r).toBe(redCurve)
      expect(updated.g).toBeNull()
      expect(updated.b).toBeNull()
    })

    it('should clear channel with null', () => {
      let filter = $Filter.identity()
      const curve: Curve = { points: [0, 0.5, 1] }
      filter = $Filter.setChannel(filter, 'r', curve)
      filter = $Filter.setChannel(filter, 'r', null)

      expect(filter.r).toBeNull()
    })
  })

  describe('splitToChannels', () => {
    it('should copy master curve to all channels', () => {
      const filter = $Filter.identity(5)
      const split = $Filter.splitToChannels(filter)

      expect(split.r).not.toBeNull()
      expect(split.g).not.toBeNull()
      expect(split.b).not.toBeNull()

      expect(split.r!.points).toEqual(filter.master.points)
      expect(split.g!.points).toEqual(filter.master.points)
      expect(split.b!.points).toEqual(filter.master.points)
    })

    it('should create independent copies', () => {
      const filter = $Filter.identity(5)
      const split = $Filter.splitToChannels(filter)

      split.r!.points[2] = 0.9 // modify

      expect(split.g!.points[2]).not.toBe(0.9) // other channels unaffected
    })
  })

  describe('mergeToMaster', () => {
    it('should return unchanged if no channels set', () => {
      const filter = $Filter.identity()
      const merged = $Filter.mergeToMaster(filter)

      expect(merged).toBe(filter)
    })

    it('should average channels to master', () => {
      let filter = $Filter.identity(5)
      filter = $Filter.splitToChannels(filter)

      // Modify channels
      filter.r!.points[2] = 0.3
      filter.g!.points[2] = 0.6
      filter.b!.points[2] = 0.9

      const merged = $Filter.mergeToMaster(filter)

      expect(merged.master.points[2]).toBeCloseTo(0.6, 5) // (0.3 + 0.6 + 0.9) / 3
      expect(merged.r).toBeNull()
      expect(merged.g).toBeNull()
      expect(merged.b).toBeNull()
    })

    it('should use master for missing channels', () => {
      let filter = $Filter.identity(5)
      const redCurve: Curve = { points: [0, 0.1, 0.5, 0.9, 1] }
      filter = $Filter.setChannel(filter, 'r', redCurve)

      const merged = $Filter.mergeToMaster(filter)

      // Only red was set, g and b should use master identity values
      expect(merged.r).toBeNull()
    })
  })

  describe('setAdjustment', () => {
    it('should replace entire adjustment', () => {
      const filter = $Filter.identity()
      const newAdjustment = $Adjustment.identity()
      newAdjustment.brightness = 0.5
      newAdjustment.contrast = 0.3

      const updated = $Filter.setAdjustment(filter, newAdjustment)

      expect(updated.adjustment.brightness).toBe(0.5)
      expect(updated.adjustment.contrast).toBe(0.3)
    })
  })
})
