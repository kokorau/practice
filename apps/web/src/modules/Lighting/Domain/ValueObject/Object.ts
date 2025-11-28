import type { Point3, Vector3 } from '../../../Vector/Domain/ValueObject'

/**
 * Material properties for light interaction
 */
export interface Material {
  readonly albedo: readonly [number, number, number] // RGB reflectance (0-1)
  readonly roughness: number // 0 = mirror, 1 = diffuse
  readonly metallic: number // 0 = dielectric, 1 = metal
  readonly emissive: readonly [number, number, number] // RGB emission
}

/**
 * Base interface for scene objects
 */
export interface SceneObject {
  readonly position: Point3
  readonly rotation: Vector3 // Euler angles
  readonly scale: Vector3
  readonly material: Material
}
