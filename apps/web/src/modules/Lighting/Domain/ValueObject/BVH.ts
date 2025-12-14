import type { AABB } from './AABB'

/**
 * Object type constants for BVH leaf nodes
 */
export const BVH_OBJECT_TYPE = {
  BOX: 0,
  SPHERE: 1,
  CAPSULE: 2,
  PLANE: 3,
} as const

export type BVHObjectType = (typeof BVH_OBJECT_TYPE)[keyof typeof BVH_OBJECT_TYPE]

/**
 * BVH Node
 *
 * Internal nodes have leftChild >= 0 and rightChild >= 0
 * Leaf nodes have leftChild = -1 and rightChild = -1, with objectIndex >= 0
 */
export interface BVHNode {
  /** Bounding box of this node */
  readonly aabb: AABB
  /** Left child index (-1 if leaf) */
  readonly leftChild: number
  /** Right child index (-1 if leaf) */
  readonly rightChild: number
  /** Object index for leaf nodes (-1 if internal node) */
  readonly objectIndex: number
  /** Object type for leaf nodes (0=box, 1=sphere, 2=capsule, 3=plane) */
  readonly objectType: BVHObjectType
}

/**
 * Bounding Volume Hierarchy
 */
export interface BVH {
  /** All BVH nodes (root is at index 0) */
  readonly nodes: readonly BVHNode[]
  /** Root node index (always 0) */
  readonly rootIndex: number
}

/**
 * Check if a BVH node is a leaf node
 */
const isLeaf = (node: BVHNode): boolean => node.leftChild < 0

/**
 * Create an empty BVH
 */
const empty = (): BVH => ({
  nodes: [],
  rootIndex: 0,
})

export const $BVH = {
  isLeaf,
  empty,
  OBJECT_TYPE: BVH_OBJECT_TYPE,
}
