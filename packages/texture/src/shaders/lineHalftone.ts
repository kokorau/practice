import { fullscreenVertex, moduloUtils } from './common'
import type { Viewport } from '../Domain'

/**
 * ラインハーフトーンフィルターのパラメータ
 */
export interface LineHalftoneParams {
  /** 線の最大幅（ピクセル単位） */
  lineWidth: number
  /** 線の間隔（ピクセル単位） */
  spacing: number
  /** 線の角度（度） */
  angle: number
  /** RGB収差の強度（ピクセル単位） */
  aberration: number
}

/**
 * ラインハーフトーンシェーダー
 * 入力テクスチャの輝度に基づいて線の太さを変化させる
 * RGB収差機能付き：R/G/Bチャンネルを少しずらして描画
 * 背景は透過
 */
export const lineHalftoneShader = /* wgsl */ `
struct Uniforms {
  lineWidth: f32,        // 4 bytes
  spacing: f32,          // 4 bytes
  angle: f32,            // 4 bytes
  aberration: f32,       // 4 bytes - RGB収差の強度
  viewportWidth: f32,    // 4 bytes
  viewportHeight: f32,   // 4 bytes
  _padding1: f32,        // 4 bytes
  _padding2: f32,        // 4 bytes
}

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var inputSampler: sampler;
@group(0) @binding(2) var inputTexture: texture_2d<f32>;

${fullscreenVertex}

${moduloUtils}

// 線マスクを計算する関数
fn calcLineMask(rotatedY: f32, spacing: f32, lineWidth: f32, luminance: f32) -> f32 {
  let linePos = safeModulo(rotatedY, spacing);
  let centerDist = abs(linePos - spacing * 0.5);
  let halftoneLineWidth = lineWidth * 0.5 * (1.0 - luminance);
  return smoothstep(halftoneLineWidth + 0.5, halftoneLineWidth - 0.5, centerDist);
}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let texSize = vec2f(u.viewportWidth, u.viewportHeight);
  let uv = pos.xy / texSize;

  // 現在ピクセルの色を取得
  let originalColor = textureSample(inputTexture, inputSampler, uv);

  // 透明領域はEffectをスキップ（Mask範囲外を保護）
  if (originalColor.a < 0.01) {
    return originalColor;
  }

  // 輝度を計算（Rec. 709）
  let luminance = dot(originalColor.rgb, vec3f(0.2126, 0.7152, 0.0722));

  // 角度をラジアンに変換
  let angleRad = u.angle * 3.14159265 / 180.0;
  let cosA = cos(angleRad);
  let sinA = sin(angleRad);

  // キャンバスの中心を基準に回転（線に垂直な方向を計算）
  let center = texSize * 0.5;
  let centered = pos.xy - center;
  let rotatedY = centered.x * sinA + centered.y * cosA;

  // RGB収差のオフセット（線に垂直な方向に適用）
  // 中心からの距離に応じてオフセット量を調整
  let distFromCenter = length(centered) / length(texSize * 0.5);
  let aberrationAmount = u.aberration * distFromCenter;

  // R/G/Bそれぞれの位置で線マスクを計算
  let lineMaskR = calcLineMask(rotatedY + aberrationAmount, u.spacing, u.lineWidth, luminance);
  let lineMaskG = calcLineMask(rotatedY, u.spacing, u.lineWidth, luminance);
  let lineMaskB = calcLineMask(rotatedY - aberrationAmount, u.spacing, u.lineWidth, luminance);

  // 透過背景にRGB収差付き線
  // 線部分は暗く（減算）、ずれた部分は色が付く
  let r = 1.0 - lineMaskR;
  let g = 1.0 - lineMaskG;
  let b = 1.0 - lineMaskB;
  let maxMask = max(max(lineMaskR, lineMaskG), lineMaskB);
  let alpha = maxMask * originalColor.a;

  // Premultiplied alpha: RGB を alpha で乗算（透過部分の RGB は 0 に）
  let halftoneColor = vec4f(r * alpha, g * alpha, b * alpha, alpha);

  return halftoneColor;
}
`

export const LINE_HALFTONE_BUFFER_SIZE = 32 // 8 * 4 = 32 bytes

/**
 * ラインハーフトーンフィルター用のuniformsを生成
 */
export const createLineHalftoneUniforms = (
  params: LineHalftoneParams,
  viewport: Viewport
): ArrayBuffer => {
  const uniforms = new ArrayBuffer(LINE_HALFTONE_BUFFER_SIZE)
  const view = new DataView(uniforms)

  view.setFloat32(0, params.lineWidth, true)
  view.setFloat32(4, params.spacing, true)
  view.setFloat32(8, params.angle, true)
  view.setFloat32(12, params.aberration, true)
  view.setFloat32(16, viewport.width, true)
  view.setFloat32(20, viewport.height, true)
  view.setFloat32(24, 0, true) // padding
  view.setFloat32(28, 0, true) // padding

  return uniforms
}
