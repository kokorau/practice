/**
 * Material properties for light interaction
 * TODO: Consider simplifying based on actual simulation needs
 */
export interface Material {
  readonly albedo: readonly [number, number, number] // RGB reflectance (0-1)
  readonly roughness: number // 0 = mirror, 1 = diffuse
  readonly metallic: number // 0 = dielectric, 1 = metal
  readonly emissive: readonly [number, number, number] // RGB emission
}
