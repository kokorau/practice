/**
 * 3D座標を表す値オブジェクト
 */
export type Point = {
  readonly x: number
  readonly y: number
  readonly z: number
}

export const Point = {
  create(x: number, y: number, z: number = 0): Point {
    return { x, y, z }
  },

  /** 3D距離 */
  distance(a: Point, b: Point): number {
    const dx = b.x - a.x
    const dy = b.y - a.y
    const dz = b.z - a.z
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
  },

  /** 2D距離（XY平面上） */
  distance2D(a: Point, b: Point): number {
    const dx = b.x - a.x
    const dy = b.y - a.y
    return Math.sqrt(dx * dx + dy * dy)
  },

  /** aからbへのベクトル */
  vector(from: Point, to: Point): Point {
    return {
      x: to.x - from.x,
      y: to.y - from.y,
      z: to.z - from.z,
    }
  },

  /** aからbへの角度（XY平面上、ラジアン） */
  angle(from: Point, to: Point): number {
    const dx = to.x - from.x
    const dy = to.y - from.y
    return Math.atan2(dy, dx)
  },

  /** ベクトルを正規化（3D） */
  normalize(p: Point): Point {
    const len = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z)
    if (len === 0) return { x: 0, y: 0, z: 0 }
    return { x: p.x / len, y: p.y / len, z: p.z / len }
  },

  /** XY平面上で正規化 */
  normalize2D(p: Point): Point {
    const len = Math.sqrt(p.x * p.x + p.y * p.y)
    if (len === 0) return { x: 0, y: 0, z: p.z }
    return { x: p.x / len, y: p.y / len, z: p.z }
  },
}
