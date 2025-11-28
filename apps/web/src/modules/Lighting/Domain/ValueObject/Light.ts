import { $Vector3, type Vector3 } from '../../../Vector/Domain/ValueObject'
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
}
