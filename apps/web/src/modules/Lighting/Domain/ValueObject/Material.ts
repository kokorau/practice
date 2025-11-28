/**
 * Material properties for light interaction
 */
export interface Material {
  readonly albedo: readonly [number, number, number] // RGB reflectance (0-1)
  readonly roughness: number // 0 = mirror, 1 = diffuse
  readonly metallic: number // 0 = dielectric, 1 = metal
  readonly emissive: readonly [number, number, number] // RGB emission
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const clampColor = (c: readonly [number, number, number]): readonly [number, number, number] => [
  clamp01(c[0]),
  clamp01(c[1]),
  clamp01(c[2]),
]

export const $Material = {
  create: (
    albedo: readonly [number, number, number],
    roughness: number,
    metallic: number,
    emissive: readonly [number, number, number] = [0, 0, 0]
  ): Material => ({
    albedo: clampColor(albedo),
    roughness: clamp01(roughness),
    metallic: clamp01(metallic),
    emissive: clampColor(emissive),
  }),

  /** Create a simple diffuse material */
  diffuse: (albedo: readonly [number, number, number]): Material => ({
    albedo: clampColor(albedo),
    roughness: 1,
    metallic: 0,
    emissive: [0, 0, 0],
  }),

  /** Create a metallic material */
  metal: (albedo: readonly [number, number, number], roughness: number = 0.1): Material => ({
    albedo: clampColor(albedo),
    roughness: clamp01(roughness),
    metallic: 1,
    emissive: [0, 0, 0],
  }),
}
