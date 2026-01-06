import { fullscreenVertex } from './common'
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
}

/**
 * ラインハーフトーンシェーダー
 * 入力テクスチャの輝度に基づいて線の太さを変化させる
 */
export const lineHalftoneShader = /* wgsl */ `
struct Uniforms {
  lineWidth: f32,        // 4 bytes
  spacing: f32,          // 4 bytes
  angle: f32,            // 4 bytes
  viewportWidth: f32,    // 4 bytes
  viewportHeight: f32,   // 4 bytes
  _padding1: f32,        // 4 bytes
  _padding2: f32,        // 4 bytes
  _padding3: f32,        // 4 bytes
}

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var inputSampler: sampler;
@group(0) @binding(2) var inputTexture: texture_2d<f32>;

${fullscreenVertex}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let texSize = vec2f(u.viewportWidth, u.viewportHeight);
  let uv = pos.xy / texSize;

  // 現在ピクセルの色を取得
  let originalColor = textureSample(inputTexture, inputSampler, uv);

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

  // 線のパターン内での位置を計算（負の値でも正しく動作するモジュロ）
  let linePos = ((rotatedY % u.spacing) + u.spacing) % u.spacing;

  // 線の中心からの距離
  let centerDist = abs(linePos - u.spacing * 0.5);

  // 輝度に応じた線幅（暗いほど線が太い）
  let halftoneLineWidth = u.lineWidth * 0.5 * (1.0 - luminance);

  // 線マスク（アンチエイリアス付き）
  let lineMask = smoothstep(halftoneLineWidth + 0.5, halftoneLineWidth - 0.5, centerDist);

  // 白背景に黒線
  let halftoneColor = vec4f(vec3f(1.0 - lineMask), originalColor.a);

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
  view.setFloat32(12, viewport.width, true)
  view.setFloat32(16, viewport.height, true)
  view.setFloat32(20, 0, true) // padding
  view.setFloat32(24, 0, true) // padding
  view.setFloat32(28, 0, true) // padding

  return uniforms
}
