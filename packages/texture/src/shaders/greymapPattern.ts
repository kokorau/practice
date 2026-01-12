/**
 * Greymap Pattern Shaders
 *
 * Pattern shaders that output grayscale values (0.0-1.0) instead of RGBA colors.
 * These can be used as mask sources via the colorize shader.
 */

import { fullscreenVertex, aaUtils, moduloUtils } from './common'
import type {
  StripeGreymapParams,
  GridGreymapParams,
  PolkaDotGreymapParams,
  CheckerGreymapParams,
  GreymapMaskSpec,
} from '../Domain/ValueObject/GreymapSpec'

// ============================================================
// Stripe Greymap Pattern
// ============================================================

/** Stripe greymap shader */
export const stripeGreymapShader = /* wgsl */ `
struct StripeGreymapParams {
  width1: f32,
  width2: f32,
  angle: f32,
  value1: f32,
  value2: f32,
  _padding: f32,
}

@group(0) @binding(0) var<uniform> params: StripeGreymapParams;

${fullscreenVertex}

${aaUtils}

${moduloUtils}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let cosA = cos(params.angle);
  let sinA = sin(params.angle);
  let rotatedX = pos.x * cosA + pos.y * sinA;

  let period = params.width1 + params.width2;
  let normalizedT = safeModulo(rotatedX, period);

  // Anti-aliased edges
  let edge1 = aaStep(params.width1, normalizedT);
  let edge2 = aaStep(period, normalizedT);

  let blend = edge1 - edge2;
  let value = mix(params.value1, params.value2, blend);

  return vec4f(value, value, value, 1.0);
}
`

/**
 * Create greymap spec for stripe pattern
 */
export function createStripeGreymapSpec(params: StripeGreymapParams): GreymapMaskSpec {
  const data = new Float32Array([
    params.width1,
    params.width2,
    params.angle,
    params.value1,
    params.value2,
    0, // padding
  ])
  return {
    shader: stripeGreymapShader,
    uniforms: data.buffer,
    bufferSize: 32, // 6 floats, aligned to 32
  }
}

// ============================================================
// Grid Greymap Pattern
// ============================================================

/** Grid greymap shader */
export const gridGreymapShader = /* wgsl */ `
struct GridGreymapParams {
  lineWidth: f32,
  cellSize: f32,
  lineValue: f32,
  bgValue: f32,
}

@group(0) @binding(0) var<uniform> params: GridGreymapParams;

${fullscreenVertex}

${aaUtils}

${moduloUtils}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let cellSize = params.cellSize;
  let halfLineWidth = params.lineWidth * 0.5;

  // Distance to nearest grid line
  let cellX = safeModulo(pos.x, cellSize);
  let cellY = safeModulo(pos.y, cellSize);

  // Distance from center of cell to nearest edge
  let distX = min(cellX, cellSize - cellX);
  let distY = min(cellY, cellSize - cellY);

  // Anti-aliased grid line
  let lineX = 1.0 - aaStep(halfLineWidth, distX);
  let lineY = 1.0 - aaStep(halfLineWidth, distY);

  // Combine: either on horizontal or vertical line
  let onLine = max(lineX, lineY);
  let value = mix(params.bgValue, params.lineValue, onLine);

  return vec4f(value, value, value, 1.0);
}
`

/**
 * Create greymap spec for grid pattern
 */
export function createGridGreymapSpec(params: GridGreymapParams): GreymapMaskSpec {
  const data = new Float32Array([
    params.lineWidth,
    params.cellSize,
    params.lineValue,
    params.bgValue,
  ])
  return {
    shader: gridGreymapShader,
    uniforms: data.buffer,
    bufferSize: 16, // 4 floats = 16 bytes
  }
}

// ============================================================
// Polka Dot Greymap Pattern
// ============================================================

/** Polka dot greymap shader */
export const polkaDotGreymapShader = /* wgsl */ `
struct PolkaDotGreymapParams {
  dotRadius: f32,
  spacing: f32,
  rowOffset: f32,
  dotValue: f32,
  bgValue: f32,
  _padding: f32,
}

@group(0) @binding(0) var<uniform> params: PolkaDotGreymapParams;

${fullscreenVertex}

${aaUtils}

${moduloUtils}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let spacing = params.spacing;
  let radius = params.dotRadius;

  // Calculate row and apply offset for alternating rows
  let row = floor(pos.y / spacing);
  let offset = safeModulo(row, 2.0) * params.rowOffset * spacing;

  // Position within cell
  let cellX = safeModulo(pos.x + offset, spacing);
  let cellY = safeModulo(pos.y, spacing);

  // Distance from cell center
  let center = vec2f(spacing * 0.5, spacing * 0.5);
  let dist = length(vec2f(cellX, cellY) - center);

  // Anti-aliased dot
  let dotMask = 1.0 - aaStep(radius, dist);
  let value = mix(params.bgValue, params.dotValue, dotMask);

  return vec4f(value, value, value, 1.0);
}
`

/**
 * Create greymap spec for polka dot pattern
 */
export function createPolkaDotGreymapSpec(params: PolkaDotGreymapParams): GreymapMaskSpec {
  const data = new Float32Array([
    params.dotRadius,
    params.spacing,
    params.rowOffset,
    params.dotValue,
    params.bgValue,
    0, // padding
  ])
  return {
    shader: polkaDotGreymapShader,
    uniforms: data.buffer,
    bufferSize: 32, // 6 floats, aligned to 32
  }
}

// ============================================================
// Checker Greymap Pattern
// ============================================================

/** Checker greymap shader */
export const checkerGreymapShader = /* wgsl */ `
struct CheckerGreymapParams {
  cellSize: f32,
  angle: f32,
  value1: f32,
  value2: f32,
}

@group(0) @binding(0) var<uniform> params: CheckerGreymapParams;

${fullscreenVertex}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  // Apply rotation
  let cosA = cos(params.angle);
  let sinA = sin(params.angle);
  let rotatedPos = vec2f(
    pos.x * cosA + pos.y * sinA,
    -pos.x * sinA + pos.y * cosA
  );

  // Determine checker cell
  let cellX = floor(rotatedPos.x / params.cellSize);
  let cellY = floor(rotatedPos.y / params.cellSize);

  // Alternating pattern
  let checker = (i32(cellX) + i32(cellY)) % 2;
  let value = select(params.value1, params.value2, checker == 1);

  return vec4f(value, value, value, 1.0);
}
`

/**
 * Create greymap spec for checker pattern
 */
export function createCheckerGreymapSpec(params: CheckerGreymapParams): GreymapMaskSpec {
  const data = new Float32Array([
    params.cellSize,
    params.angle,
    params.value1,
    params.value2,
  ])
  return {
    shader: checkerGreymapShader,
    uniforms: data.buffer,
    bufferSize: 16, // 4 floats = 16 bytes
  }
}
