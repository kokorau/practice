import { fullscreenVertex, maskBlendState } from './common'
import type { TextureRenderSpec, Viewport } from '../Domain'

// ============================================================
// Mask Cutout Shader
// Takes a grayscale map texture and applies cutout with color
// ============================================================

/**
 * マスク切り抜きシェーダーのパラメータ
 *
 * グレーマップを入力として受け取り、輝度に基づいて切り抜きを適用する
 * - 白 (1.0) = 残す（マスクカラーを適用）
 * - 黒 (0.0) = 切り抜き（透明）
 * - グレー = 半透明
 */
export interface MaskCutoutParams {
  /** マスクカラー (切り抜かれない部分の色) */
  maskColor: [number, number, number, number]
  /** 切り抜き処理を反転するか (true=白い部分を切り抜く) */
  invert?: boolean
}

/** マスク切り抜きシェーダー */
export const maskCutoutShader = /* wgsl */ `
${fullscreenVertex}

struct MaskCutoutParams {
  maskColor: vec4f,
  invert: f32,
  viewportWidth: f32,
  viewportHeight: f32,
  _padding: f32,
}

@group(0) @binding(0) var<uniform> params: MaskCutoutParams;
@group(0) @binding(1) var grayscaleMap: texture_2d<f32>;
@group(0) @binding(2) var grayscaleSampler: sampler;

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = vec2f(pos.x / params.viewportWidth, pos.y / params.viewportHeight);

  // グレーマップからサンプリング
  let grayscale = textureSample(grayscaleMap, grayscaleSampler, uv);

  // 輝度を計算 (RGB輝度、alphaも考慮)
  // Alpha処理方針: alpha=0の場合は切り抜きとして扱う
  let luminance = dot(grayscale.rgb, vec3f(0.299, 0.587, 0.114));
  var maskValue = luminance * grayscale.a;

  // 反転処理
  if (params.invert > 0.5) {
    maskValue = 1.0 - maskValue;
  }

  // マスクカラーを適用（maskValue=1で完全に表示、maskValue=0で完全に透明）
  return vec4f(params.maskColor.rgb, params.maskColor.a * maskValue);
}
`

/**
 * Create render spec for mask cutout shader
 * Note: This requires a grayscale texture to be provided separately
 */
export function createMaskCutoutSpec(
  params: MaskCutoutParams,
  viewport: Viewport
): TextureRenderSpec {
  const data = new Float32Array([
    params.maskColor[0],
    params.maskColor[1],
    params.maskColor[2],
    params.maskColor[3],
    params.invert ? 1.0 : 0.0,
    viewport.width,
    viewport.height,
    0, // padding
  ])

  return {
    shader: maskCutoutShader,
    uniforms: data.buffer,
    bufferSize: 32,
    blend: maskBlendState,
  }
}

// ============================================================
// Standalone Mask Cutout (without texture input)
// For direct use with innerColor/outerColor API
// ============================================================

/**
 * スタンドアロン切り抜きパラメータ
 * グレースケール値を直接指定して切り抜きを行う
 */
export interface StandaloneCutoutParams {
  /** 内側のグレースケール値 (0.0-1.0) */
  innerValue: number
  /** 外側のグレースケール値 (0.0-1.0) */
  outerValue: number
  /** 内側の色 */
  innerColor: [number, number, number, number]
  /** 外側の色 */
  outerColor: [number, number, number, number]
}

/**
 * Convert legacy color-based mask params to grayscale + cutout
 *
 * この関数は既存のinnerColor/outerColor APIからグレースケール値を抽出する
 * - 色のアルファ値からグレースケール値を導出
 * - innerColor.a > 0 → innerValue = 1.0 (残す)
 * - innerColor.a = 0 → innerValue = 0.0 (切り抜き)
 */
export function convertLegacyToGrayscale(
  innerColor: [number, number, number, number],
  outerColor: [number, number, number, number]
): { innerValue: number; outerValue: number; maskColor: [number, number, number, number] } {
  // 既存のAPIでは通常:
  // - cutout=true: innerColor.a=0 (透明/切り抜き), outerColor.a=1 (表示)
  // - cutout=false: innerColor.a=1 (表示), outerColor.a=0 (透明)
  //
  // グレースケール変換:
  // - alpha > 0 の色をmaskColorとして使用
  // - alpha値からグレースケール値を導出

  const innerAlpha = innerColor[3]
  const outerAlpha = outerColor[3]

  // どちらの色がmaskColorかを判定
  if (innerAlpha > outerAlpha) {
    // 内側が表示される（solid mode）
    return {
      innerValue: 1.0,
      outerValue: 0.0,
      maskColor: innerColor,
    }
  } else {
    // 外側が表示される（cutout mode）
    return {
      innerValue: 0.0,
      outerValue: 1.0,
      maskColor: outerColor,
    }
  }
}

/**
 * Grayscale mask buffer size constant
 */
export const MASK_CUTOUT_BUFFER_SIZE = 32
