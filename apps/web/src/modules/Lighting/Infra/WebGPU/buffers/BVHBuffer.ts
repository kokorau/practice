/**
 * BVH Buffer Builder
 * Builds GPU buffers for BVH (Bounding Volume Hierarchy)
 */

import type { BVH } from '../../../Domain/ValueObject/BVH'

/**
 * BVH uniform data layout (16 bytes):
 * - nodeCount: u32
 * - useBVH: u32
 * - pad0: u32
 * - pad1: u32
 */
export const BVH_UNIFORM_SIZE = 16

/**
 * BVH node stride (16 floats = 64 bytes):
 * - aabbMin: vec3f (12 bytes)
 * - leftChild: i32 (4 bytes)
 * - aabbMax: vec3f (12 bytes)
 * - rightChild: i32 (4 bytes)
 * - objectIndex: i32 (4 bytes)
 * - objectType: u32 (4 bytes)
 * - padding: 24 bytes
 */
export const BVH_NODE_STRIDE = 16 // 16 floats = 64 bytes

/**
 * Build BVH uniform buffer data
 */
export const buildBVHUniform = (bvh: BVH | undefined): Float32Array<ArrayBuffer> => {
  const data = new Float32Array(BVH_UNIFORM_SIZE / 4)
  const intView = new Uint32Array(data.buffer)

  if (!bvh || bvh.nodes.length === 0) {
    intView[0] = 0 // nodeCount
    intView[1] = 0 // useBVH = false
    return data
  }

  intView[0] = bvh.nodes.length
  intView[1] = 1 // useBVH = true
  // pad0, pad1 are already 0

  return data
}

/**
 * Build BVH node buffer data
 * Layout per node (64 bytes):
 *   0-2: aabbMin (vec3f)
 *   3: leftChild (i32)
 *   4-6: aabbMax (vec3f)
 *   7: rightChild (i32)
 *   8: objectIndex (i32)
 *   9: objectType (u32)
 *   10-15: padding
 */
export const buildBVHNodeBuffer = (
  bvh: BVH | undefined,
  capacity: number
): Float32Array<ArrayBuffer> => {
  const data = new Float32Array(capacity * BVH_NODE_STRIDE)

  if (!bvh) {
    return data
  }

  const intView = new Int32Array(data.buffer)
  const uintView = new Uint32Array(data.buffer)

  for (let i = 0; i < bvh.nodes.length && i < capacity; i++) {
    const node = bvh.nodes[i]
    if (!node) continue

    const offset = i * BVH_NODE_STRIDE

    // aabbMin (vec3f)
    data[offset + 0] = node.aabb.min.x
    data[offset + 1] = node.aabb.min.y
    data[offset + 2] = node.aabb.min.z

    // leftChild (i32)
    intView[offset + 3] = node.leftChild

    // aabbMax (vec3f)
    data[offset + 4] = node.aabb.max.x
    data[offset + 5] = node.aabb.max.y
    data[offset + 6] = node.aabb.max.z

    // rightChild (i32)
    intView[offset + 7] = node.rightChild

    // objectIndex (i32)
    intView[offset + 8] = node.objectIndex

    // objectType (u32)
    uintView[offset + 9] = node.objectType

    // padding (offset 10-15) - already 0
  }

  return data
}
