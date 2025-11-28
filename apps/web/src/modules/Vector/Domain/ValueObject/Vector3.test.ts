import { describe, it, expect } from 'vitest'
import { $Vector3 } from './Vector3'

describe('$Vector3', () => {
  describe('create', () => {
    it('creates a vector with given components', () => {
      const v = $Vector3.create(1, 2, 3)
      expect(v).toEqual({ x: 1, y: 2, z: 3 })
    })
  })

  describe('add', () => {
    it('adds two vectors', () => {
      const a = { x: 1, y: 2, z: 3 }
      const b = { x: 4, y: 5, z: 6 }
      expect($Vector3.add(a, b)).toEqual({ x: 5, y: 7, z: 9 })
    })

    it('handles negative values', () => {
      const a = { x: 1, y: -2, z: 3 }
      const b = { x: -1, y: 2, z: -3 }
      expect($Vector3.add(a, b)).toEqual({ x: 0, y: 0, z: 0 })
    })
  })

  describe('sub', () => {
    it('subtracts vector b from vector a', () => {
      const a = { x: 5, y: 7, z: 9 }
      const b = { x: 1, y: 2, z: 3 }
      expect($Vector3.sub(a, b)).toEqual({ x: 4, y: 5, z: 6 })
    })

    it('subtracting same vector gives zero', () => {
      const v = { x: 1, y: 2, z: 3 }
      expect($Vector3.sub(v, v)).toEqual({ x: 0, y: 0, z: 0 })
    })
  })

  describe('scale', () => {
    it('scales vector by positive scalar', () => {
      const v = { x: 1, y: 2, z: 3 }
      expect($Vector3.scale(v, 2)).toEqual({ x: 2, y: 4, z: 6 })
    })

    it('scales vector by negative scalar', () => {
      const v = { x: 1, y: 2, z: 3 }
      expect($Vector3.scale(v, -1)).toEqual({ x: -1, y: -2, z: -3 })
    })

    it('scales vector by zero', () => {
      const v = { x: 1, y: 2, z: 3 }
      expect($Vector3.scale(v, 0)).toEqual({ x: 0, y: 0, z: 0 })
    })
  })

  describe('dot', () => {
    it('computes dot product', () => {
      const a = { x: 1, y: 2, z: 3 }
      const b = { x: 4, y: 5, z: 6 }
      // 1*4 + 2*5 + 3*6 = 4 + 10 + 18 = 32
      expect($Vector3.dot(a, b)).toBe(32)
    })

    it('dot product of perpendicular vectors is zero', () => {
      const a = { x: 1, y: 0, z: 0 }
      const b = { x: 0, y: 1, z: 0 }
      expect($Vector3.dot(a, b)).toBe(0)
    })

    it('dot product of parallel vectors equals product of lengths', () => {
      const a = { x: 2, y: 0, z: 0 }
      const b = { x: 3, y: 0, z: 0 }
      expect($Vector3.dot(a, b)).toBe(6)
    })
  })

  describe('cross', () => {
    it('computes cross product of unit x and y', () => {
      const x = { x: 1, y: 0, z: 0 }
      const y = { x: 0, y: 1, z: 0 }
      expect($Vector3.cross(x, y)).toEqual({ x: 0, y: 0, z: 1 })
    })

    it('computes cross product of unit y and z', () => {
      const y = { x: 0, y: 1, z: 0 }
      const z = { x: 0, y: 0, z: 1 }
      expect($Vector3.cross(y, z)).toEqual({ x: 1, y: 0, z: 0 })
    })

    it('computes cross product of unit z and x', () => {
      const z = { x: 0, y: 0, z: 1 }
      const x = { x: 1, y: 0, z: 0 }
      expect($Vector3.cross(z, x)).toEqual({ x: 0, y: 1, z: 0 })
    })

    it('cross product of parallel vectors is zero', () => {
      const a = { x: 1, y: 2, z: 3 }
      const b = { x: 2, y: 4, z: 6 }
      expect($Vector3.cross(a, b)).toEqual({ x: 0, y: 0, z: 0 })
    })

    it('cross product is anti-commutative', () => {
      const a = { x: 1, y: 2, z: 3 }
      const b = { x: 4, y: 5, z: 6 }
      const ab = $Vector3.cross(a, b)
      const ba = $Vector3.cross(b, a)
      expect(ab).toEqual({ x: -ba.x, y: -ba.y, z: -ba.z })
    })
  })

  describe('length', () => {
    it('computes length of unit vector', () => {
      const v = { x: 1, y: 0, z: 0 }
      expect($Vector3.length(v)).toBe(1)
    })

    it('computes length of 3-4-5 style vector', () => {
      // sqrt(3^2 + 4^2 + 0^2) = sqrt(9 + 16) = sqrt(25) = 5
      const v = { x: 3, y: 4, z: 0 }
      expect($Vector3.length(v)).toBe(5)
    })

    it('computes length of zero vector', () => {
      const v = { x: 0, y: 0, z: 0 }
      expect($Vector3.length(v)).toBe(0)
    })
  })

  describe('normalize', () => {
    it('normalizes vector to unit length', () => {
      const v = { x: 3, y: 0, z: 0 }
      expect($Vector3.normalize(v)).toEqual({ x: 1, y: 0, z: 0 })
    })

    it('normalized vector has length 1', () => {
      const v = { x: 1, y: 2, z: 3 }
      const normalized = $Vector3.normalize(v)
      expect($Vector3.length(normalized)).toBeCloseTo(1)
    })

    it('handles zero vector', () => {
      const v = { x: 0, y: 0, z: 0 }
      expect($Vector3.normalize(v)).toEqual({ x: 0, y: 0, z: 0 })
    })

    it('preserves direction', () => {
      const v = { x: 2, y: 4, z: 6 }
      const normalized = $Vector3.normalize(v)
      // direction should be same as (1, 2, 3) normalized
      const expected = $Vector3.normalize({ x: 1, y: 2, z: 3 })
      expect(normalized.x).toBeCloseTo(expected.x)
      expect(normalized.y).toBeCloseTo(expected.y)
      expect(normalized.z).toBeCloseTo(expected.z)
    })
  })
})
