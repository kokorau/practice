/**
 * 2D Vector
 */
export interface Vector2 {
  readonly x: number
  readonly y: number
}

export const $Vector2 = {
  /**
   * Create a Vector2
   */
  create: (x: number, y: number): Vector2 => ({ x, y }),

  /**
   * Zero vector (0, 0)
   */
  zero: (): Vector2 => ({ x: 0, y: 0 }),

  /**
   * Center point (0.5, 0.5) - useful for UV coordinates
   */
  center: (): Vector2 => ({ x: 0.5, y: 0.5 }),

  /**
   * Add two vectors
   */
  add: (a: Vector2, b: Vector2): Vector2 => ({
    x: a.x + b.x,
    y: a.y + b.y,
  }),

  /**
   * Subtract vector b from vector a
   */
  sub: (a: Vector2, b: Vector2): Vector2 => ({
    x: a.x - b.x,
    y: a.y - b.y,
  }),

  /**
   * Scale vector by scalar
   */
  scale: (v: Vector2, s: number): Vector2 => ({
    x: v.x * s,
    y: v.y * s,
  }),

  /**
   * Dot product of two vectors
   */
  dot: (a: Vector2, b: Vector2): number => a.x * b.x + a.y * b.y,

  /**
   * Length (magnitude) of vector
   */
  length: (v: Vector2): number => Math.sqrt(v.x * v.x + v.y * v.y),

  /**
   * Normalize vector to unit length
   */
  normalize: (v: Vector2): Vector2 => {
    const len = $Vector2.length(v)
    if (len === 0) return { x: 0, y: 0 }
    return {
      x: v.x / len,
      y: v.y / len,
    }
  },
}
