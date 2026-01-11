import { fullscreenVertex, moduloUtils } from './common'
import type { Viewport } from '../Domain'

/**
 * ドットハーフトーンフィルターのパラメータ
 */
export interface DotHalftoneParams {
  /** ドットのサイズ（ピクセル単位） */
  dotSize: number
  /** ドット間隔（ピクセル単位） */
  spacing: number
  /** ドットの角度（度） */
  angle: number
}

/**
 * ドットハーフトーンシェーダー
 * 入力テクスチャの輝度に基づいてドットサイズを変化させる
 */
export const dotHalftoneShader = /* wgsl */ `
struct Uniforms {
  dotSize: f32,          // 4 bytes
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

${moduloUtils}

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

  // キャンバスの中心を基準に回転
  let center = texSize * 0.5;
  let centered = pos.xy - center;
  let rotatedPos = vec2f(
    centered.x * cosA - centered.y * sinA,
    centered.x * sinA + centered.y * cosA
  );

  // グリッド内の位置を計算（共通ユーティリティ使用）
  let cellPos = safeModulo2(rotatedPos, u.spacing);
  let cellCenter = u.spacing * 0.5;

  // セルの中心からの距離
  let dx = cellPos.x - cellCenter;
  let dy = cellPos.y - cellCenter;
  let dist = sqrt(dx * dx + dy * dy);

  // 輝度に応じたドットサイズ（明るいほどドットが小さい）
  let halftoneDotRadius = u.dotSize * 0.5 * (1.0 - luminance);

  // ドットマスク（アンチエイリアス付き）
  let dotMask = smoothstep(halftoneDotRadius + 0.5, halftoneDotRadius - 0.5, dist);

  // 白背景に黒ドット（Issue要件: ColorA=白, ColorB=黒）
  let halftoneColor = vec4f(vec3f(1.0 - dotMask), originalColor.a);

  return halftoneColor;
}
`

export const DOT_HALFTONE_BUFFER_SIZE = 32 // 8 * 4 = 32 bytes

/**
 * ドットハーフトーンフィルター用のuniformsを生成
 */
export const createDotHalftoneUniforms = (
  params: DotHalftoneParams,
  viewport: Viewport
): ArrayBuffer => {
  const uniforms = new ArrayBuffer(DOT_HALFTONE_BUFFER_SIZE)
  const view = new DataView(uniforms)

  view.setFloat32(0, params.dotSize, true)
  view.setFloat32(4, params.spacing, true)
  view.setFloat32(8, params.angle, true)
  view.setFloat32(12, viewport.width, true)
  view.setFloat32(16, viewport.height, true)
  view.setFloat32(20, 0, true) // padding
  view.setFloat32(24, 0, true) // padding
  view.setFloat32(28, 0, true) // padding

  return uniforms
}
