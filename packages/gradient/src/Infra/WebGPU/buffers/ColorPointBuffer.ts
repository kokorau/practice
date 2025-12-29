import type { ColorPoint } from '../../../Domain'

/**
 * Stride per color point in bytes (must match WGSL struct)
 * ColorPoint: 32 bytes
 */
export const COLOR_POINT_STRIDE = 32

/**
 * Build storage buffer data from color points array
 */
export function buildColorPointBuffer(points: readonly ColorPoint[]): ArrayBuffer {
  const buffer = new ArrayBuffer(points.length * COLOR_POINT_STRIDE)
  const f32 = new Float32Array(buffer)

  for (let i = 0; i < points.length; i++) {
    const point = points[i]!
    const baseIndex = (i * COLOR_POINT_STRIDE) / 4

    // pos: vec2f (0-7)
    f32[baseIndex + 0] = point.pos.x
    f32[baseIndex + 1] = point.pos.y

    // radius: f32 (8-11)
    f32[baseIndex + 2] = point.radius

    // strength: f32 (12-15)
    f32[baseIndex + 3] = point.strength

    // color: vec4f (16-31) - P3 RGBA
    const [r, g, b, a] = point.color.rgba
    f32[baseIndex + 4] = r
    f32[baseIndex + 5] = g
    f32[baseIndex + 6] = b
    f32[baseIndex + 7] = a
  }

  return buffer
}
