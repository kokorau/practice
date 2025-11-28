import type { Ray, Vector3 } from '../../../Vector/Domain/ValueObject'
import { $Vector3 } from '../../../Vector/Domain/ValueObject'
import type { PlaneGeometry } from './Geometry'

/**
 * Intersection result
 */
export interface Intersection {
  readonly t: number // Distance along ray
  readonly point: Vector3
  readonly normal: Vector3
}

/**
 * Build orthonormal basis from normal vector
 */
const buildBasis = (normal: Vector3): { right: Vector3; up: Vector3 } => {
  // Choose a vector not parallel to normal
  const tmp = Math.abs(normal.y) < 0.9
    ? { x: 0, y: 1, z: 0 }
    : { x: 1, y: 0, z: 0 }

  const right = $Vector3.normalize($Vector3.cross(tmp, normal))
  const up = $Vector3.cross(normal, right)

  return { right, up }
}

/**
 * Intersect ray with plane
 * Returns intersection if hit, null if no hit or parallel
 */
export const intersectPlane = (ray: Ray, plane: PlaneGeometry): Intersection | null => {
  // Ray: P = origin + t * direction
  // Plane: dot(P - point, normal) = 0
  // Solve: dot(origin + t * direction - point, normal) = 0
  //        dot(origin - point, normal) + t * dot(direction, normal) = 0
  //        t = dot(point - origin, normal) / dot(direction, normal)

  const denom = $Vector3.dot(ray.direction, plane.normal)

  // Ray is parallel to plane
  if (Math.abs(denom) < 1e-8) {
    return null
  }

  const diff = $Vector3.sub(plane.point, ray.origin)
  const t = $Vector3.dot(diff, plane.normal) / denom

  // Intersection is behind ray origin
  if (t < 0) {
    return null
  }

  const point = {
    x: ray.origin.x + t * ray.direction.x,
    y: ray.origin.y + t * ray.direction.y,
    z: ray.origin.z + t * ray.direction.z,
  }

  // Check bounds if plane has finite size
  if (plane.width !== undefined || plane.height !== undefined) {
    const { right, up } = buildBasis(plane.normal)
    const localOffset = $Vector3.sub(point, plane.point)

    const u = $Vector3.dot(localOffset, right)
    const v = $Vector3.dot(localOffset, up)

    const halfWidth = (plane.width ?? Infinity) / 2
    const halfHeight = (plane.height ?? Infinity) / 2

    if (Math.abs(u) > halfWidth || Math.abs(v) > halfHeight) {
      return null
    }
  }

  // Normal faces toward ray origin
  const normal = denom < 0 ? plane.normal : $Vector3.scale(plane.normal, -1)

  return { t, point, normal }
}
