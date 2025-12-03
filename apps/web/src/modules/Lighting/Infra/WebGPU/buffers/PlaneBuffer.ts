/**
 * Plane Buffer Builder for WebGPU
 * Builds storage buffer for plane geometry data
 */

import type { ScenePlane } from '../types'

/** Floats per plane (64 bytes / 4 = 16 floats) */
export const PLANE_STRIDE = 16

/**
 * Build plane buffer
 * Each plane: 64 bytes (point + normal + color + size with padding)
 */
export const buildPlaneBuffer = (
  planes: readonly ScenePlane[],
  maxPlanes: number
): Float32Array<ArrayBuffer> => {
  const data = new Float32Array(maxPlanes * PLANE_STRIDE)
  const count = Math.min(planes.length, maxPlanes)

  for (let i = 0; i < count; i++) {
    const plane = planes[i]!
    const base = i * PLANE_STRIDE

    // point (vec3f + padding)
    data[base + 0] = plane.geometry.point.x
    data[base + 1] = plane.geometry.point.y
    data[base + 2] = plane.geometry.point.z
    data[base + 3] = 0 // padding

    // normal (vec3f + padding)
    data[base + 4] = plane.geometry.normal.x
    data[base + 5] = plane.geometry.normal.y
    data[base + 6] = plane.geometry.normal.z
    data[base + 7] = 0 // padding

    // color (vec3f + padding)
    data[base + 8] = plane.color.r
    data[base + 9] = plane.color.g
    data[base + 10] = plane.color.b
    data[base + 11] = 0 // padding

    // size (vec2f + padding)
    data[base + 12] = plane.geometry.width ?? -1
    data[base + 13] = plane.geometry.height ?? -1
    data[base + 14] = 0 // padding
    data[base + 15] = 0 // padding
  }

  return data
}
