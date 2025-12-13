import { describe, it, expect } from 'vitest'
import {
  calculateFrustum,
  isInFrustum,
  cullObjects,
  extendFrustumForShadow,
  calculateShadowFrustum,
} from './FrustumCulling'
import type { OrthographicCamera, SceneSphere, SceneBox, DirectionalLight } from '../Domain/ValueObject'

describe('FrustumCulling', () => {
  // Camera looking from z=100 towards origin
  const camera: OrthographicCamera = {
    type: 'orthographic',
    position: { x: 0, y: 0, z: 100 },
    lookAt: { x: 0, y: 0, z: 0 },
    up: { x: 0, y: 1, z: 0 },
    width: 20,
    height: 20,
  }

  describe('calculateFrustum', () => {
    it('should calculate frustum for orthographic camera', () => {
      const frustum = calculateFrustum(camera, 0, 200)

      // Frustum should be 20x20 box from z=100 to z=-100
      expect(frustum.min.x).toBeCloseTo(-10, 5)
      expect(frustum.max.x).toBeCloseTo(10, 5)
      expect(frustum.min.y).toBeCloseTo(-10, 5)
      expect(frustum.max.y).toBeCloseTo(10, 5)
    })

    it('should use default far plane when not specified', () => {
      const frustum = calculateFrustum(camera)

      expect(frustum.min.x).toBeCloseTo(-10, 5)
      expect(frustum.max.x).toBeCloseTo(10, 5)
    })
  })

  describe('isInFrustum', () => {
    const frustum = calculateFrustum(camera, 0, 200)

    it('should return true for sphere inside frustum', () => {
      const sphere: SceneSphere = {
        type: 'sphere',
        geometry: {
          type: 'sphere',
          center: { x: 0, y: 0, z: 50 },
          radius: 5,
        },
        color: { r: 1, g: 1, b: 1 },
        alpha: 1,
        ior: 1,
      }

      expect(isInFrustum(sphere, frustum)).toBe(true)
    })

    it('should return true for sphere partially inside frustum', () => {
      const sphere: SceneSphere = {
        type: 'sphere',
        geometry: {
          type: 'sphere',
          center: { x: 12, y: 0, z: 50 }, // Center outside but radius overlaps
          radius: 5,
        },
        color: { r: 1, g: 1, b: 1 },
        alpha: 1,
        ior: 1,
      }

      expect(isInFrustum(sphere, frustum)).toBe(true)
    })

    it('should return false for sphere outside frustum', () => {
      const sphere: SceneSphere = {
        type: 'sphere',
        geometry: {
          type: 'sphere',
          center: { x: 100, y: 0, z: 50 }, // Far outside
          radius: 5,
        },
        color: { r: 1, g: 1, b: 1 },
        alpha: 1,
        ior: 1,
      }

      expect(isInFrustum(sphere, frustum)).toBe(false)
    })

    it('should return true for box inside frustum', () => {
      const box: SceneBox = {
        type: 'box',
        geometry: {
          type: 'box',
          center: { x: 0, y: 0, z: 50 },
          size: { x: 4, y: 4, z: 4 },
        },
        color: { r: 1, g: 1, b: 1 },
        alpha: 1,
        ior: 1,
      }

      expect(isInFrustum(box, frustum)).toBe(true)
    })

    it('should return false for box outside frustum', () => {
      const box: SceneBox = {
        type: 'box',
        geometry: {
          type: 'box',
          center: { x: 50, y: 50, z: 50 },
          size: { x: 4, y: 4, z: 4 },
        },
        color: { r: 1, g: 1, b: 1 },
        alpha: 1,
        ior: 1,
      }

      expect(isInFrustum(box, frustum)).toBe(false)
    })
  })

  describe('cullObjects', () => {
    const frustum = calculateFrustum(camera, 0, 200)

    it('should filter out objects outside frustum', () => {
      const spheres: SceneSphere[] = [
        {
          type: 'sphere',
          geometry: { type: 'sphere', center: { x: 0, y: 0, z: 50 }, radius: 5 },
          color: { r: 1, g: 0, b: 0 },
          alpha: 1,
          ior: 1,
        },
        {
          type: 'sphere',
          geometry: { type: 'sphere', center: { x: 100, y: 0, z: 50 }, radius: 5 },
          color: { r: 0, g: 1, b: 0 },
          alpha: 1,
          ior: 1,
        },
        {
          type: 'sphere',
          geometry: { type: 'sphere', center: { x: 5, y: 5, z: 50 }, radius: 2 },
          color: { r: 0, g: 0, b: 1 },
          alpha: 1,
          ior: 1,
        },
      ]

      const culled = cullObjects(spheres, frustum)

      expect(culled).toHaveLength(2)
      expect(culled[0].color.r).toBe(1) // Red sphere (inside)
      expect(culled[1].color.b).toBe(1) // Blue sphere (inside)
    })

    it('should return all objects when all are inside', () => {
      const spheres: SceneSphere[] = [
        {
          type: 'sphere',
          geometry: { type: 'sphere', center: { x: 0, y: 0, z: 50 }, radius: 1 },
          color: { r: 1, g: 0, b: 0 },
          alpha: 1,
          ior: 1,
        },
        {
          type: 'sphere',
          geometry: { type: 'sphere', center: { x: 5, y: 5, z: 50 }, radius: 1 },
          color: { r: 0, g: 1, b: 0 },
          alpha: 1,
          ior: 1,
        },
      ]

      const culled = cullObjects(spheres, frustum)

      expect(culled).toHaveLength(2)
    })

    it('should return empty array when all are outside', () => {
      const spheres: SceneSphere[] = [
        {
          type: 'sphere',
          geometry: { type: 'sphere', center: { x: 100, y: 0, z: 50 }, radius: 1 },
          color: { r: 1, g: 0, b: 0 },
          alpha: 1,
          ior: 1,
        },
        {
          type: 'sphere',
          geometry: { type: 'sphere', center: { x: -100, y: 0, z: 50 }, radius: 1 },
          color: { r: 0, g: 1, b: 0 },
          alpha: 1,
          ior: 1,
        },
      ]

      const culled = cullObjects(spheres, frustum)

      expect(culled).toHaveLength(0)
    })
  })

  describe('extendFrustumForShadow', () => {
    it('should extend frustum in opposite direction of light', () => {
      const frustum = {
        min: { x: -10, y: -10, z: 0 },
        max: { x: 10, y: 10, z: 100 },
      }

      // Light pointing down (-Y direction)
      const lightDir = { x: 0, y: -1, z: 0 }
      const extended = extendFrustumForShadow(frustum, lightDir, 50)

      // Should extend upward (opposite of light direction)
      expect(extended.min.x).toBe(-10)
      expect(extended.max.x).toBe(10)
      expect(extended.min.y).toBe(-10)
      expect(extended.max.y).toBe(60) // Extended by 50 in +Y
      expect(extended.min.z).toBe(0)
      expect(extended.max.z).toBe(100)
    })

    it('should extend frustum for diagonal light', () => {
      const frustum = {
        min: { x: 0, y: 0, z: 0 },
        max: { x: 10, y: 10, z: 10 },
      }

      // Light pointing diagonally (+X, -Y)
      // Shadows come from opposite direction (-X, +Y)
      const lightDir = { x: 0.707, y: -0.707, z: 0 }
      const extended = extendFrustumForShadow(frustum, lightDir, 100)

      // Should extend in opposite direction: -X and +Y
      expect(extended.min.x).toBeLessThan(0) // Extended in -X
      expect(extended.max.y).toBeGreaterThan(10) // Extended in +Y
    })
  })

  describe('calculateShadowFrustum', () => {
    const baseFrustum = {
      min: { x: -10, y: -10, z: 0 },
      max: { x: 10, y: 10, z: 100 },
    }

    it('should return base frustum when no lights', () => {
      const result = calculateShadowFrustum(baseFrustum, [])

      expect(result).toEqual(baseFrustum)
    })

    it('should extend frustum for single light', () => {
      const lights: DirectionalLight[] = [
        {
          type: 'directional',
          direction: { x: 0, y: -1, z: 0 },
          color: { r: 1, g: 1, b: 1 },
          intensity: 1,
        },
      ]

      const result = calculateShadowFrustum(baseFrustum, lights, 50)

      expect(result.max.y).toBeGreaterThan(baseFrustum.max.y)
    })

    it('should combine extensions for multiple lights', () => {
      const lights: DirectionalLight[] = [
        {
          type: 'directional',
          direction: { x: -1, y: 0, z: 0 }, // Light from right
          color: { r: 1, g: 1, b: 1 },
          intensity: 1,
        },
        {
          type: 'directional',
          direction: { x: 0, y: -1, z: 0 }, // Light from above
          color: { r: 1, g: 1, b: 1 },
          intensity: 1,
        },
      ]

      const result = calculateShadowFrustum(baseFrustum, lights, 50)

      // Should extend in both +X and +Y directions
      expect(result.max.x).toBeGreaterThan(baseFrustum.max.x)
      expect(result.max.y).toBeGreaterThan(baseFrustum.max.y)
    })
  })
})
