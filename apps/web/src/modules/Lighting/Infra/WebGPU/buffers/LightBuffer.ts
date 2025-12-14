/**
 * Light Buffer Builder for WebGPU
 * Builds storage buffer for directional light data
 */

import { $Vector3, type Vector3 } from '@practice/vector'
import type { Color } from '../../../Domain/ValueObject'

export interface SceneLight {
  direction: Vector3
  color: Color
  intensity: number
}

/** Floats per light (32 bytes / 4 = 8 floats) */
export const LIGHT_STRIDE = 8

/**
 * Build light buffer
 * Each light: 32 bytes (direction + padding + color + intensity)
 * Note: direction is negated (shader expects direction TO the light)
 */
export const buildLightBuffer = (
  lights: readonly SceneLight[],
  maxLights: number
): Float32Array<ArrayBuffer> => {
  const data = new Float32Array(maxLights * LIGHT_STRIDE)
  const count = Math.min(lights.length, maxLights)

  for (let i = 0; i < count; i++) {
    const light = lights[i]!
    const base = i * LIGHT_STRIDE

    // Normalize and negate direction (shader expects direction TO the light)
    const dir = $Vector3.normalize(light.direction)
    data[base + 0] = -dir.x
    data[base + 1] = -dir.y
    data[base + 2] = -dir.z
    data[base + 3] = 0 // padding

    // color (vec3f) + intensity (f32)
    data[base + 4] = light.color.r
    data[base + 5] = light.color.g
    data[base + 6] = light.color.b
    data[base + 7] = light.intensity
  }

  return data
}
