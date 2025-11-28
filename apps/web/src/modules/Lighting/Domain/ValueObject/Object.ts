import type { Geometry } from './Geometry'
import type { Material } from './Material'

/**
 * Scene object combining geometry and material
 */
export interface SceneObject {
  readonly geometry: Geometry
  readonly material: Material
}
