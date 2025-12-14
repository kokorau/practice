import { describe, it, expect } from 'vitest'
import { $Space } from './Space'
import type { SceneObject } from './Object'
import type { Light } from './Light'
import type { Camera } from './Camera'

describe('$Space', () => {
  describe('create', () => {
    it('creates space with objects, lights, and camera', () => {
      const objects: SceneObject[] = [
        {
          geometry: { type: 'sphere', center: { x: 0, y: 0, z: 0 }, radius: 1 },
          material: {
            color: { r: 1, g: 0, b: 0 },
            ambient: 0.1,
            diffuse: 0.7,
            specular: 0.3,
            shininess: 32,
          },
        },
      ]
      const lights: Light[] = [
        { type: 'ambient', color: { r: 1, g: 1, b: 1 }, intensity: 0.5 },
      ]
      const camera: Camera = {
        type: 'orthographic',
        position: { x: 0, y: 0, z: 10 },
        target: { x: 0, y: 0, z: 0 },
        up: { x: 0, y: 1, z: 0 },
        width: 10,
        height: 10,
        near: 0.1,
        far: 100,
      }

      const space = $Space.create(objects, lights, camera)
      expect(space.objects).toBe(objects)
      expect(space.lights).toBe(lights)
      expect(space.camera).toBe(camera)
    })

    it('works with empty arrays', () => {
      const camera: Camera = {
        type: 'orthographic',
        position: { x: 0, y: 5, z: 5 },
        target: { x: 0, y: 0, z: 0 },
        up: { x: 0, y: 1, z: 0 },
        width: 20,
        height: 20,
        near: 1,
        far: 50,
      }

      const space = $Space.create([], [], camera)
      expect(space.objects).toEqual([])
      expect(space.lights).toEqual([])
      expect(space.camera).toBe(camera)
    })
  })
})
