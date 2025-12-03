/**
 * Capsule Buffer Builder for WebGPU
 * Builds storage buffer for capsule geometry data
 */

import type { SceneCapsule } from '../types'

/** Floats per capsule (64 bytes / 4 = 16 floats) */
export const CAPSULE_STRIDE = 16

/**
 * Build capsule buffer
 * Each capsule: 64 bytes (pointA + pointB + color/radius + alpha/ior)
 */
export const buildCapsuleBuffer = (
  capsules: readonly SceneCapsule[],
  maxCapsules: number
): Float32Array<ArrayBuffer> => {
  const data = new Float32Array(maxCapsules * CAPSULE_STRIDE)
  const count = Math.min(capsules.length, maxCapsules)

  for (let i = 0; i < count; i++) {
    const capsule = capsules[i]!
    const base = i * CAPSULE_STRIDE

    // pointA (vec3f + padding)
    data[base + 0] = capsule.geometry.pointA.x
    data[base + 1] = capsule.geometry.pointA.y
    data[base + 2] = capsule.geometry.pointA.z
    data[base + 3] = 0 // padding

    // pointB (vec3f + padding)
    data[base + 4] = capsule.geometry.pointB.x
    data[base + 5] = capsule.geometry.pointB.y
    data[base + 6] = capsule.geometry.pointB.z
    data[base + 7] = 0 // padding

    // color (vec3f) + radius (f32)
    data[base + 8] = capsule.color.r
    data[base + 9] = capsule.color.g
    data[base + 10] = capsule.color.b
    data[base + 11] = capsule.geometry.radius

    // alpha + ior + padding
    data[base + 12] = capsule.alpha
    data[base + 13] = capsule.ior
    data[base + 14] = 0 // padding
    data[base + 15] = 0 // padding
  }

  return data
}
