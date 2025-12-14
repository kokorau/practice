import { $Vector3, type Vector3 } from '@practice/vector'

/**
 * Base camera properties
 */
export interface CameraBase {
  readonly position: Vector3
  readonly lookAt: Vector3
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

export const $Camera = {
  createPerspective: (
    position: Vector3,
    lookAt: Vector3,
    up: Vector3,
    fov: number,
    aspectRatio: number
  ): PerspectiveCamera => ({
    type: 'perspective',
    position,
    lookAt,
    up: $Vector3.normalize(up),
    fov: Math.max(1, Math.min(179, fov)),
    aspectRatio: Math.abs(aspectRatio),
  }),

  createOrthographic: (
    position: Vector3,
    lookAt: Vector3,
    up: Vector3,
    width: number,
    height: number
  ): OrthographicCamera => ({
    type: 'orthographic',
    position,
    lookAt,
    up: $Vector3.normalize(up),
    width: Math.abs(width),
    height: Math.abs(height),
  }),
}
