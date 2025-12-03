/**
 * Box Buffer Builder for WebGPU
 * Builds storage buffer for box geometry data
 */

import { eulerToMat3x3f, eulerToMat3x3fInverse } from '../../utils/matrix'
import type { SceneBox } from '../types'

/** Floats per box (144 bytes / 4 = 36 floats) */
export const BOX_STRIDE = 36

const IDENTITY_EULER = { x: 0, y: 0, z: 0 }

/**
 * Build box buffer
 * Each box: 144 bytes (center + size + color/radius + rotation + rotationInv)
 */
export const buildBoxBuffer = (
  boxes: readonly SceneBox[],
  maxBoxes: number
): Float32Array<ArrayBuffer> => {
  const data = new Float32Array(maxBoxes * BOX_STRIDE)
  const count = Math.min(boxes.length, maxBoxes)

  for (let i = 0; i < maxBoxes; i++) {
    const base = i * BOX_STRIDE

    if (i < count) {
      const box = boxes[i]!

      // center (vec3f + padding)
      data[base + 0] = box.geometry.center.x
      data[base + 1] = box.geometry.center.y
      data[base + 2] = box.geometry.center.z
      data[base + 3] = 0 // padding

      // size (vec3f + padding)
      data[base + 4] = box.geometry.size.x
      data[base + 5] = box.geometry.size.y
      data[base + 6] = box.geometry.size.z
      data[base + 7] = 0 // padding

      // color (vec3f) + radius (f32)
      data[base + 8] = box.color.r
      data[base + 9] = box.color.g
      data[base + 10] = box.color.b
      data[base + 11] = box.geometry.radius ?? 0

      // rotation matrix (mat3x3f = 12 floats with padding)
      const euler = box.geometry.rotation ?? IDENTITY_EULER
      const rotMatrix = eulerToMat3x3f(euler)
      data.set(rotMatrix, base + 12)

      // inverse rotation matrix (mat3x3f = 12 floats with padding)
      const rotMatrixInv = eulerToMat3x3fInverse(euler)
      data.set(rotMatrixInv, base + 24)
    } else {
      // Identity matrices for unused boxes
      const identity = eulerToMat3x3f(IDENTITY_EULER)
      data.set(identity, base + 12)
      data.set(identity, base + 24)
    }
  }

  return data
}
