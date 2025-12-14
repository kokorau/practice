import { describe, it, expect } from 'vitest'
import { $Camera } from './Camera'
import type { Vector3 } from '@practice/vector'

describe('$Camera', () => {
  const defaultPosition: Vector3 = { x: 0, y: 0, z: 10 }
  const defaultLookAt: Vector3 = { x: 0, y: 0, z: 0 }
  const defaultUp: Vector3 = { x: 0, y: 1, z: 0 }

  describe('createPerspective', () => {
    it('should create a perspective camera', () => {
      const camera = $Camera.createPerspective(
        defaultPosition,
        defaultLookAt,
        defaultUp,
        60,
        16 / 9
      )

      expect(camera.type).toBe('perspective')
      expect(camera.position).toBe(defaultPosition)
      expect(camera.lookAt).toBe(defaultLookAt)
      expect(camera.fov).toBe(60)
      expect(camera.aspectRatio).toBeCloseTo(16 / 9, 5)
    })

    it('should normalize up vector', () => {
      const unnormalizedUp: Vector3 = { x: 0, y: 2, z: 0 }

      const camera = $Camera.createPerspective(
        defaultPosition,
        defaultLookAt,
        unnormalizedUp,
        60,
        1
      )

      expect(camera.up.x).toBeCloseTo(0, 5)
      expect(camera.up.y).toBeCloseTo(1, 5)
      expect(camera.up.z).toBeCloseTo(0, 5)
    })

    it('should clamp FOV to 1-179 range', () => {
      const cameraLow = $Camera.createPerspective(
        defaultPosition,
        defaultLookAt,
        defaultUp,
        -10,
        1
      )
      expect(cameraLow.fov).toBe(1)

      const cameraHigh = $Camera.createPerspective(
        defaultPosition,
        defaultLookAt,
        defaultUp,
        200,
        1
      )
      expect(cameraHigh.fov).toBe(179)
    })

    it('should use absolute value for aspect ratio', () => {
      const camera = $Camera.createPerspective(
        defaultPosition,
        defaultLookAt,
        defaultUp,
        60,
        -16 / 9
      )

      expect(camera.aspectRatio).toBeCloseTo(16 / 9, 5)
    })
  })

  describe('createOrthographic', () => {
    it('should create an orthographic camera', () => {
      const camera = $Camera.createOrthographic(
        defaultPosition,
        defaultLookAt,
        defaultUp,
        20,
        15
      )

      expect(camera.type).toBe('orthographic')
      expect(camera.position).toBe(defaultPosition)
      expect(camera.lookAt).toBe(defaultLookAt)
      expect(camera.width).toBe(20)
      expect(camera.height).toBe(15)
    })

    it('should normalize up vector', () => {
      const unnormalizedUp: Vector3 = { x: 0, y: 0, z: -3 }

      const camera = $Camera.createOrthographic(
        defaultPosition,
        defaultLookAt,
        unnormalizedUp,
        10,
        10
      )

      expect(camera.up.x).toBeCloseTo(0, 5)
      expect(camera.up.y).toBeCloseTo(0, 5)
      expect(camera.up.z).toBeCloseTo(-1, 5)
    })

    it('should use absolute values for width and height', () => {
      const camera = $Camera.createOrthographic(
        defaultPosition,
        defaultLookAt,
        defaultUp,
        -20,
        -15
      )

      expect(camera.width).toBe(20)
      expect(camera.height).toBe(15)
    })
  })
})
