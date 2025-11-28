import type { Point3, Vector3 } from '../../../Vector/Domain/ValueObject'

/**
 * Base camera properties
 */
export interface CameraBase {
  readonly position: Point3
  readonly lookAt: Point3
  readonly up: Vector3
}

/**
 * Perspective camera (standard 3D camera with FOV)
 */
export interface PerspectiveCamera extends CameraBase {
  readonly type: 'perspective'
  readonly fov: number // Field of view in degrees
  readonly aspectRatio: number
}

/**
 * Orthographic camera (parallel projection, no perspective)
 */
export interface OrthographicCamera extends CameraBase {
  readonly type: 'orthographic'
  readonly width: number // View width
  readonly height: number // View height
}

/**
 * Union type for all camera types
 */
export type Camera = PerspectiveCamera | OrthographicCamera
