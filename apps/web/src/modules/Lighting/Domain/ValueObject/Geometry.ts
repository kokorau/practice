import { $Vector3, type Vector3 } from '../../../Vector/Domain/ValueObject'

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

export const $Geometry = {
  createPlane: (
    point: Vector3,
    normal: Vector3,
    width?: number,
    height?: number
  ): PlaneGeometry => ({
    type: 'plane',
    point,
    normal: $Vector3.normalize(normal),
    ...(width !== undefined && { width: Math.abs(width) }),
    ...(height !== undefined && { height: Math.abs(height) }),
  }),

  createBox: (
    center: Vector3,
    size: Vector3,
    rotation?: Vector3
  ): BoxGeometry => ({
    type: 'box',
    center,
    size: { x: Math.abs(size.x), y: Math.abs(size.y), z: Math.abs(size.z) },
    ...(rotation !== undefined && { rotation }),
  }),
}
