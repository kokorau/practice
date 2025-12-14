/**
 * Scene Uniform Buffer Builder for WebGPU
 * Builds the 144-byte scene uniform buffer
 */

import type { Vector3 } from '@practice/vector'
import type { Color, AmbientLight } from '../../../Domain/ValueObject'

export interface SceneUniformParams {
  camera: {
    position: Vector3
    width: number
    height: number
  }
  forward: Vector3
  right: Vector3
  up: Vector3
  backgroundColor: Color
  ambientLight: AmbientLight
  shadowBlur: number
  sampleCount: number
  counts: {
    planes: number
    boxes: number
    lights: number
    spheres: number
  }
}

/**
 * Build scene uniform buffer (144 bytes)
 * Layout matches WGSL SceneUniforms struct
 */
export const buildSceneUniform = (params: SceneUniformParams): Float32Array<ArrayBuffer> => {
  const {
    camera,
    forward,
    right,
    up,
    backgroundColor,
    ambientLight,
    shadowBlur,
    sampleCount,
    counts,
  } = params

  const data = new Float32Array(36) // 144 bytes / 4 = 36 floats
  const view = new DataView(data.buffer)
  let offset = 0

  // Camera (80 bytes = 20 floats)
  data[offset++] = camera.position.x
  data[offset++] = camera.position.y
  data[offset++] = camera.position.z
  data[offset++] = 0 // padding
  data[offset++] = forward.x
  data[offset++] = forward.y
  data[offset++] = forward.z
  data[offset++] = 0 // padding
  data[offset++] = right.x
  data[offset++] = right.y
  data[offset++] = right.z
  data[offset++] = 0 // padding
  data[offset++] = up.x
  data[offset++] = up.y
  data[offset++] = up.z
  data[offset++] = 0 // padding
  data[offset++] = camera.width
  data[offset++] = camera.height
  data[offset++] = 0 // padding
  data[offset++] = 0 // padding

  // backgroundColor (16 bytes = 4 floats)
  data[offset++] = backgroundColor.r
  data[offset++] = backgroundColor.g
  data[offset++] = backgroundColor.b
  data[offset++] = 0 // padding

  // ambientColor + intensity (16 bytes = 4 floats)
  data[offset++] = ambientLight.color.r
  data[offset++] = ambientLight.color.g
  data[offset++] = ambientLight.color.b
  data[offset++] = ambientLight.intensity

  // shadowBlur + counts (16 bytes = 4 u32/f32)
  view.setFloat32(offset * 4, shadowBlur, true)
  offset++
  view.setUint32(offset * 4, counts.planes, true)
  offset++
  view.setUint32(offset * 4, counts.boxes, true)
  offset++
  view.setUint32(offset * 4, counts.lights, true)
  offset++

  // sphereCount + sampleCount + padding (16 bytes = 4 u32)
  view.setUint32(offset * 4, counts.spheres, true)
  offset++
  view.setUint32(offset * 4, sampleCount, true)
  offset++
  view.setUint32(offset * 4, 0, true) // padding

  return data
}
