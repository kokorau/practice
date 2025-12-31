import { describe, it, expect } from 'vitest'
import { pipe, flow, identity, clamp } from './index'

describe('Pipe', () => {
  describe('pipe', () => {
    it('should pass value through single function', () => {
      const result = pipe(5, x => x * 2)
      expect(result).toBe(10)
    })

    it('should chain multiple functions', () => {
      const result = pipe(
        5,
        x => x + 1,  // 6
        x => x * 2,  // 12
        x => x - 4,  // 8
      )
      expect(result).toBe(8)
    })

    it('should return value unchanged with no functions', () => {
      const result = pipe(42)
      expect(result).toBe(42)
    })

    it('should work with different types', () => {
      const result = pipe(
        'hello',
        s => s.toUpperCase(),
        s => s + '!',
      )
      expect(result).toBe('HELLO!')
    })
  })

  describe('flow', () => {
    it('should compose functions', () => {
      const addOneThenDouble = flow(
        (x: number) => x + 1,
        x => x * 2,
      )
      expect(addOneThenDouble(5)).toBe(12)
    })

    it('should work with single function', () => {
      const double = flow((x: number) => x * 2)
      expect(double(5)).toBe(10)
    })
  })

  describe('identity', () => {
    it('should return input unchanged', () => {
      expect(identity(42)).toBe(42)
      expect(identity('hello')).toBe('hello')
      expect(identity(null)).toBe(null)
    })
  })

  describe('clamp', () => {
    it('should clamp value within range', () => {
      const clamp01 = clamp(0, 1)
      expect(clamp01(0.5)).toBe(0.5)
      expect(clamp01(-0.5)).toBe(0)
      expect(clamp01(1.5)).toBe(1)
    })

    it('should work with different ranges', () => {
      const clamp100 = clamp(0, 100)
      expect(clamp100(50)).toBe(50)
      expect(clamp100(-10)).toBe(0)
      expect(clamp100(150)).toBe(100)
    })
  })
})
