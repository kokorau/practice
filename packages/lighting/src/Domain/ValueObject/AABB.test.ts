import { describe, it, expect } from 'vitest'
import { $AABB } from './AABB'
import type { SphereGeometry, BoxGeometry, PlaneGeometry } from './Geometry'

describe('$AABB', () => {
  describe('fromSphere', () => {
    it('should calculate AABB for a sphere', () => {
      const sphere: SphereGeometry = {
        type: 'sphere',
        center: { x: 0, y: 0, z: 0 },
        radius: 5,
      }

      const aabb = $AABB.fromSphere(sphere)

      expect(aabb.min).toEqual({ x: -5, y: -5, z: -5 })
      expect(aabb.max).toEqual({ x: 5, y: 5, z: 5 })
    })

    it('should handle offset sphere', () => {
      const sphere: SphereGeometry = {
        type: 'sphere',
        center: { x: 10, y: 20, z: 30 },
        radius: 2,
      }

      const aabb = $AABB.fromSphere(sphere)

      expect(aabb.min).toEqual({ x: 8, y: 18, z: 28 })
      expect(aabb.max).toEqual({ x: 12, y: 22, z: 32 })
    })
  })

  describe('fromBox', () => {
    it('should calculate AABB for unrotated box', () => {
      const box: BoxGeometry = {
        type: 'box',
        center: { x: 0, y: 0, z: 0 },
        size: { x: 4, y: 6, z: 8 },
      }

      const aabb = $AABB.fromBox(box)

      expect(aabb.min).toEqual({ x: -2, y: -3, z: -4 })
      expect(aabb.max).toEqual({ x: 2, y: 3, z: 4 })
    })

    it('should calculate AABB for rotated box', () => {
      const box: BoxGeometry = {
        type: 'box',
        center: { x: 0, y: 0, z: 0 },
        size: { x: 2, y: 2, z: 2 },
        rotation: { x: 0, y: 0, z: Math.PI / 4 }, // 45 degrees around Z
      }

      const aabb = $AABB.fromBox(box)

      // Rotated 2x2x2 box becomes sqrt(2) x sqrt(2) x 2 in AABB
      const sqrt2 = Math.sqrt(2)
      expect(aabb.min.x).toBeCloseTo(-sqrt2, 5)
      expect(aabb.min.y).toBeCloseTo(-sqrt2, 5)
      expect(aabb.min.z).toBeCloseTo(-1, 5)
      expect(aabb.max.x).toBeCloseTo(sqrt2, 5)
      expect(aabb.max.y).toBeCloseTo(sqrt2, 5)
      expect(aabb.max.z).toBeCloseTo(1, 5)
    })
  })

  describe('fromPlane', () => {
    it('should return null for infinite plane', () => {
      const plane: PlaneGeometry = {
        type: 'plane',
        point: { x: 0, y: 0, z: 0 },
        normal: { x: 0, y: 1, z: 0 },
      }

      const aabb = $AABB.fromPlane(plane)

      expect(aabb).toBeNull()
    })

    it('should calculate AABB for finite plane', () => {
      const plane: PlaneGeometry = {
        type: 'plane',
        point: { x: 0, y: 0, z: 0 },
        normal: { x: 0, y: 1, z: 0 },
        width: 10,
        height: 10,
      }

      const aabb = $AABB.fromPlane(plane)

      expect(aabb).not.toBeNull()
      // Horizontal plane at y=0 with size 10x10
      expect(aabb!.min.y).toBeCloseTo(0, 5)
      expect(aabb!.max.y).toBeCloseTo(0, 5)
    })
  })

  describe('intersects', () => {
    it('should detect overlapping AABBs', () => {
      const a = {
        min: { x: 0, y: 0, z: 0 },
        max: { x: 10, y: 10, z: 10 },
      }
      const b = {
        min: { x: 5, y: 5, z: 5 },
        max: { x: 15, y: 15, z: 15 },
      }

      expect($AABB.intersects(a, b)).toBe(true)
    })

    it('should detect non-overlapping AABBs', () => {
      const a = {
        min: { x: 0, y: 0, z: 0 },
        max: { x: 10, y: 10, z: 10 },
      }
      const b = {
        min: { x: 20, y: 20, z: 20 },
        max: { x: 30, y: 30, z: 30 },
      }

      expect($AABB.intersects(a, b)).toBe(false)
    })

    it('should detect touching AABBs as intersecting', () => {
      const a = {
        min: { x: 0, y: 0, z: 0 },
        max: { x: 10, y: 10, z: 10 },
      }
      const b = {
        min: { x: 10, y: 0, z: 0 },
        max: { x: 20, y: 10, z: 10 },
      }

      expect($AABB.intersects(a, b)).toBe(true)
    })

    it('should detect contained AABB', () => {
      const outer = {
        min: { x: 0, y: 0, z: 0 },
        max: { x: 100, y: 100, z: 100 },
      }
      const inner = {
        min: { x: 40, y: 40, z: 40 },
        max: { x: 60, y: 60, z: 60 },
      }

      expect($AABB.intersects(outer, inner)).toBe(true)
      expect($AABB.intersects(inner, outer)).toBe(true)
    })
  })
})
