import type { Vector3 } from '../../../Vector/Domain/ValueObject'

/**
 * Finite rectangular plane defined by center, normal, and size
 */
export interface PlaneGeometry {
  readonly type: 'plane'
  readonly point: Vector3 // Center point of the plane
  readonly normal: Vector3 // Normal vector (normalized)
  readonly width?: number // Width (along right vector), undefined = infinite
  readonly height?: number // Height (along up vector), undefined = infinite
}

/**
 * Oriented Bounding Box (OBB)
 * Rotation is specified as Euler angles in radians (X, Y, Z order)
 */
export interface BoxGeometry {
  readonly type: 'box'
  readonly center: Vector3
  readonly size: Vector3 // width, height, depth
  readonly rotation?: Vector3 // Euler angles in radians (x, y, z)
}

/**
 * Union type for all geometry types
 */
export type Geometry = PlaneGeometry | BoxGeometry
