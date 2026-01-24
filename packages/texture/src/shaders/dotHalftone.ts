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
  /** RGB収差の強度（ピクセル単位） */
  aberration: number
}

/**
 * ドットハーフトーンシェーダー
 * 入力テクスチャの輝度に基づいてドットサイズを変化させる
 * RGB収差機能付き：R/G/Bチャンネルを少しずらして描画
 * 背景は透過
 */
export const dotHalftoneShader = /* wgsl */ `
struct Uniforms {
  dotSize: f32,          // 4 bytes
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

// ドットマスクを計算する関数
fn calcDotMask(rotatedPos: vec2f, spacing: f32, dotSize: f32, luminance: f32) -> f32 {
  let cellPos = safeModulo2(rotatedPos, spacing);
  let cellCenter = spacing * 0.5;
  let dx = cellPos.x - cellCenter;
  let dy = cellPos.y - cellCenter;
  let dist = sqrt(dx * dx + dy * dy);
  let halftoneDotRadius = dotSize * 0.5 * (1.0 - luminance);
  return smoothstep(halftoneDotRadius + 0.5, halftoneDotRadius - 0.5, dist);
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

  // キャンバスの中心を基準に回転
  let center = texSize * 0.5;
  let centered = pos.xy - center;
  let rotatedPos = vec2f(
    centered.x * cosA - centered.y * sinA,
    centered.x * sinA + centered.y * cosA
  );

  // RGB収差のオフセット（中心から放射状に）
  let toCenter = normalize(centered);
  let aberrationOffset = toCenter * u.aberration;
  // 回転座標系でのオフセット
  let rotatedOffset = vec2f(
    aberrationOffset.x * cosA - aberrationOffset.y * sinA,
    aberrationOffset.x * sinA + aberrationOffset.y * cosA
  );

  // R/G/Bそれぞれの位置でドットマスクを計算
  let dotMaskR = calcDotMask(rotatedPos + rotatedOffset, u.spacing, u.dotSize, luminance);
  let dotMaskG = calcDotMask(rotatedPos, u.spacing, u.dotSize, luminance);
  let dotMaskB = calcDotMask(rotatedPos - rotatedOffset, u.spacing, u.dotSize, luminance);

  // 透過背景にRGB収差付きドット
  // ドット部分は暗く（減算）、ずれた部分は色が付く
  // R=0はシアン的, G=0はマゼンタ的, B=0はイエロー的
  let r = 1.0 - dotMaskR;
  let g = 1.0 - dotMaskG;
  let b = 1.0 - dotMaskB;
  let maxMask = max(max(dotMaskR, dotMaskG), dotMaskB);
  let alpha = maxMask * originalColor.a;

  // Premultiplied alpha: RGB を alpha で乗算（透過部分の RGB は 0 に）
  let halftoneColor = vec4f(r * alpha, g * alpha, b * alpha, alpha);

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
  view.setFloat32(12, params.aberration, true)
  view.setFloat32(16, viewport.width, true)
  view.setFloat32(20, viewport.height, true)
  view.setFloat32(24, 0, true) // padding
  view.setFloat32(28, 0, true) // padding

  return uniforms
}
