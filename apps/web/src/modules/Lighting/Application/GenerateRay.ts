import type { Ray, Vector3 } from '../../Vector/Domain/ValueObject'
import { $Vector3 } from '../../Vector/Domain/ValueObject'
import type { OrthographicCamera } from '../Domain/ValueObject'

/**
 * Generate ray from orthographic camera for given pixel coordinates
 * @param camera - Orthographic camera
 * @param u - Horizontal coordinate (0 to 1, left to right)
 * @param v - Vertical coordinate (0 to 1, bottom to top)
 */
export const generateRay = (
  camera: OrthographicCamera,
  u: number,
  v: number
): Ray => {
  // Calculate camera basis vectors
  const forward = $Vector3.normalize($Vector3.sub(camera.lookAt, camera.position))
  const right = $Vector3.normalize($Vector3.cross(camera.up, forward))
  const up = $Vector3.cross(forward, right)

  // Convert u,v from [0,1] to [-0.5, 0.5]
  const offsetU = u - 0.5
  const offsetV = v - 0.5

  // Calculate ray origin on the image plane
  const origin: Vector3 = {
    x: camera.position.x + right.x * offsetU * camera.width + up.x * offsetV * camera.height,
    y: camera.position.y + right.y * offsetU * camera.width + up.y * offsetV * camera.height,
    z: camera.position.z + right.z * offsetU * camera.width + up.z * offsetV * camera.height,
  }

  // For orthographic camera, all rays have the same direction
  return {
    origin,
    direction: forward,
  }
}
