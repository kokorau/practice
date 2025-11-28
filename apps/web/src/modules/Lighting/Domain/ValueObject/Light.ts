import type { Vector3 } from '../../../Vector/Domain/ValueObject'

/**
 * Base light properties
 */
export interface LightBase {
  readonly color: readonly [number, number, number] // RGB (0-1)
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
