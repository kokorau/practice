import type { Vector3 } from '@practice/vector'
import type { AABB } from '../Domain/ValueObject/AABB'
import { $AABB } from '../Domain/ValueObject/AABB'
import type { BVH, BVHNode, BVHObjectType } from '../Domain/ValueObject/BVH'
import { BVH_OBJECT_TYPE } from '../Domain/ValueObject/BVH'
import type {
  SceneBox,
  SceneCapsule,
  SceneSphere,
  ScenePlane,
} from '../Domain/ValueObject/Scene'

// SAH constants
const SAH_TRAVERSAL_COST = 1.0
const SAH_INTERSECTION_COST = 2.0
const SAH_BIN_COUNT = 12

// Minimum primitives to build BVH (otherwise linear scan is faster)
const MIN_PRIMITIVES_FOR_BVH = 4

/**
 * Primitive data for BVH construction
 */
interface BuildPrimitive {
  readonly aabb: AABB
  readonly centroid: Vector3
  readonly objectIndex: number
  readonly objectType: BVHObjectType
}

/**
 * SAH split candidate
 */
interface SAHSplit {
  readonly axis: 0 | 1 | 2
  readonly position: number
  readonly cost: number
}

/**
 * Bin for SAH computation
 */
interface SAHBin {
  count: number
  bounds: AABB | null
}

const EPSILON = 1e-6

/**
 * Get axis value from vector
 */
const getAxisValue = (v: Vector3, axis: 0 | 1 | 2): number => {
  return axis === 0 ? v.x : axis === 1 ? v.y : v.z
}

/**
 * Find the best SAH split for a set of primitives
 */
const findBestSAHSplit = (
  primitives: readonly BuildPrimitive[],
  bounds: AABB
): SAHSplit | null => {
  const parentArea = $AABB.surfaceArea(bounds)
  const leafCost = primitives.length * SAH_INTERSECTION_COST

  let bestSplit: SAHSplit | null = null
  let bestCost = Infinity

  for (const axis of [0, 1, 2] as const) {
    const min = getAxisValue(bounds.min, axis)
    const max = getAxisValue(bounds.max, axis)

    if (max - min < EPSILON) continue

    // Initialize bins
    const bins: SAHBin[] = Array.from({ length: SAH_BIN_COUNT }, () => ({
      count: 0,
      bounds: null,
    }))

    const binScale = SAH_BIN_COUNT / (max - min)

    // Bin primitives by centroid
    for (const prim of primitives) {
      const centroidValue = getAxisValue(prim.centroid, axis)
      const binIdx = Math.min(
        SAH_BIN_COUNT - 1,
        Math.floor((centroidValue - min) * binScale)
      )
      const bin = bins[binIdx]
      if (bin) {
        bin.count++
        bin.bounds = $AABB.combine(bin.bounds, prim.aabb)
      }
    }

    // Precompute left-to-right sweep
    const leftCounts: number[] = []
    const leftAreas: number[] = []
    let leftCount = 0
    let leftBounds: AABB | null = null

    for (let i = 0; i < SAH_BIN_COUNT - 1; i++) {
      const bin = bins[i]
      if (bin) {
        leftCount += bin.count
        leftBounds = $AABB.combine(leftBounds, bin.bounds)
      }
      leftCounts.push(leftCount)
      leftAreas.push(leftBounds ? $AABB.surfaceArea(leftBounds) : 0)
    }

    // Right-to-left sweep and compute costs
    let rightCount = 0
    let rightBounds: AABB | null = null

    for (let i = SAH_BIN_COUNT - 1; i > 0; i--) {
      const bin = bins[i]
      if (bin) {
        rightCount += bin.count
        rightBounds = $AABB.combine(rightBounds, bin.bounds)
      }

      const lCount = leftCounts[i - 1] ?? 0
      const lArea = leftAreas[i - 1] ?? 0
      const rArea = rightBounds ? $AABB.surfaceArea(rightBounds) : 0

      if (lCount === 0 || rightCount === 0) continue

      const cost =
        SAH_TRAVERSAL_COST +
        (lArea / parentArea) * lCount * SAH_INTERSECTION_COST +
        (rArea / parentArea) * rightCount * SAH_INTERSECTION_COST

      if (cost < bestCost) {
        bestCost = cost
        bestSplit = {
          axis,
          position: min + (i / SAH_BIN_COUNT) * (max - min),
          cost,
        }
      }
    }
  }

  // Only split if cheaper than making a leaf
  if (bestSplit && bestCost < leafCost) {
    return bestSplit
  }

  return null
}

