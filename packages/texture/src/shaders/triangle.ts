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

  // Triangle tessellation using equilateral triangles
  // Height of equilateral triangle: h = size * sqrt(3) / 2
  let h = params.size * 0.866025403784; // sqrt(3) / 2

  // Normalize coordinates to triangle grid
  let row = floor(rotatedY / h);
  let isOddRow = i32(row) % 2;

  // X offset for odd rows (triangles are shifted by half)
  let xOffset = select(0.0, params.size * 0.5, isOddRow == 1);
  let adjustedX = rotatedX - xOffset;

  // Position within the row
  let col = floor(adjustedX / params.size);
  let localX = adjustedX - col * params.size;
  let localY = rotatedY - row * h;

  // Determine if we're in the upper or lower triangle of the cell
  // In each cell, there's an upward and downward pointing triangle
  // The dividing line goes from (0, h) to (size/2, 0) to (size, h)
  let normalizedX = localX / params.size;
  let normalizedY = localY / h;

  // Check which side of the dividing line we're on
  var isUpperTriangle: bool;
  if (normalizedX < 0.5) {
    // Left half: line from (0, 1) to (0.5, 0)
    // y = 1 - 2x, so upper if normalizedY > 1 - 2*normalizedX
    isUpperTriangle = normalizedY > (1.0 - 2.0 * normalizedX);
  } else {
    // Right half: line from (0.5, 0) to (1, 1)
    // y = 2x - 1, so upper if normalizedY > 2*normalizedX - 1
    isUpperTriangle = normalizedY > (2.0 * normalizedX - 1.0);
  }

  // Calculate final color based on row, column, and triangle position
  let baseIndex = i32(row) + i32(col);
  let triangleIndex = baseIndex + select(0, 1, isUpperTriangle);
  let colorIndex = triangleIndex % 2;

  return select(params.color1, params.color2, colorIndex == 1);
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
