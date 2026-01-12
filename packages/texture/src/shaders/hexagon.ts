import { fullscreenVertex } from './common'
import type { TextureRenderSpec } from '../Domain'

/**
 * Hexagon tessellation texture params
 */
export interface HexagonTextureParams {
  /** Color 1 RGBA (0-1) */
  color1: [number, number, number, number]
  /** Color 2 RGBA (0-1) */
  color2: [number, number, number, number]
  /** Hexagon radius (px) - center to vertex */
  size: number
  /** Rotation angle (radians) */
  angle: number
}

/**
 * Hexagon tessellation shader (honeycomb pattern)
 * Creates a pattern of regular hexagons alternating between two colors
 */
export const hexagonShader = /* wgsl */ `
struct HexagonParams {
  color1: vec4f,
  color2: vec4f,
  size: f32,
  angle: f32,
  _padding1: f32,
  _padding2: f32,
}

@group(0) @binding(0) var<uniform> params: HexagonParams;

${fullscreenVertex}

// Convert pixel coordinates to axial hex coordinates
fn pixelToHex(p: vec2f, size: f32) -> vec2f {
  // For pointy-top hexagons:
  // q = (sqrt(3)/3 * x - 1/3 * y) / size
  // r = (2/3 * y) / size
  let q = (0.577350269 * p.x - 0.333333333 * p.y) / size;
  let r = (0.666666666 * p.y) / size;
  return vec2f(q, r);
}

// Round fractional hex coordinates to nearest hex cell
fn hexRound(h: vec2f) -> vec2i {
  let q = h.x;
  let r = h.y;
  let s = -q - r;

  var rq = round(q);
  var rr = round(r);
  var rs = round(s);

  let qDiff = abs(rq - q);
  let rDiff = abs(rr - r);
  let sDiff = abs(rs - s);

  if (qDiff > rDiff && qDiff > sDiff) {
    rq = -rr - rs;
  } else if (rDiff > sDiff) {
    rr = -rq - rs;
  }

  return vec2i(i32(rq), i32(rr));
}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  // Apply rotation
  let cosA = cos(params.angle);
  let sinA = sin(params.angle);
  let rotatedX = pos.x * cosA - pos.y * sinA;
  let rotatedY = pos.x * sinA + pos.y * cosA;

  // Convert to hex coordinates
  let hexCoord = pixelToHex(vec2f(rotatedX, rotatedY), params.size);
  let hex = hexRound(hexCoord);

  // Color based on hex cell position
  // Use (q + r) mod 2 for checkerboard-like pattern
  let colorIndex = (hex.x + hex.y) % 2;

  return select(params.color1, params.color2, colorIndex != 0);
}
`

/**
 * Create render spec for hexagon tessellation texture
 */
export function createHexagonSpec(params: HexagonTextureParams): TextureRenderSpec {
  const data = new Float32Array([
    ...params.color1,
    ...params.color2,
    params.size,
    params.angle,
    0, // padding
    0, // padding
  ])
  return {
    shader: hexagonShader,
    uniforms: data.buffer,
    bufferSize: 48,
  }
}