/**
 * Partition primitives by SAH split
 */
const partitionPrimitives = (
  primitives: readonly BuildPrimitive[],
  split: SAHSplit
): [BuildPrimitive[], BuildPrimitive[]] => {
  const left: BuildPrimitive[] = []
  const right: BuildPrimitive[] = []

  for (const prim of primitives) {
    const value = getAxisValue(prim.centroid, split.axis)
    if (value < split.position) {
      left.push(prim)
    } else {
      right.push(prim)
    }
  }

  return [left, right]
}

/**
 * Compute bounds for a set of primitives
 */
const computeBounds = (primitives: readonly BuildPrimitive[]): AABB | null => {
  let bounds: AABB | null = null
  for (const prim of primitives) {
    bounds = $AABB.combine(bounds, prim.aabb)
  }
  return bounds
}

/**
 * Build BVH recursively
 */
const buildRecursive = (
  primitives: BuildPrimitive[],
  nodes: BVHNode[]
): number => {
  if (primitives.length === 0) return -1

  const bounds = computeBounds(primitives)
  if (!bounds) return -1

  const nodeIndex = nodes.length

  // Leaf node condition: single primitive
  if (primitives.length === 1) {
    const prim = primitives[0]!
    nodes.push({
      aabb: bounds,
      leftChild: -1,
      rightChild: -1,
      objectIndex: prim.objectIndex,
      objectType: prim.objectType,
    })
    return nodeIndex
  }

  // Try to find best split
  const split = findBestSAHSplit(primitives, bounds)

  if (!split) {
    // Cannot split effectively, create leaf with first primitive
    // (This shouldn't happen often with good SAH)
    const prim = primitives[0]!
    nodes.push({
      aabb: bounds,
      leftChild: -1,
      rightChild: -1,
      objectIndex: prim.objectIndex,
      objectType: prim.objectType,
    })
    return nodeIndex
  }

  const [leftPrims, rightPrims] = partitionPrimitives(primitives, split)

  // Handle edge case where all primitives go to one side
  if (leftPrims.length === 0 || rightPrims.length === 0) {
    // Force split at midpoint
    const mid = Math.floor(primitives.length / 2)
    leftPrims.length = 0
    rightPrims.length = 0
    for (let i = 0; i < primitives.length; i++) {
      const prim = primitives[i]!
      if (i < mid) {
        leftPrims.push(prim)
      } else {
        rightPrims.push(prim)
      }
    }
  }

  // Reserve node slot (will be updated with child indices)
  nodes.push({
    aabb: bounds,
    leftChild: -1,
    rightChild: -1,
    objectIndex: -1,
    objectType: BVH_OBJECT_TYPE.BOX, // Placeholder for internal node
  })

  // Build children
  const leftChild = buildRecursive(leftPrims, nodes)
  const rightChild = buildRecursive(rightPrims, nodes)

  // Update node with child indices
  const existingNode = nodes[nodeIndex]!
  nodes[nodeIndex] = {
    aabb: existingNode.aabb,
    leftChild,
    rightChild,
    objectIndex: existingNode.objectIndex,
    objectType: existingNode.objectType,
  }

  return nodeIndex
}

/**
 * Create build primitive from box
 */
const primitiveFromBox = (box: SceneBox, index: number): BuildPrimitive => {
  const aabb = $AABB.fromBox(box.geometry)
  return {
    aabb,
    centroid: $AABB.centroid(aabb),
    objectIndex: index,
    objectType: BVH_OBJECT_TYPE.BOX,
  }
}

