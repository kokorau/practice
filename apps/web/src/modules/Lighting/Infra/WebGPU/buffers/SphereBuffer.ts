/**
 * Sphere Buffer Builder for WebGPU
 * Builds storage buffer for sphere geometry data
 */

import type { SceneSphere } from '../types'

/** Floats per sphere (32 bytes / 4 = 8 floats) */
export const SPHERE_STRIDE = 8

/**
 * Build sphere buffer
 * Each sphere: 32 bytes (center + padding + color + radius)
 */
export const buildSphereBuffer = (
  spheres: readonly SceneSphere[],
  maxSpheres: number
): Float32Array<ArrayBuffer> => {
  const data = new Float32Array(maxSpheres * SPHERE_STRIDE)
  const count = Math.min(spheres.length, maxSpheres)

  for (let i = 0; i < count; i++) {
    const sphere = spheres[i]!
    const base = i * SPHERE_STRIDE

    // center (vec3f + padding)
    data[base + 0] = sphere.geometry.center.x
    data[base + 1] = sphere.geometry.center.y
    data[base + 2] = sphere.geometry.center.z
    data[base + 3] = 0 // padding

    // color (vec3f) + radius (f32)
    data[base + 4] = sphere.color.r
    data[base + 5] = sphere.color.g
    data[base + 6] = sphere.color.b
    data[base + 7] = sphere.geometry.radius
  }

  return data
}
