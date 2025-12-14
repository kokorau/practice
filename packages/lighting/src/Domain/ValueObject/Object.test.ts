import { describe, it, expect } from 'vitest'
import { $SceneObject } from './Object'
import type { Geometry } from './Geometry'
import type { Material } from './Material'

describe('$SceneObject', () => {
  describe('create', () => {
    it('creates scene object with geometry and material', () => {
      const geometry: Geometry = {
        type: 'sphere',
        center: { x: 0, y: 0, z: 0 },
        radius: 1,
      }
      const material: Material = {
        color: { r: 1, g: 0, b: 0 },
        ambient: 0.1,
        diffuse: 0.7,
        specular: 0.3,
        shininess: 32,
      }

      const obj = $SceneObject.create(geometry, material)
      expect(obj.geometry).toBe(geometry)
      expect(obj.material).toBe(material)
    })

    it('preserves reference equality', () => {
      const geometry: Geometry = {
        type: 'box',
        center: { x: 1, y: 2, z: 3 },
        size: { x: 2, y: 2, z: 2 },
        rotation: { x: 0, y: 0, z: 0 },
      }
      const material: Material = {
        color: { r: 0, g: 1, b: 0 },
        ambient: 0.2,
        diffuse: 0.6,
        specular: 0.2,
        shininess: 16,
      }

      const obj = $SceneObject.create(geometry, material)
      expect(obj.geometry).toBe(geometry)
      expect(obj.material).toBe(material)
    })
  })
})
