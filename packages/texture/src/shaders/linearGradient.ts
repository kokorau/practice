import { fullscreenVertex, depthMapUtils, depthMapTypeToNumber, type DepthMapType } from './common'
import type { TextureRenderSpec } from '../Domain'

// ============================================================
// Parameter Types
// ============================================================

export interface ColorStop {
  color: [number, number, number, number]  // RGBA (0-1)
  position: number  // 0-1
}

export interface LinearGradientParams {
  depthMapType?: DepthMapType  // 'linear' | 'circular' | 'radial'
  angle: number  // degrees (0-360) for linear
  centerX?: number    // 0-1, default 0.5
  centerY?: number    // 0-1, default 0.5
  circularInvert?: boolean
  radialStartAngle?: number  // degrees
  radialSweepAngle?: number  // degrees
  stops: ColorStop[]  // max 8 stops
}

// ============================================================
// Buffer Size
// ============================================================

/**
 * Uniform buffer size (16-byte aligned)
 * Layout:
 *   viewport: vec2f (8) + depthType: f32 (4) + angle: f32 (4) = 16 bytes
 *   center: vec2f (8) + circularInvert: f32 (4) + radialStartAngle: f32 (4) = 16 bytes
 *   radialSweepAngle: f32 (4) + stopCount: f32 (4) + _pad (8) = 16 bytes
 *   stops[8]: each { color: vec4f (16) + position: f32 (4) + padding: vec3f (12) } = 32 bytes
 *   Total: 48 + 32 * 8 = 304 bytes
 */
export const LINEAR_GRADIENT_BUFFER_SIZE = 304

// ============================================================
// WGSL Shader
// ============================================================

export const linearGradientShader = /* wgsl */ `
struct ColorStop {
  color: vec4f,      // 16 bytes @ offset 0
  position: f32,     // 4 bytes @ offset 16
  _pad0: f32,        // 4 bytes @ offset 20
  _pad1: f32,        // 4 bytes @ offset 24
  _pad2: f32,        // 4 bytes @ offset 28
}                    // Total: 32 bytes

struct Params {
  viewport: vec2f,         // 8 bytes @ offset 0
  depthType: f32,          // 4 bytes @ offset 8
  angle: f32,              // 4 bytes @ offset 12
  center: vec2f,           // 8 bytes @ offset 16
  circularInvert: f32,     // 4 bytes @ offset 24
  radialStartAngle: f32,   // 4 bytes @ offset 28
  radialSweepAngle: f32,   // 4 bytes @ offset 32
  stopCount: f32,          // 4 bytes @ offset 36
  _pad0: f32,              // 4 bytes @ offset 40
  _pad1: f32,              // 4 bytes @ offset 44
  stops: array<ColorStop, 8>,  // 32 * 8 = 256 bytes @ offset 48
}                          // Total: 304 bytes

@group(0) @binding(0) var<uniform> params: Params;

${fullscreenVertex}

${depthMapUtils}

// Sample gradient (2 stop version)
fn sampleGradient(t: f32) -> vec4f {
  let color0 = params.stops[0].color;
  let color1 = params.stops[1].color;
  let pos0 = params.stops[0].position;
  let pos1 = params.stops[1].position;

  let clamped = clamp(t, pos0, pos1);
  let range = pos1 - pos0;
  if (range <= 0.0) {
    return color0;
  }
  let localT = (clamped - pos0) / range;
  return mix(color0, color1, localT);
}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / params.viewport;
  let aspect = params.viewport.x / params.viewport.y;

  // Calculate depth based on type
  let t = calculateDepth(
    uv,
    params.depthType,
    params.angle,
    params.center,
    aspect,
    params.circularInvert,
    params.radialStartAngle,
    params.radialSweepAngle
  );

  return sampleGradient(t);
}
`

// ============================================================
// Spec Creation
// ============================================================

export function createLinearGradientSpec(
  params: LinearGradientParams,
  viewport: { width: number; height: number }
): TextureRenderSpec {
  const stops = params.stops.slice(0, 8)  // max 8 stops
  const stopCount = stops.length

  // Sort stops by position
  const sortedStops = [...stops].sort((a, b) => a.position - b.position)

  // Create uniform buffer
  const data = new Float32Array(LINEAR_GRADIENT_BUFFER_SIZE / 4)

  // viewport + depthType + angle
  data[0] = viewport.width
  data[1] = viewport.height
  data[2] = depthMapTypeToNumber(params.depthMapType ?? 'linear')
  data[3] = params.angle

  // center + circularInvert + radialStartAngle
  data[4] = params.centerX ?? 0.5
  data[5] = params.centerY ?? 0.5
  data[6] = params.circularInvert ? 1.0 : 0.0
  data[7] = params.radialStartAngle ?? 0

  // radialSweepAngle + stopCount + padding
  data[8] = params.radialSweepAngle ?? 360
  data[9] = stopCount
  data[10] = 0  // _pad0
  data[11] = 0  // _pad1

  // stops array (each stop = 8 floats: color(4) + position(1) + padding(3))
  for (let i = 0; i < 8; i++) {
    const offset = 12 + i * 8  // 12 floats header + 8 floats per stop
    const stop = sortedStops[i]
    if (stop) {
      data[offset] = stop.color[0]
      data[offset + 1] = stop.color[1]
      data[offset + 2] = stop.color[2]
      data[offset + 3] = stop.color[3]
      data[offset + 4] = stop.position
      // padding (5, 6, 7) = 0
    }
    // Unused stops remain as 0
  }

  return {
    shader: linearGradientShader,
    uniforms: data.buffer,
    bufferSize: LINEAR_GRADIENT_BUFFER_SIZE,
  }
}
