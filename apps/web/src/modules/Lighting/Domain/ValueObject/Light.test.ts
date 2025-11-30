import { describe, it, expect } from 'vitest'
import { $Light } from './Light'
import type { Vector3 } from '../../../Vector/Domain/ValueObject'
import type { Color } from './Color'

describe('$Light', () => {
  const white: Color = [1, 1, 1]
  const red: Color = [1, 0, 0]

  describe('createAmbient', () => {
    it('should create ambient light', () => {
      const light = $Light.createAmbient(white, 0.5)

      expect(light.type).toBe('ambient')
      expect(light.color).toBe(white)
      expect(light.intensity).toBe(0.5)
    })

    it('should clamp negative intensity to 0', () => {
      const light = $Light.createAmbient(white, -1)

      expect(light.intensity).toBe(0)
    })
  })

  describe('createDirectional', () => {
    it('should create directional light with normalized direction', () => {
      const direction: Vector3 = { x: 0, y: -2, z: 0 } // unnormalized

      const light = $Light.createDirectional(direction, white, 1)

      expect(light.type).toBe('directional')
      expect(light.direction.x).toBeCloseTo(0, 5)
      expect(light.direction.y).toBeCloseTo(-1, 5)
      expect(light.direction.z).toBeCloseTo(0, 5)
      expect(light.color).toBe(white)
      expect(light.intensity).toBe(1)
    })

    it('should clamp negative intensity to 0', () => {
      const direction: Vector3 = { x: 0, y: -1, z: 0 }

      const light = $Light.createDirectional(direction, red, -5)

      expect(light.intensity).toBe(0)
    })
  })

  describe('intensityToward', () => {
    it('should return full intensity when facing opposite direction', () => {
      const direction: Vector3 = { x: 0, y: -1, z: 0 }
      const light = $Light.createDirectional(direction, white, 2)

      // Surface facing up (opposite to light direction)
      const surfaceDir: Vector3 = { x: 0, y: 1, z: 0 }
      const intensity = $Light.intensityToward(light, surfaceDir)

      expect(intensity).toBeCloseTo(2, 5) // full intensity
    })

    it('should return 0 when facing same direction', () => {
      const direction: Vector3 = { x: 0, y: -1, z: 0 }
      const light = $Light.createDirectional(direction, white, 2)

      // Surface facing down (same as light direction)
      const surfaceDir: Vector3 = { x: 0, y: -1, z: 0 }
      const intensity = $Light.intensityToward(light, surfaceDir)

      expect(intensity).toBe(0)
    })

    it('should return half intensity at 60 degree angle', () => {
      const direction: Vector3 = { x: 0, y: -1, z: 0 }
      const light = $Light.createDirectional(direction, white, 1)

      // 60 degrees from facing the light -> cos(60) = 0.5
      const angle = Math.PI / 3 // 60 degrees
      const surfaceDir: Vector3 = { x: Math.sin(angle), y: Math.cos(angle), z: 0 }
      const intensity = $Light.intensityToward(light, surfaceDir)

      expect(intensity).toBeCloseTo(0.5, 3)
    })

    it('should return 0 when perpendicular', () => {
      const direction: Vector3 = { x: 0, y: -1, z: 0 }
      const light = $Light.createDirectional(direction, white, 1)

      // Surface facing horizontally (perpendicular to light)
      const surfaceDir: Vector3 = { x: 1, y: 0, z: 0 }
      const intensity = $Light.intensityToward(light, surfaceDir)

      expect(intensity).toBe(0)
    })
  })
})
