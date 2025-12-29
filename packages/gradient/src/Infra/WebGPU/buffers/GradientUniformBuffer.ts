import type { GradientVO } from '../../../Domain'

/**
 * Uniform buffer size in bytes (must match WGSL struct)
 * GradientUniforms: 96 bytes
 */
export const UNIFORM_BUFFER_SIZE = 96

/**
 * Build uniform buffer data from GradientVO
 */
export function buildGradientUniform(
  vo: GradientVO,
  width: number,
  height: number
): ArrayBuffer {
  const buffer = new ArrayBuffer(UNIFORM_BUFFER_SIZE)
  const f32 = new Float32Array(buffer)
  const u32 = new Uint32Array(buffer)

  let offset = 0

  // Mix settings (16 bytes)
  f32[offset / 4] = vo.mix.softness // 0-3
  offset += 4
  f32[offset / 4] = vo.mix.preserveChroma // 4-7
  offset += 4
  u32[offset / 4] = vo.points.length // 8-11: pointCount
  offset += 4
  f32[offset / 4] = 0 // 12-15: padding
  offset += 4

  // Warp settings (32 bytes)
  f32[offset / 4] = vo.warp.seed // 16-19
  offset += 4
  f32[offset / 4] = vo.warp.amplitude // 20-23
  offset += 4
  f32[offset / 4] = vo.warp.frequency // 24-27
  offset += 4
  u32[offset / 4] = vo.warp.octaves // 28-31
  offset += 4
  f32[offset / 4] = vo.warp.lacunarity // 32-35
  offset += 4
  f32[offset / 4] = vo.warp.gain // 36-39
  offset += 4
  f32[offset / 4] = 0 // 40-43: padding
  offset += 4
  f32[offset / 4] = 0 // 44-47: padding
  offset += 4

  // Post settings (16 bytes)
  f32[offset / 4] = vo.post.grainSeed // 48-51
  offset += 4
  f32[offset / 4] = vo.post.grainAmount // 52-55
  offset += 4
  f32[offset / 4] = vo.post.grainScale // 56-59
  offset += 4
  f32[offset / 4] = vo.post.ditherAmount // 60-63
  offset += 4

  // Resolution (16 bytes)
  f32[offset / 4] = width // 64-67
  offset += 4
  f32[offset / 4] = height // 68-71
  offset += 4
  f32[offset / 4] = 0 // 72-75: padding
  offset += 4
  f32[offset / 4] = 0 // 76-79: padding
  offset += 4

  // Reserved (16 bytes)
  // offset 80-95: zeroed

  return buffer
}