/**
 * Create build primitive from sphere
 */
const primitiveFromSphere = (
  sphere: SceneSphere,
  index: number
): BuildPrimitive => {
  const aabb = $AABB.fromSphere(sphere.geometry)
  return {
    aabb,
    centroid: $AABB.centroid(aabb),
    objectIndex: index,
    objectType: BVH_OBJECT_TYPE.SPHERE,
  }
}

/**
 * Create build primitive from capsule
 */
const primitiveFromCapsule = (
  capsule: SceneCapsule,
  index: number
): BuildPrimitive => {
  const aabb = $AABB.fromCapsule(capsule.geometry)
  return {
    aabb,
    centroid: $AABB.centroid(aabb),
    objectIndex: index,
    objectType: BVH_OBJECT_TYPE.CAPSULE,
  }
}

/**
 * Create build primitive from plane (only for finite planes)
 */
const primitiveFromPlane = (
  plane: ScenePlane,
  index: number
): BuildPrimitive | null => {
  const aabb = $AABB.fromPlane(plane.geometry)
  if (!aabb) return null // Infinite plane
  return {
    aabb,
    centroid: $AABB.centroid(aabb),
    objectIndex: index,
    objectType: BVH_OBJECT_TYPE.PLANE,
  }
}

/**
 * Input for BVH building
 */
export interface BVHBuildInput {
  readonly boxes: readonly SceneBox[]
  readonly spheres: readonly SceneSphere[]
  readonly capsules: readonly SceneCapsule[]
  readonly planes: readonly ScenePlane[]
}

/**
 * Result of BVH building, includes which planes are in BVH
 */
export interface BVHBuildResult {
  readonly bvh: BVH | undefined
  /** Indices of planes that are in the BVH (finite planes) */
  readonly bvhPlaneIndices: readonly number[]
  /** Indices of planes that are NOT in the BVH (infinite planes) */
  readonly infinitePlaneIndices: readonly number[]
}

/**
 * Build BVH from scene objects
 *
 * Includes all boxes, spheres, capsules, and finite planes.
 * Infinite planes (without width/height) are excluded.
 */
export const buildBVH = (input: BVHBuildInput): BVHBuildResult => {
  const primitives: BuildPrimitive[] = []
  const bvhPlaneIndices: number[] = []
  const infinitePlaneIndices: number[] = []

  // Add boxes
  for (let i = 0; i < input.boxes.length; i++) {
    const box = input.boxes[i]
    if (box) {
      primitives.push(primitiveFromBox(box, i))
    }
  }

  // Add spheres
  for (let i = 0; i < input.spheres.length; i++) {
    const sphere = input.spheres[i]
    if (sphere) {
      primitives.push(primitiveFromSphere(sphere, i))
    }
  }

  // Add capsules
  for (let i = 0; i < input.capsules.length; i++) {
    const capsule = input.capsules[i]
    if (capsule) {
      primitives.push(primitiveFromCapsule(capsule, i))
    }
  }

  // Add finite planes
  for (let i = 0; i < input.planes.length; i++) {
    const plane = input.planes[i]
    if (plane) {
      const prim = primitiveFromPlane(plane, i)
      if (prim) {
        primitives.push(prim)
        bvhPlaneIndices.push(i)
      } else {
        infinitePlaneIndices.push(i)
      }
    }
  }

  // Not enough primitives for BVH
  if (primitives.length < MIN_PRIMITIVES_FOR_BVH) {
    return {
      bvh: undefined,
      bvhPlaneIndices,
      infinitePlaneIndices,
    }
  }

  const nodes: BVHNode[] = []
  buildRecursive(primitives, nodes)

  return {
    bvh: nodes.length > 0 ? { nodes, rootIndex: 0 } : undefined,
    bvhPlaneIndices,
    infinitePlaneIndices,
  }
}

export const $BuildBVH = {
  build: buildBVH,
  MIN_PRIMITIVES: MIN_PRIMITIVES_FOR_BVH,
}
