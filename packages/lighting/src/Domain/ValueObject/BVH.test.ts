import { describe, it, expect } from 'vitest'
import { $BVH, BVH_OBJECT_TYPE } from './BVH'
import type { BVHNode } from './BVH'

describe('$BVH', () => {
  describe('OBJECT_TYPE', () => {
    it('has correct type constants', () => {
      expect($BVH.OBJECT_TYPE.BOX).toBe(0)
      expect($BVH.OBJECT_TYPE.SPHERE).toBe(1)
      expect($BVH.OBJECT_TYPE.PLANE).toBe(2)
    })

    it('matches BVH_OBJECT_TYPE export', () => {
      expect($BVH.OBJECT_TYPE).toBe(BVH_OBJECT_TYPE)
    })
  })

  describe('empty', () => {
    it('creates empty BVH', () => {
      const bvh = $BVH.empty()
      expect(bvh.nodes).toEqual([])
      expect(bvh.rootIndex).toBe(0)
    })
  })

  describe('isLeaf', () => {
    it('returns true for leaf node (leftChild < 0)', () => {
      const leafNode: BVHNode = {
        aabb: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } },
        leftChild: -1,
        rightChild: -1,
        objectIndex: 0,
        objectType: BVH_OBJECT_TYPE.BOX,
      }
      expect($BVH.isLeaf(leafNode)).toBe(true)
    })

    it('returns false for internal node (leftChild >= 0)', () => {
      const internalNode: BVHNode = {
        aabb: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } },
        leftChild: 1,
        rightChild: 2,
        objectIndex: -1,
        objectType: BVH_OBJECT_TYPE.BOX,
      }
      expect($BVH.isLeaf(internalNode)).toBe(false)
    })
  })
})
