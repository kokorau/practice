import { describe, it, expect } from 'vitest'
import { $Scene, $RenderableObject } from './Scene'
import type { RenderableObject } from './Scene'
import type { Light } from './Light'

describe('$RenderableObject', () => {
  describe('createPlane', () => {
    it('creates plane with defaults', () => {
      const plane = $RenderableObject.createPlane(
        { type: 'plane', point: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 } },
        { r: 0.5, g: 0.5, b: 0.5 }
      )
      expect(plane.type).toBe('plane')
      expect(plane.alpha).toBe(1)
      expect(plane.ior).toBe(1)
    })

    it('creates plane with custom alpha and ior', () => {
      const plane = $RenderableObject.createPlane(
        { type: 'plane', point: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 } },
        { r: 1, g: 1, b: 1 },
        0.5,
        1.5
      )
      expect(plane.alpha).toBe(0.5)
      expect(plane.ior).toBe(1.5)
    })
  })

  describe('createBox', () => {
    it('creates box with defaults', () => {
      const box = $RenderableObject.createBox(
        {
          type: 'box',
          center: { x: 0, y: 0, z: 0 },
          size: { x: 1, y: 1, z: 1 },
          rotation: { x: 0, y: 0, z: 0 },
        },
        { r: 1, g: 0, b: 0 }
      )
      expect(box.type).toBe('box')
      expect(box.alpha).toBe(1)
      expect(box.ior).toBe(1)
    })
  })

  describe('createSphere', () => {
    it('creates sphere with defaults', () => {
      const sphere = $RenderableObject.createSphere(
        { type: 'sphere', center: { x: 0, y: 0, z: 0 }, radius: 1 },
        { r: 0, g: 0, b: 1 }
      )
      expect(sphere.type).toBe('sphere')
      expect(sphere.alpha).toBe(1)
      expect(sphere.ior).toBe(1)
    })

    it('creates sphere with custom values', () => {
      const sphere = $RenderableObject.createSphere(
        { type: 'sphere', center: { x: 1, y: 2, z: 3 }, radius: 2 },
        { r: 1, g: 1, b: 0 },
        0.8,
        2.4
      )
      expect(sphere.alpha).toBe(0.8)
      expect(sphere.ior).toBe(2.4)
    })
  })
})

describe('$Scene', () => {
  describe('create', () => {
    it('creates empty scene with defaults', () => {
      const scene = $Scene.create()
      expect(scene.objects).toEqual([])
      expect(scene.lights).toEqual([])
      expect(scene.backgroundColor).toBeUndefined()
      expect(scene.shadowBlur).toBeUndefined()
    })

    it('creates scene with all params', () => {
      const objects: RenderableObject[] = [
        $RenderableObject.createSphere(
          { type: 'sphere', center: { x: 0, y: 0, z: 0 }, radius: 1 },
          { r: 1, g: 0, b: 0 }
        ),
      ]
      const lights: Light[] = [
        { type: 'ambient', color: { r: 1, g: 1, b: 1 }, intensity: 0.3 },
      ]
      const backgroundColor = { r: 0.1, g: 0.1, b: 0.2 }

      const scene = $Scene.create({
        objects,
        lights,
        backgroundColor,
        shadowBlur: 0.5,
      })

      expect(scene.objects).toBe(objects)
      expect(scene.lights).toBe(lights)
      expect(scene.backgroundColor).toBe(backgroundColor)
      expect(scene.shadowBlur).toBe(0.5)
    })
  })

  describe('add', () => {
    it('adds renderable objects to scene', () => {
      const scene = $Scene.create()
      const sphere = $RenderableObject.createSphere(
        { type: 'sphere', center: { x: 0, y: 0, z: 0 }, radius: 1 },
        { r: 1, g: 0, b: 0 }
      )
      const box = $RenderableObject.createBox(
        {
          type: 'box',
          center: { x: 2, y: 0, z: 0 },
          size: { x: 1, y: 1, z: 1 },
          rotation: { x: 0, y: 0, z: 0 },
        },
        { r: 0, g: 1, b: 0 }
      )

      const newScene = $Scene.add(scene, sphere, box)
      expect(newScene.objects).toHaveLength(2)
      expect(newScene.objects[0]).toBe(sphere)
      expect(newScene.objects[1]).toBe(box)
    })

    it('adds lights to scene', () => {
      const scene = $Scene.create()
      const ambientLight: Light = {
        type: 'ambient',
        color: { r: 1, g: 1, b: 1 },
        intensity: 0.5,
      }
      const directionalLight: Light = {
        type: 'directional',
        direction: { x: 0, y: -1, z: 0 },
        color: { r: 1, g: 1, b: 1 },
        intensity: 1,
      }

      const newScene = $Scene.add(scene, ambientLight, directionalLight)
      expect(newScene.lights).toHaveLength(2)
      expect(newScene.lights[0]).toBe(ambientLight)
      expect(newScene.lights[1]).toBe(directionalLight)
    })

    it('adds mixed items (objects and lights)', () => {
      const scene = $Scene.create()
      const sphere = $RenderableObject.createSphere(
        { type: 'sphere', center: { x: 0, y: 0, z: 0 }, radius: 1 },
        { r: 1, g: 0, b: 0 }
      )
      const light: Light = {
        type: 'ambient',
        color: { r: 1, g: 1, b: 1 },
        intensity: 0.5,
      }

      const newScene = $Scene.add(scene, sphere, light)
      expect(newScene.objects).toHaveLength(1)
      expect(newScene.lights).toHaveLength(1)
    })

    it('preserves existing scene properties', () => {
      const scene = $Scene.create({
        backgroundColor: { r: 0.1, g: 0.1, b: 0.1 },
        shadowBlur: 0.3,
      })
      const sphere = $RenderableObject.createSphere(
        { type: 'sphere', center: { x: 0, y: 0, z: 0 }, radius: 1 },
        { r: 1, g: 0, b: 0 }
      )

      const newScene = $Scene.add(scene, sphere)
      expect(newScene.backgroundColor).toEqual({ r: 0.1, g: 0.1, b: 0.1 })
      expect(newScene.shadowBlur).toBe(0.3)
    })
  })
})
