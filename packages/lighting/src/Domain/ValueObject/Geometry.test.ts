import { describe, it, expect } from 'vitest'
import { $Geometry } from './Geometry'
import type { Vector3 } from '@practice/vector'

describe('$Geometry', () => {
  describe('createPlane', () => {
    it('should create a plane with normalized normal', () => {
      const point: Vector3 = { x: 0, y: 0, z: 0 }
      const normal: Vector3 = { x: 0, y: 2, z: 0 } // unnormalized

      const plane = $Geometry.createPlane(point, normal)

      expect(plane.type).toBe('plane')
      expect(plane.point).toBe(point)
      // Normal should be normalized
      expect(plane.normal.x).toBeCloseTo(0, 5)
      expect(plane.normal.y).toBeCloseTo(1, 5)
      expect(plane.normal.z).toBeCloseTo(0, 5)
    })

    it('should create infinite plane without dimensions', () => {
      const point: Vector3 = { x: 1, y: 2, z: 3 }
      const normal: Vector3 = { x: 0, y: 1, z: 0 }

      const plane = $Geometry.createPlane(point, normal)

      expect(plane.width).toBeUndefined()
      expect(plane.height).toBeUndefined()
    })

    it('should create finite plane with dimensions', () => {
      const point: Vector3 = { x: 0, y: 0, z: 0 }
      const normal: Vector3 = { x: 0, y: 1, z: 0 }

      const plane = $Geometry.createPlane(point, normal, 10, 20)

      expect(plane.width).toBe(10)
      expect(plane.height).toBe(20)
    })

    it('should use absolute values for dimensions', () => {
      const point: Vector3 = { x: 0, y: 0, z: 0 }
      const normal: Vector3 = { x: 0, y: 1, z: 0 }

      const plane = $Geometry.createPlane(point, normal, -10, -20)

      expect(plane.width).toBe(10)
      expect(plane.height).toBe(20)
    })
  })

  describe('createBox', () => {
    it('should create a box with correct type', () => {
      const center: Vector3 = { x: 0, y: 0, z: 0 }
      const size: Vector3 = { x: 10, y: 20, z: 30 }

      const box = $Geometry.createBox(center, size)

      expect(box.type).toBe('box')
      expect(box.center).toBe(center)
    })

    it('should use absolute values for size', () => {
      const center: Vector3 = { x: 0, y: 0, z: 0 }
      const size: Vector3 = { x: -10, y: -20, z: -30 }

      const box = $Geometry.createBox(center, size)

      expect(box.size.x).toBe(10)
      expect(box.size.y).toBe(20)
      expect(box.size.z).toBe(30)
    })

    it('should create box without rotation or radius by default', () => {
      const center: Vector3 = { x: 0, y: 0, z: 0 }
      const size: Vector3 = { x: 10, y: 10, z: 10 }

      const box = $Geometry.createBox(center, size)

      expect(box.rotation).toBeUndefined()
      expect(box.radius).toBeUndefined()
    })

    it('should include rotation when provided', () => {
      const center: Vector3 = { x: 0, y: 0, z: 0 }
      const size: Vector3 = { x: 10, y: 10, z: 10 }
      const rotation: Vector3 = { x: 0, y: Math.PI / 4, z: 0 }

      const box = $Geometry.createBox(center, size, rotation)

      expect(box.rotation).toBe(rotation)
    })

    it('should include valid radius', () => {
      const center: Vector3 = { x: 0, y: 0, z: 0 }
      const size: Vector3 = { x: 20, y: 10, z: 10 }

      const box = $Geometry.createBox(center, size, undefined, 3)

      expect(box.radius).toBe(3)
    })

    it('should clamp radius to half of smallest XY dimension', () => {
      const center: Vector3 = { x: 0, y: 0, z: 0 }
      const size: Vector3 = { x: 20, y: 10, z: 100 } // min of XY is 10

      const box = $Geometry.createBox(center, size, undefined, 10) // too large

      // Max radius should be 10 / 2 = 5
      expect(box.radius).toBe(5)
    })

    it('should not include radius if 0', () => {
      const center: Vector3 = { x: 0, y: 0, z: 0 }
      const size: Vector3 = { x: 10, y: 10, z: 10 }

      const box = $Geometry.createBox(center, size, undefined, 0)

      expect(box.radius).toBeUndefined()
    })

    it('should not include negative radius', () => {
      const center: Vector3 = { x: 0, y: 0, z: 0 }
      const size: Vector3 = { x: 10, y: 10, z: 10 }

      const box = $Geometry.createBox(center, size, undefined, -5)

      expect(box.radius).toBeUndefined()
    })
  })
})
