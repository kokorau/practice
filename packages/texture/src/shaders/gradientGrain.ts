import { fullscreenVertex, interleavedGradientNoise, hash21 } from './common'
import type { TextureRenderSpec } from '../Domain'

// ============================================================
// Parameter Types
// ============================================================

export interface GradientGrainParams {
  angle: number  // degrees (0-360)
  colorA: [number, number, number, number]  // RGBA start color
  colorB: [number, number, number, number]  // RGBA end color
  seed: number  // noise seed
  intensity: number  // grain intensity (0-1), affects gradient range
  blendStrength: number  // how much grain blends with base gradient (0-1)
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
 *   intensity: f32 (4) + blendStrength: f32 (4) + padding: vec2f (8) = 16 bytes
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
  intensity: f32,
  blendStrength: f32,
  _padding: vec2f,
}

@group(0) @binding(0) var<uniform> params: Params;

${fullscreenVertex}

${hash21}

${interleavedGradientNoise}

// 角度からグラデーション方向ベクトルを計算
fn getGradientDirection(angleDeg: f32) -> vec2f {
  let angleRad = (angleDeg - 90.0) * 3.14159265359 / 180.0;
  return vec2f(cos(angleRad), sin(angleRad));
}

// グラデーション位置を計算 (0-1)
fn getGradientT(uv: vec2f) -> f32 {
  let dir = getGradientDirection(params.angle);
  let centered = uv - vec2f(0.5, 0.5);
  let projected = dot(centered, dir);
  return clamp(projected + 0.5, 0.0, 1.0);
}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / params.viewport;

  // 基本グラデーション位置
  let t = getGradientT(uv);

  // ベースのグラデーション色
  let baseColor = mix(params.colorA, params.colorB, t);

  // IGN ノイズ (0-1)
  let noise = interleavedGradientNoise(pos.xy, params.seed);

  // 勾配範囲を intensity で調整
  // intensity=1.0: 0.2-0.8 の範囲, intensity=0.0: 0.5 固定
  let range = params.intensity * 0.3;  // max 0.3 (= 0.5 ± 0.3)
  let gradientStart = 0.5 + range;  // LR が 100% になる位置
  let gradientEnd = 0.5 - range;    // RL が 100% になる位置

  // グラデーション値を正規化 (gradientEnd-gradientStart → 0-1)
  let normalizedT = clamp((t - gradientEnd) / (gradientStart - gradientEnd + 0.001), 0.0, 1.0);

  // LR方向: 勾配が高いほど colorA が出やすい
  // RL方向: 勾配が低いほど colorB が出やすい
  let isLR = hash21(pos.xy + params.seed * 100.0) < 0.5;

  var grainColor: vec4f;
  if (isLR) {
    // LR: ノイズが normalizedT 未満なら colorA
    if (noise < normalizedT) {
      grainColor = params.colorA;
    } else {
      grainColor = baseColor;
    }
  } else {
    // RL: ノイズが (1 - normalizedT) 未満なら colorB
    if (noise < (1.0 - normalizedT)) {
      grainColor = params.colorB;
    } else {
      grainColor = baseColor;
    }
  }

  // blendStrength でベース色とグレイン色をブレンド
  return mix(baseColor, grainColor, params.blendStrength);
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

  // intensity (f32) + blendStrength (f32) + padding (vec2f)
  data[12] = params.intensity
  data[13] = params.blendStrength
  // data[14], data[15] = padding

  return {
    shader: gradientGrainShader,
    uniforms: data.buffer,
    bufferSize: GRADIENT_GRAIN_BUFFER_SIZE,
  }
}
