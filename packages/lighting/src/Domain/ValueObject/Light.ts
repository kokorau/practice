import { $Vector3, type Vector3 } from '@practice/vector'
import type { Color } from './Color'

/**
 * Base light properties
 */
export interface LightBase {
  readonly color: Color
  readonly intensity: number
}

/**
 * Ambient light - uniform light from all directions
 */
export interface AmbientLight extends LightBase {
  readonly type: 'ambient'
}

/**
 * Directional light - parallel rays (like sun)
 */
export interface DirectionalLight extends LightBase {
  readonly type: 'directional'
  readonly direction: Vector3
}

/**
 * Union type for all light types
 */
export type Light = AmbientLight | DirectionalLight

export const $Light = {
  createAmbient: (color: Color, intensity: number): AmbientLight => ({
    type: 'ambient',
    color,
    intensity: Math.max(0, intensity),
  }),

  createDirectional: (
    direction: Vector3,
    color: Color,
    intensity: number
  ): DirectionalLight => ({
    type: 'directional',
    direction: $Vector3.normalize(direction),
    color,
    intensity: Math.max(0, intensity),
  }),

  /**
   * Calculate the intensity contribution of a directional light toward a specific direction
   * Returns intensity * max(0, dot(direction, -lightDir))
   */
  intensityToward: (light: DirectionalLight, direction: Vector3): number => {
    const toLightDir = $Vector3.scale(light.direction, -1)
    const factor = Math.max(0, $Vector3.dot(direction, toLightDir))
    return light.intensity * factor
  },
}
