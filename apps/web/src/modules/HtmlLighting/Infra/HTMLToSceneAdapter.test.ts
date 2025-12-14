/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from 'vitest'
import { HTMLToSceneAdapter } from './HTMLToSceneAdapter'
import type { Viewport } from '../Application'

describe('HTMLToSceneAdapter', () => {
  const viewport: Viewport = {
    width: 800,
    height: 600,
    scrollX: 0,
    scrollY: 0,
  }

  describe('parseElements', () => {
    it('parses element with background color', () => {
      const root = document.createElement('div')
      root.style.backgroundColor = 'rgb(255, 0, 0)'
      root.style.width = '100px'
      root.style.height = '50px'
      document.body.appendChild(root)

      const elements = HTMLToSceneAdapter.parseElements(root, viewport)

      expect(elements).toHaveLength(1)
      expect(elements[0]!.backgroundColor).toEqual({
        r: 1,
        g: 0,
        b: 0,
      })
      expect(elements[0]!.depth).toBe(0)

      document.body.removeChild(root)
    })

    it('ignores elements with transparent background', () => {
      const root = document.createElement('div')
      root.style.backgroundColor = 'transparent'
      document.body.appendChild(root)

      const elements = HTMLToSceneAdapter.parseElements(root, viewport)

      expect(elements).toHaveLength(0)

      document.body.removeChild(root)
    })

    it('calculates depth based on nesting', () => {
      const root = document.createElement('div')
      root.style.backgroundColor = 'rgb(255, 0, 0)'

      const child = document.createElement('div')
      child.style.backgroundColor = 'rgb(0, 255, 0)'
      root.appendChild(child)

      const grandchild = document.createElement('div')
      grandchild.style.backgroundColor = 'rgb(0, 0, 255)'
      child.appendChild(grandchild)

      document.body.appendChild(root)

      const elements = HTMLToSceneAdapter.parseElements(root, viewport)

      expect(elements).toHaveLength(3)
      expect(elements[0]!.depth).toBe(0) // root
      expect(elements[1]!.depth).toBe(1) // child
      expect(elements[2]!.depth).toBe(2) // grandchild

      document.body.removeChild(root)
    })

    it('parses rgba colors', () => {
      const root = document.createElement('div')
      root.style.backgroundColor = 'rgba(128, 64, 32, 0.5)'
      document.body.appendChild(root)

      const elements = HTMLToSceneAdapter.parseElements(root, viewport)

      expect(elements).toHaveLength(1)
      expect(elements[0]!.backgroundColor.r).toBeCloseTo(128 / 255, 2)
      expect(elements[0]!.backgroundColor.g).toBeCloseTo(64 / 255, 2)
      expect(elements[0]!.backgroundColor.b).toBeCloseTo(32 / 255, 2)

      document.body.removeChild(root)
    })
  })

  describe('toScene', () => {
    it('creates camera with viewport dimensions', () => {
      const result = HTMLToSceneAdapter.toScene([], viewport)

      expect(result.camera.width).toBe(800)
      expect(result.camera.height).toBe(600)
      expect(result.camera.type).toBe('orthographic')
    })

    it('creates background plane for empty elements', () => {
      const result = HTMLToSceneAdapter.toScene([], viewport)

      // Contains only the background plane
      expect(result.scene.objects).toHaveLength(1)
      expect(result.scene.objects[0]!.type).toBe('plane')
    })

    it('converts element to box at correct position', () => {
      const elements = [
        {
          x: 400, // center X of viewport
          y: 300, // center Y of viewport
          width: 100,
          height: 50,
          backgroundColor: { r: 1, g: 0, b: 0 },
          depth: 0,
        },
      ]

      const result = HTMLToSceneAdapter.toScene(elements, viewport)

      // 1 background plane + 1 box
      expect(result.scene.objects).toHaveLength(2)

      // First object is background plane, second is the box
      const box = result.scene.objects[1]!
      expect(box.type).toBe('box')

      if (box.type === 'box') {
        // Element center at (450, 325) -> world coords relative to viewport center (400, 300)
        // worldX = 450 - 400 = 50
        // worldY = -(325 - 300) = -25 (inverted)
        expect(box.geometry.center.x).toBe(50)
        expect(box.geometry.center.y).toBe(-25)
        expect(box.geometry.size.x).toBe(100)
        expect(box.geometry.size.y).toBe(50)
      }
    })

    it('positions nested elements at different Z depths', () => {
      const elements = [
        {
          x: 0, y: 0, width: 100, height: 100,
          backgroundColor: { r: 1, g: 0, b: 0 },
          depth: 0,
        },
        {
          x: 10, y: 10, width: 80, height: 80,
          backgroundColor: { r: 0, g: 1, b: 0 },
          depth: 1,
        },
        {
          x: 20, y: 20, width: 60, height: 60,
          backgroundColor: { r: 0, g: 0, b: 1 },
          depth: 2,
        },
      ]

      const result = HTMLToSceneAdapter.toScene(elements, viewport)

      // 1 background plane + 3 boxes
      expect(result.scene.objects).toHaveLength(4)

      // Check Z decreases with depth (deeper nesting = closer to camera)
      // maxDepth = 2, DEPTH_UNIT = 2
      // z = (maxDepth - depth) * DEPTH_UNIT
      const boxes = result.scene.objects.filter((o): o is import('../../Lighting/Infra/WebGL').SceneBox => o.type === 'box')
      expect(boxes[0]!.geometry.center.z).toBe(4)  // (2 - 0) * 2 = 4 (root, furthest back)
      expect(boxes[1]!.geometry.center.z).toBe(2)  // (2 - 1) * 2 = 2
      expect(boxes[2]!.geometry.center.z).toBe(0)  // (2 - 2) * 2 = 0 (deepest, closest to camera)
    })
  })
})
