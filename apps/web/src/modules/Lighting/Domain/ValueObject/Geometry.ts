import type { Vector3 } from '../../../Vector/Domain/ValueObject'

/**
 * Infinite plane defined by a point and normal
 */
export interface PlaneGeometry {
  readonly type: 'plane'
  readonly point: Vector3 // A point on the plane
  readonly normal: Vector3 // Normal vector (normalized)
}

/**
 * Axis-aligned box
 */
export interface BoxGeometry {
  readonly type: 'box'
  readonly center: Vector3
  readonly size: Vector3 // width, height, depth
}

/**
 * Union type for all geometry types
 */
export type Geometry = PlaneGeometry | BoxGeometry
