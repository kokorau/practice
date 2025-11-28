import { describe, it, expect } from 'vitest'
import { intersectPlane } from './Intersect'
import type { Ray } from '../../../Vector/Domain/ValueObject'
import type { PlaneGeometry } from './Geometry'

describe('intersectPlane', () => {
  it('intersects ray pointing at plane', () => {
    const ray: Ray = {
      origin: { x: 0, y: 0, z: 0 },
      direction: { x: 0, y: 0, z: 1 },
    }
    const plane: PlaneGeometry = {
      type: 'plane',
      point: { x: 0, y: 0, z: 5 },
      normal: { x: 0, y: 0, z: -1 },
    }

    const result = intersectPlane(ray, plane)

    expect(result).not.toBeNull()
    expect(result!.t).toBe(5)
    expect(result!.point).toEqual({ x: 0, y: 0, z: 5 })
  })

  it('returns null for parallel ray', () => {
    const ray: Ray = {
      origin: { x: 0, y: 0, z: 0 },
      direction: { x: 1, y: 0, z: 0 },
    }
    const plane: PlaneGeometry = {
      type: 'plane',
      point: { x: 0, y: 0, z: 5 },
      normal: { x: 0, y: 0, z: 1 },
    }

    const result = intersectPlane(ray, plane)

    expect(result).toBeNull()
  })

  it('returns null for ray pointing away from plane', () => {
    const ray: Ray = {
      origin: { x: 0, y: 0, z: 0 },
      direction: { x: 0, y: 0, z: -1 },
    }
    const plane: PlaneGeometry = {
      type: 'plane',
      point: { x: 0, y: 0, z: 5 },
      normal: { x: 0, y: 0, z: -1 },
    }

    const result = intersectPlane(ray, plane)

    expect(result).toBeNull()
  })

  it('intersects at correct point for angled ray', () => {
    const ray: Ray = {
      origin: { x: 0, y: 0, z: 0 },
      direction: { x: 1, y: 0, z: 1 },
    }
    const plane: PlaneGeometry = {
      type: 'plane',
      point: { x: 0, y: 0, z: 5 },
      normal: { x: 0, y: 0, z: -1 },
    }

    const result = intersectPlane(ray, plane)

    expect(result).not.toBeNull()
    expect(result!.t).toBe(5)
    expect(result!.point.x).toBe(5)
    expect(result!.point.z).toBe(5)
  })

  it('returns normal facing toward ray origin', () => {
    const ray: Ray = {
      origin: { x: 0, y: 0, z: 0 },
      direction: { x: 0, y: 0, z: 1 },
    }
    const plane: PlaneGeometry = {
      type: 'plane',
      point: { x: 0, y: 0, z: 5 },
      normal: { x: 0, y: 0, z: 1 }, // Pointing same direction as ray
    }

    const result = intersectPlane(ray, plane)

    expect(result).not.toBeNull()
    // Normal should be flipped to face ray
    expect(result!.normal.z).toBe(-1)
  })
})
