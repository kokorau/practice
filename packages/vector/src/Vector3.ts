/**
 * 3D Vector
 */
export interface Vector3 {
  readonly x: number
  readonly y: number
  readonly z: number
}

export const $Vector3 = {
  /**
   * Create a Vector3
   */
  create: (x: number, y: number, z: number): Vector3 => ({ x, y, z }),

  /**
   * Add two vectors
   */
  add: (a: Vector3, b: Vector3): Vector3 => ({
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z,
  }),

  /**
   * Subtract vector b from vector a
   */
  sub: (a: Vector3, b: Vector3): Vector3 => ({
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z,
  }),

  /**
   * Scale vector by scalar
   */
  scale: (v: Vector3, s: number): Vector3 => ({
    x: v.x * s,
    y: v.y * s,
    z: v.z * s,
  }),

  /**
   * Dot product of two vectors
   */
  dot: (a: Vector3, b: Vector3): number => a.x * b.x + a.y * b.y + a.z * b.z,

  /**
   * Cross product of two vectors
   */
  cross: (a: Vector3, b: Vector3): Vector3 => ({
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  }),

  /**
   * Length (magnitude) of vector
   */
  length: (v: Vector3): number => Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z),

  /**
   * Normalize vector to unit length
   */
  normalize: (v: Vector3): Vector3 => {
    const len = $Vector3.length(v)
    if (len === 0) return { x: 0, y: 0, z: 0 }
    return {
      x: v.x / len,
      y: v.y / len,
      z: v.z / len,
    }
  },
}
