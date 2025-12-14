import { describe, it, expect } from 'vitest'
import { $Color } from './Color'

describe('$Color', () => {
  describe('create', () => {
    it('creates color from 0-1 values', () => {
      const color = $Color.create(0.5, 0.3, 0.8)
      expect(color.r).toBe(0.5)
      expect(color.g).toBe(0.3)
      expect(color.b).toBe(0.8)
    })

    it('clamps values to 0-1 range', () => {
      const color = $Color.create(-0.5, 1.5, 0.5)
      expect(color.r).toBe(0)
      expect(color.g).toBe(1)
      expect(color.b).toBe(0.5)
    })
  })

  describe('fromRgb255', () => {
    it('creates color from 0-255 values', () => {
      const color = $Color.fromRgb255(255, 128, 0)
      expect(color.r).toBe(1)
      expect(color.g).toBeCloseTo(128 / 255)
      expect(color.b).toBe(0)
    })

    it('clamps out of range values', () => {
      const color = $Color.fromRgb255(-10, 300, 128)
      expect(color.r).toBe(0)
      expect(color.g).toBe(1)
      expect(color.b).toBeCloseTo(128 / 255)
    })
  })

  describe('toTuple', () => {
    it('returns RGB tuple in 0-1 range', () => {
      const color = $Color.create(0.2, 0.4, 0.6)
      const tuple = $Color.toTuple(color)
      expect(tuple).toEqual([0.2, 0.4, 0.6])
    })
  })

  describe('toTuple255', () => {
    it('returns RGB tuple in 0-255 range', () => {
      const color = $Color.create(1, 0.5, 0)
      const tuple = $Color.toTuple255(color)
      expect(tuple[0]).toBe(255)
      expect(tuple[1]).toBe(128)
      expect(tuple[2]).toBe(0)
    })
  })

  describe('add', () => {
    it('adds two colors', () => {
      const a = $Color.create(0.2, 0.3, 0.1)
      const b = $Color.create(0.1, 0.2, 0.3)
      const result = $Color.add(a, b)
      expect(result.r).toBeCloseTo(0.3)
      expect(result.g).toBeCloseTo(0.5)
      expect(result.b).toBeCloseTo(0.4)
    })

    it('clamps result to 1', () => {
      const a = $Color.create(0.8, 0.5, 0.9)
      const b = $Color.create(0.5, 0.3, 0.5)
      const result = $Color.add(a, b)
      expect(result.r).toBe(1)
      expect(result.g).toBeCloseTo(0.8)
      expect(result.b).toBe(1)
    })
  })

  describe('multiply', () => {
    it('multiplies two colors', () => {
      const a = $Color.create(0.5, 0.8, 1)
      const b = $Color.create(0.4, 0.5, 0.2)
      const result = $Color.multiply(a, b)
      expect(result.r).toBeCloseTo(0.2)
      expect(result.g).toBeCloseTo(0.4)
      expect(result.b).toBeCloseTo(0.2)
    })
  })

  describe('scale', () => {
    it('scales color by scalar', () => {
      const color = $Color.create(0.4, 0.6, 0.8)
      const result = $Color.scale(color, 0.5)
      expect(result.r).toBeCloseTo(0.2)
      expect(result.g).toBeCloseTo(0.3)
      expect(result.b).toBeCloseTo(0.4)
    })

    it('clamps scaled result', () => {
      const color = $Color.create(0.5, 0.5, 0.5)
      const result = $Color.scale(color, 3)
      expect(result.r).toBe(1)
      expect(result.g).toBe(1)
      expect(result.b).toBe(1)
    })
  })
})
