import { describe, it, expect } from 'vitest'
import { $Ray } from './Ray'
import type { Vector3 } from './Vector3'

describe('$Ray', () => {
  describe('create', () => {
    it('should create a ray with origin and direction', () => {
      const origin: Vector3 = { x: 0, y: 0, z: 0 }
      const direction: Vector3 = { x: 0, y: 0, z: 1 }

      const ray = $Ray.create(origin, direction)

      expect(ray.origin).toBe(origin)
      expect(ray.direction).toBe(direction)
    })

    it('should preserve origin values', () => {
      const origin: Vector3 = { x: 1, y: 2, z: 3 }
      const direction: Vector3 = { x: 0, y: 1, z: 0 }

      const ray = $Ray.create(origin, direction)

      expect(ray.origin.x).toBe(1)
      expect(ray.origin.y).toBe(2)
      expect(ray.origin.z).toBe(3)
    })

    it('should preserve direction values', () => {
      const origin: Vector3 = { x: 0, y: 0, z: 0 }
      const direction: Vector3 = { x: 0.577, y: 0.577, z: 0.577 }

      const ray = $Ray.create(origin, direction)

      expect(ray.direction.x).toBe(0.577)
      expect(ray.direction.y).toBe(0.577)
      expect(ray.direction.z).toBe(0.577)
    })
  })

  describe('at', () => {
    it('should return origin at t=0', () => {
      const origin: Vector3 = { x: 1, y: 2, z: 3 }
      const direction: Vector3 = { x: 1, y: 0, z: 0 }
      const ray = $Ray.create(origin, direction)

      const point = $Ray.at(ray, 0)

      expect(point.x).toBe(1)
      expect(point.y).toBe(2)
      expect(point.z).toBe(3)
    })

    it('should move along direction for positive t', () => {
      const origin: Vector3 = { x: 0, y: 0, z: 0 }
      const direction: Vector3 = { x: 1, y: 0, z: 0 }
      const ray = $Ray.create(origin, direction)

      const point = $Ray.at(ray, 5)

      expect(point.x).toBe(5)
      expect(point.y).toBe(0)
      expect(point.z).toBe(0)
    })

    it('should move opposite direction for negative t', () => {
      const origin: Vector3 = { x: 0, y: 0, z: 0 }
      const direction: Vector3 = { x: 1, y: 0, z: 0 }
      const ray = $Ray.create(origin, direction)

      const point = $Ray.at(ray, -3)

      expect(point.x).toBe(-3)
      expect(point.y).toBe(0)
      expect(point.z).toBe(0)
    })

    it('should work with diagonal direction', () => {
      const origin: Vector3 = { x: 0, y: 0, z: 0 }
      const direction: Vector3 = { x: 1, y: 1, z: 1 }
      const ray = $Ray.create(origin, direction)

      const point = $Ray.at(ray, 2)

      expect(point.x).toBe(2)
      expect(point.y).toBe(2)
      expect(point.z).toBe(2)
    })

    it('should work with non-zero origin', () => {
      const origin: Vector3 = { x: 10, y: 20, z: 30 }
      const direction: Vector3 = { x: 0, y: 1, z: 0 }
      const ray = $Ray.create(origin, direction)

      const point = $Ray.at(ray, 5)

      expect(point.x).toBe(10)
      expect(point.y).toBe(25)
      expect(point.z).toBe(30)
    })

    it('should work with fractional t', () => {
      const origin: Vector3 = { x: 0, y: 0, z: 0 }
      const direction: Vector3 = { x: 2, y: 4, z: 6 }
      const ray = $Ray.create(origin, direction)

      const point = $Ray.at(ray, 0.5)

      expect(point.x).toBe(1)
      expect(point.y).toBe(2)
      expect(point.z).toBe(3)
    })

    it('should produce different points at different t values', () => {
      const origin: Vector3 = { x: 0, y: 0, z: 0 }
      const direction: Vector3 = { x: 1, y: 0, z: 0 }
      const ray = $Ray.create(origin, direction)

      const p1 = $Ray.at(ray, 1)
      const p2 = $Ray.at(ray, 2)
      const p3 = $Ray.at(ray, 3)

      expect(p1.x).toBe(1)
      expect(p2.x).toBe(2)
      expect(p3.x).toBe(3)
    })

    it('should not modify original ray', () => {
      const origin: Vector3 = { x: 1, y: 2, z: 3 }
      const direction: Vector3 = { x: 0, y: 1, z: 0 }
      const ray = $Ray.create(origin, direction)

      $Ray.at(ray, 100)

      expect(ray.origin.x).toBe(1)
      expect(ray.origin.y).toBe(2)
      expect(ray.origin.z).toBe(3)
    })
  })
})
