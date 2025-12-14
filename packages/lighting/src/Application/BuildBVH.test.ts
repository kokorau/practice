import { describe, it, expect } from 'vitest'
import { buildBVH, $BuildBVH } from './BuildBVH'
import type { SceneBox, SceneSphere, SceneCapsule, ScenePlane } from '../Domain/ValueObject/Scene'
import { BVH_OBJECT_TYPE } from '../Domain/ValueObject/BVH'

const createBox = (x: number, y: number, z: number): SceneBox => ({
  type: 'box',
  geometry: {
    type: 'box',
    center: { x, y, z },
    size: { x: 1, y: 1, z: 1 },
    rotation: { x: 0, y: 0, z: 0 },
  },
  color: { r: 1, g: 0, b: 0 },
  alpha: 1,
  ior: 1,
})

const createSphere = (x: number, y: number, z: number): SceneSphere => ({
  type: 'sphere',
  geometry: {
    type: 'sphere',
    center: { x, y, z },
    radius: 0.5,
  },
  color: { r: 0, g: 1, b: 0 },
  alpha: 1,
  ior: 1,
})

const createCapsule = (x: number, y: number, z: number): SceneCapsule => ({
  type: 'capsule',
  geometry: {
    type: 'capsule',
    pointA: { x, y, z },
    pointB: { x, y: y + 1, z },
    radius: 0.3,
  },
  color: { r: 0, g: 0, b: 1 },
  alpha: 1,
  ior: 1,
})

const createFinitePlane = (x: number, y: number, z: number): ScenePlane => ({
  type: 'plane',
  geometry: {
    type: 'plane',
    point: { x, y, z },
    normal: { x: 0, y: 1, z: 0 },
    width: 2,
    height: 2,
  },
  color: { r: 0.5, g: 0.5, b: 0.5 },
  alpha: 1,
  ior: 1,
})

const createInfinitePlane = (y: number): ScenePlane => ({
  type: 'plane',
  geometry: {
    type: 'plane',
    point: { x: 0, y, z: 0 },
    normal: { x: 0, y: 1, z: 0 },
  },
  color: { r: 0.5, g: 0.5, b: 0.5 },
  alpha: 1,
  ior: 1,
})

describe('buildBVH', () => {
  describe('MIN_PRIMITIVES', () => {
    it('exports MIN_PRIMITIVES constant', () => {
      expect($BuildBVH.MIN_PRIMITIVES).toBe(4)
    })
  })

  describe('with fewer than MIN_PRIMITIVES', () => {
    it('returns undefined bvh for empty input', () => {
      const result = buildBVH({
        boxes: [],
        spheres: [],
        capsules: [],
        planes: [],
      })
      expect(result.bvh).toBeUndefined()
      expect(result.bvhPlaneIndices).toEqual([])
      expect(result.infinitePlaneIndices).toEqual([])
    })

    it('returns undefined bvh for 3 primitives', () => {
      const result = buildBVH({
        boxes: [createBox(0, 0, 0), createBox(2, 0, 0)],
        spheres: [createSphere(4, 0, 0)],
        capsules: [],
        planes: [],
      })
      expect(result.bvh).toBeUndefined()
    })
  })

  describe('with enough primitives', () => {
    it('builds BVH for 4+ primitives', () => {
      const result = buildBVH({
        boxes: [createBox(0, 0, 0), createBox(2, 0, 0)],
        spheres: [createSphere(4, 0, 0), createSphere(6, 0, 0)],
        capsules: [],
        planes: [],
      })
      expect(result.bvh).toBeDefined()
      expect(result.bvh!.nodes.length).toBeGreaterThan(0)
      expect(result.bvh!.rootIndex).toBe(0)
    })

    it('includes all object types in BVH', () => {
      const result = buildBVH({
        boxes: [createBox(0, 0, 0)],
        spheres: [createSphere(2, 0, 0)],
        capsules: [createCapsule(4, 0, 0)],
        planes: [createFinitePlane(6, 0, 0)],
      })
      expect(result.bvh).toBeDefined()

      const objectTypes = new Set(
        result.bvh!.nodes
          .filter((n) => n.leftChild < 0)
          .map((n) => n.objectType)
      )
      expect(objectTypes.has(BVH_OBJECT_TYPE.BOX)).toBe(true)
      expect(objectTypes.has(BVH_OBJECT_TYPE.SPHERE)).toBe(true)
      expect(objectTypes.has(BVH_OBJECT_TYPE.CAPSULE)).toBe(true)
      expect(objectTypes.has(BVH_OBJECT_TYPE.PLANE)).toBe(true)
    })
  })

  describe('plane handling', () => {
    it('includes finite planes in BVH', () => {
      const result = buildBVH({
        boxes: [createBox(0, 0, 0), createBox(2, 0, 0)],
        spheres: [],
        capsules: [],
        planes: [createFinitePlane(4, 0, 0), createFinitePlane(6, 0, 0)],
      })
      expect(result.bvhPlaneIndices).toEqual([0, 1])
      expect(result.infinitePlaneIndices).toEqual([])
    })

    it('excludes infinite planes from BVH', () => {
      const result = buildBVH({
        boxes: [createBox(0, 0, 0), createBox(2, 0, 0), createBox(4, 0, 0), createBox(6, 0, 0)],
        spheres: [],
        capsules: [],
        planes: [createInfinitePlane(0), createInfinitePlane(-1)],
      })
      expect(result.bvhPlaneIndices).toEqual([])
      expect(result.infinitePlaneIndices).toEqual([0, 1])
    })

    it('separates finite and infinite planes', () => {
      const result = buildBVH({
        boxes: [createBox(0, 0, 0), createBox(2, 0, 0)],
        spheres: [],
        capsules: [],
        planes: [
          createFinitePlane(4, 0, 0),
          createInfinitePlane(0),
          createFinitePlane(6, 0, 0),
        ],
      })
      expect(result.bvhPlaneIndices).toEqual([0, 2])
      expect(result.infinitePlaneIndices).toEqual([1])
    })
  })

  describe('BVH structure', () => {
    it('creates valid tree structure', () => {
      const result = buildBVH({
        boxes: [
          createBox(0, 0, 0),
          createBox(10, 0, 0),
          createBox(20, 0, 0),
          createBox(30, 0, 0),
        ],
        spheres: [],
        capsules: [],
        planes: [],
      })

      expect(result.bvh).toBeDefined()
      const nodes = result.bvh!.nodes

      // Root should be internal node
      const root = nodes[0]!
      expect(root.leftChild).toBeGreaterThanOrEqual(0)
      expect(root.rightChild).toBeGreaterThanOrEqual(0)

      // Leaf nodes should have valid object indices
      const leafNodes = nodes.filter((n) => n.leftChild < 0)
      expect(leafNodes.length).toBe(4)
      for (const leaf of leafNodes) {
        expect(leaf.objectIndex).toBeGreaterThanOrEqual(0)
      }
    })
  })
})
