import { fullscreenVertex } from './common'
import type { TextureRenderSpec } from '../Domain'

// ============================================================
// Parameter Types
// ============================================================

export interface IntensityCurveParams {
  angle: number  // gradient direction (degrees 0-360)
  curvePoints: number[]  // 7 Y values (0-1), X is fixed at equal intervals
}

// ============================================================
// Buffer Size
// ============================================================

/**
 * Uniform buffer size (16-byte aligned)
 * Layout:
 *   viewport: vec2f (8) + angle: f32 (4) + _pad: f32 (4) = 16 bytes
 *   curvePoints[0..3]: vec4f (16) = 16 bytes
 *   curvePoints[4..6] + _pad: vec4f (16) = 16 bytes
 *   Total: 48 bytes
 */
export const INTENSITY_CURVE_BUFFER_SIZE = 48

// ============================================================
// WGSL Shader
// ============================================================

export const intensityCurveShader = /* wgsl */ `
struct Params {
  viewport: vec2f,      // 8 bytes @ offset 0
  angle: f32,           // 4 bytes @ offset 8
  _pad0: f32,           // 4 bytes @ offset 12
  curvePoints0: vec4f,  // 16 bytes @ offset 16 (points 0,1,2,3)
  curvePoints1: vec4f,  // 16 bytes @ offset 32 (points 4,5,6,_pad)
}                       // Total: 48 bytes

@group(0) @binding(0) var<uniform> params: Params;

${fullscreenVertex}

// Catmull-Rom spline interpolation
fn catmullRom(p0: f32, p1: f32, p2: f32, p3: f32, t: f32) -> f32 {
  let t2 = t * t;
  let t3 = t2 * t;
  return 0.5 * (
    (2.0 * p1) +
    (-p0 + p2) * t +
    (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * t2 +
    (-p0 + 3.0 * p1 - 3.0 * p2 + p3) * t3
  );
}

// Get curve point by index
fn getPoint(idx: i32) -> f32 {
  switch(idx) {
    case 0: { return params.curvePoints0.x; }
    case 1: { return params.curvePoints0.y; }
    case 2: { return params.curvePoints0.z; }
    case 3: { return params.curvePoints0.w; }
    case 4: { return params.curvePoints1.x; }
    case 5: { return params.curvePoints1.y; }
    case 6: { return params.curvePoints1.z; }
    default: { return 0.0; }
  }
}

// Evaluate 7-point curve using Catmull-Rom interpolation
fn evaluateCurve(x: f32) -> f32 {
  // x is in 0-1, split into 6 segments
  let segmentF = x * 6.0;
  let segment = i32(floor(segmentF));
  let t = fract(segmentF);

  // Clamp segment to valid range (0-5)
  let i = clamp(segment, 0, 5);

  // Get 4 points for Catmull-Rom (with boundary handling)
  let p0 = getPoint(max(i - 1, 0));
  let p1 = getPoint(i);
  let p2 = getPoint(min(i + 1, 6));
  let p3 = getPoint(min(i + 2, 6));

  return clamp(catmullRom(p0, p1, p2, p3, t), 0.0, 1.0);
}

// Calculate gradient direction from angle
fn getGradientDirection(angleDeg: f32) -> vec2f {
  let angleRad = (angleDeg - 90.0) * 3.14159265359 / 180.0;
  return vec2f(cos(angleRad), sin(angleRad));
}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  // Normalized coordinates (0-1)
  let uv = pos.xy / params.viewport;

  // Gradient direction
  let dir = getGradientDirection(params.angle);

  // Calculate position along gradient direction from center
  let centered = uv - vec2f(0.5, 0.5);
  let projected = dot(centered, dir);

  // Map -0.5~0.5 to 0~1
  let t = clamp(projected + 0.5, 0.0, 1.0);

  // Apply curve transformation
  let curvedT = evaluateCurve(t);

  // Output as grayscale
  return vec4f(curvedT, curvedT, curvedT, 1.0);
}
`

// ============================================================
// Spec Creation
// ============================================================

export function createIntensityCurveSpec(
  params: IntensityCurveParams,
  viewport: { width: number; height: number }
): TextureRenderSpec {
  const data = new Float32Array(INTENSITY_CURVE_BUFFER_SIZE / 4)

  // viewport + angle + padding
  data[0] = viewport.width
  data[1] = viewport.height
  data[2] = params.angle
  data[3] = 0  // padding

  // curvePoints[0..3]
  data[4] = params.curvePoints[0] ?? 0
  data[5] = params.curvePoints[1] ?? 1/6
  data[6] = params.curvePoints[2] ?? 2/6
  data[7] = params.curvePoints[3] ?? 3/6

  // curvePoints[4..6] + padding
  data[8] = params.curvePoints[4] ?? 4/6
  data[9] = params.curvePoints[5] ?? 5/6
  data[10] = params.curvePoints[6] ?? 1
  data[11] = 0  // padding

  return {
    shader: intensityCurveShader,
    uniforms: data.buffer,
    bufferSize: INTENSITY_CURVE_BUFFER_SIZE,
  }
}
