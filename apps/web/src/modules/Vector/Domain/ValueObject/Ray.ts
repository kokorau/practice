import type { Vector3 } from './Vector3'

/**
 * Ray with origin and direction
 */
export interface Ray {
  readonly origin: Vector3
  readonly direction: Vector3 // Should be normalized
}

export const $Ray = {
  /**
   * Create a Ray
   */
  create: (origin: Vector3, direction: Vector3): Ray => ({
    origin,
    direction,
  }),

  /**
   * Get point along ray at distance t
   */
  at: (ray: Ray, t: number): Vector3 => ({
    x: ray.origin.x + ray.direction.x * t,
    y: ray.origin.y + ray.direction.y * t,
    z: ray.origin.z + ray.direction.z * t,
  }),
}
