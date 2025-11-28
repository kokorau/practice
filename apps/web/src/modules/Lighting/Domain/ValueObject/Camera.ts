import type { Point3, Vector3 } from '../../../Vector/Domain/ValueObject'

/**
 * Camera for viewing the scene
 */
export interface Camera {
  readonly position: Point3
  readonly lookAt: Point3
  readonly up: Vector3
  readonly fov: number // Field of view in degrees
  readonly aspectRatio: number
  readonly nearPlane: number
  readonly farPlane: number
}
