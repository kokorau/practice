import { fullscreenVertex, hash21 } from './common'
import type { TextureRenderSpec } from '../Domain'

// ============================================================
// Parameter Types
// ============================================================

export interface GradientGrainParams {
  angle: number  // degrees (0-360)
  colorA: [number, number, number, number]  // RGBA start color
  colorB: [number, number, number, number]  // RGBA end color
  seed: number  // noise seed
  power: number  // easing curve power (1=linear, 2=quadratic)
  sparsity: number  // sparsity factor (0=dense, 1=very sparse)
}

// ============================================================
// Buffer Size
// ============================================================

/**
 * Uniform buffer size (16-byte aligned)
 * Layout:
 *   viewport: vec2f (8) + angle: f32 (4) + seed: f32 (4) = 16 bytes
 *   colorA: vec4f = 16 bytes
 *   colorB: vec4f = 16 bytes
 *   power: f32 (4) + sparsity: f32 (4) + padding: vec2f (8) = 16 bytes
 *   Total: 64 bytes
 */
export const GRADIENT_GRAIN_BUFFER_SIZE = 64

// ============================================================
// WGSL Shader
// ============================================================

export const gradientGrainShader = /* wgsl */ `
struct Params {
  viewport: vec2f,
  angle: f32,
  seed: f32,
  colorA: vec4f,
  colorB: vec4f,
  power: f32,
  sparsity: f32,
  _padding: vec2f,
}

@group(0) @binding(0) var<uniform> params: Params;

${fullscreenVertex}

${hash21}

// 角度からグラデーション方向ベクトルを計算
fn getGradientDirection(angleDeg: f32) -> vec2f {
  let angleRad = (angleDeg - 90.0) * 3.14159265359 / 180.0;
  return vec2f(cos(angleRad), sin(angleRad));
}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / params.viewport;

  // グラデーション方向に沿った位置 t (0-1)
  let dir = getGradientDirection(params.angle);
  let centered = uv - vec2f(0.5, 0.5);
  let projected = dot(centered, dir);
  let t = clamp(projected + 0.5, 0.0, 1.0);

  // ベースのグラデーション色
  let baseColor = mix(params.colorA, params.colorB, t);

  // 2つの独立したノイズ (異なるseedで)
  let noiseA = hash21(pos.xy + params.seed);
  let noiseB = hash21(pos.xy + params.seed + 1000.0);

  // Grain(ColorA, LR): t=0で多く、t=1で少なく
  // threshold = 1 - (1-t)^power * (1-sparsity)
  let easedLR = pow(1.0 - t, params.power);
  let thresholdA = 1.0 - easedLR * (1.0 - params.sparsity);
  let showA = noiseA >= thresholdA;

  // Grain(ColorB, RL): t=1で多く、t=0で少なく
  // threshold = 1 - t^power * (1-sparsity)
  let easedRL = pow(t, params.power);
  let thresholdB = 1.0 - easedRL * (1.0 - params.sparsity);
  let showB = noiseB >= thresholdB;

  // 合成: ColorA grain → ColorB grain → Base gradient
  var finalColor = baseColor;
  if (showB) {
    finalColor = params.colorB;
  }
  if (showA) {
    finalColor = params.colorA;
  }

  return finalColor;
}
`

// ============================================================
// Spec Creation
// ============================================================

export function createGradientGrainSpec(
  params: GradientGrainParams,
  viewport: { width: number; height: number }
): TextureRenderSpec {
  const data = new Float32Array(GRADIENT_GRAIN_BUFFER_SIZE / 4)

  // viewport (vec2f) + angle (f32) + seed (f32)
  data[0] = viewport.width
  data[1] = viewport.height
  data[2] = params.angle
  data[3] = params.seed

  // colorA (vec4f)
  data[4] = params.colorA[0]
  data[5] = params.colorA[1]
  data[6] = params.colorA[2]
  data[7] = params.colorA[3]

  // colorB (vec4f)
  data[8] = params.colorB[0]
  data[9] = params.colorB[1]
  data[10] = params.colorB[2]
  data[11] = params.colorB[3]

  // power (f32) + sparsity (f32) + padding (vec2f)
  data[12] = params.power
  data[13] = params.sparsity
  // data[14], data[15] = padding

  return {
    shader: gradientGrainShader,
    uniforms: data.buffer,
    bufferSize: GRADIENT_GRAIN_BUFFER_SIZE,
  }
}
