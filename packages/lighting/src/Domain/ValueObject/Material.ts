/**
 * Material properties for light interaction
 */
export interface Material {
  readonly albedo: readonly [number, number, number] // RGB reflectance (0-1)
  readonly roughness: number // 0 = mirror, 1 = diffuse
  readonly metallic: number // 0 = dielectric, 1 = metal
  readonly emissive: readonly [number, number, number] // RGB emission
  readonly alpha: number // 0 = fully transparent, 1 = fully opaque
  readonly ior: number // Index of refraction (1.0 = air, 1.5 = glass, 2.4 = diamond)
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const clampColor = (c: readonly [number, number, number]): readonly [number, number, number] => [
  clamp01(c[0]),
  clamp01(c[1]),
  clamp01(c[2]),
]

export const $Material = {
  create: (params: {
    albedo: readonly [number, number, number]
    roughness?: number
    metallic?: number
    emissive?: readonly [number, number, number]
    alpha?: number
    ior?: number
  }): Material => ({
    albedo: clampColor(params.albedo),
    roughness: clamp01(params.roughness ?? 1),
    metallic: clamp01(params.metallic ?? 0),
    emissive: clampColor(params.emissive ?? [0, 0, 0]),
    alpha: clamp01(params.alpha ?? 1),
    ior: Math.max(1, params.ior ?? 1),
  }),

  /** Create a simple diffuse material */
  diffuse: (albedo: readonly [number, number, number]): Material => ({
    albedo: clampColor(albedo),
    roughness: 1,
    metallic: 0,
    emissive: [0, 0, 0],
    alpha: 1,
    ior: 1,
  }),

  /** Create a metallic material */
  metal: (albedo: readonly [number, number, number], roughness: number = 0.1): Material => ({
    albedo: clampColor(albedo),
    roughness: clamp01(roughness),
    metallic: 1,
    emissive: [0, 0, 0],
    alpha: 1,
    ior: 1,
  }),

  /** Create a transparent/glass material */
  glass: (
    albedo: readonly [number, number, number] = [1, 1, 1],
    ior: number = 1.5,
    alpha: number = 0.1
  ): Material => ({
    albedo: clampColor(albedo),
    roughness: 0,
    metallic: 0,
    emissive: [0, 0, 0],
    alpha: clamp01(alpha),
    ior: Math.max(1, ior),
  }),
}
