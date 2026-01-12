import { fullscreenVertex } from './common'
import type { TextureRenderSpec } from '../Domain'

/**
 * Triangle tessellation texture params
 */
export interface TriangleTextureParams {
  /** Color 1 RGBA (0-1) */
  color1: [number, number, number, number]
  /** Color 2 RGBA (0-1) */
  color2: [number, number, number, number]
  /** Triangle edge length (px) */
  size: number
  /** Rotation angle (radians) */
  angle: number
}

/**
 * Triangle tessellation shader
 * Creates a pattern of equilateral triangles alternating between two colors
 */
export const triangleShader = /* wgsl */ `
struct TriangleParams {
  color1: vec4f,
  color2: vec4f,
  size: f32,
  angle: f32,
  _padding1: f32,
  _padding2: f32,
}

@group(0) @binding(0) var<uniform> params: TriangleParams;

${fullscreenVertex}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  // Apply rotation
  let cosA = cos(params.angle);
  let sinA = sin(params.angle);
  let rotatedX = pos.x * cosA - pos.y * sinA;
  let rotatedY = pos.x * sinA + pos.y * cosA;

  // Use simplex grid approach for equilateral triangle tessellation
  // Transform to skewed coordinate system where triangles become easier to identify
  let invSqrt3 = 0.5773502691896258; // 1 / sqrt(3)

  // Scale coordinates by triangle size
  let px = rotatedX / params.size;
  let py = rotatedY / params.size;

  // Transform to triangular lattice coordinates
  // This skews the grid so that equilateral triangles map to a simpler coordinate system
  let u = px - py * invSqrt3;
  let v = py * 2.0 * invSqrt3;

  // Get cell indices (handle negative coordinates properly)
  let i = floor(u);
  let j = floor(v);

  // Fractional position within the parallelogram cell
  let fu = u - i;
  let fv = v - j;

  // Determine which triangle we're in
  // fu + fv < 1.0 means we're in the "lower" triangle (pointing up △)
  // fu + fv >= 1.0 means we're in the "upper" triangle (pointing down ▽)
  let isUpwardTriangle = fu + fv < 1.0;

  // Color based on triangle orientation: △ = color1, ▽ = color2
  return select(params.color2, params.color1, isUpwardTriangle);
}
`

/**
 * Create render spec for triangle tessellation texture
 */
export function createTriangleSpec(params: TriangleTextureParams): TextureRenderSpec {
  const data = new Float32Array([
    ...params.color1,
    ...params.color2,
    params.size,
    params.angle,
    0, // padding
    0, // padding
  ])
  return {
    shader: triangleShader,
    uniforms: data.buffer,
    bufferSize: 48,
  }
}
