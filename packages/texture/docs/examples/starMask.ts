/**
 * Star Mask Shader - Tutorial Example
 *
 * このファイルはマスクシェーダーの作成方法を示すサンプル実装です。
 * MASK_SHADER_GUIDE.md と合わせてご参照ください。
 *
 * @example
 * ```typescript
 * import { createStarMaskSpec } from './starMask'
 *
 * const spec = createStarMaskSpec({
 *   centerX: 0.5,
 *   centerY: 0.5,
 *   outerRadius: 0.3,
 *   innerRadius: 0.15,
 *   points: 5,
 *   innerColor: [1, 1, 1, 1],
 *   outerColor: [0, 0, 0, 0],
 *   cutout: true,
 * }, { width: 800, height: 600 })
 * ```
 */

import { fullscreenVertex, aaUtils, maskBlendState } from '../../src/shaders/common'
import type { TextureRenderSpec, Viewport } from '../../src/Domain'

// ============================================================
// 1. パラメータ型定義
// ============================================================

/**
 * 星形マスクのパラメータ
 */
export interface StarMaskParams {
  /** 中心X座標 (0.0-1.0, 正規化座標) */
  centerX: number
  /** 中心Y座標 (0.0-1.0, 正規化座標) */
  centerY: number
  /** 外側の半径 (0.0-1.0, 画面の短辺に対する比率) */
  outerRadius: number
  /** 内側の半径 (0.0-1.0, 画面の短辺に対する比率) */
  innerRadius: number
  /** 頂点の数 (3以上) */
  points: number
  /** 回転角度 (ラジアン) */
  rotation: number
  /** 内側の色 */
  innerColor: [number, number, number, number]
  /** 外側の色 */
  outerColor: [number, number, number, number]
  /** If true (default), texture is rendered outside the shape. If false, texture fills the shape. */
  cutout?: boolean
}

// ============================================================
// 2. バッファサイズ定数
// ============================================================

/**
 * Uniform buffer size (16-byte aligned)
 *
 * Layout:
 *   innerColor  (vec4f) = 16 bytes (offset 0)
 *   outerColor  (vec4f) = 16 bytes (offset 16)
 *   centerX     (f32)   = 4 bytes  (offset 32)
 *   centerY     (f32)   = 4 bytes  (offset 36)
 *   outerRadius (f32)   = 4 bytes  (offset 40)
 *   innerRadius (f32)   = 4 bytes  (offset 44)
 *   points      (f32)   = 4 bytes  (offset 48)
 *   rotation    (f32)   = 4 bytes  (offset 52)
 *   aspectRatio (f32)   = 4 bytes  (offset 56)
 *   viewportW   (f32)   = 4 bytes  (offset 60)
 *   viewportH   (f32)   = 4 bytes  (offset 64)
 *   _padding    (vec3f) = 12 bytes (offset 68)
 *   Total = 80 bytes
 */
export const STAR_MASK_BUFFER_SIZE = 80

// ============================================================
// 3. WGSLシェーダー
// ============================================================

/**
 * 星形マスクシェーダー
 *
 * SDFベースの星形を描画します。
 * - アスペクト比補正により、任意の画面サイズで正しい形状を維持
 * - ピクセルベースのアンチエイリアスでスムーズなエッジを実現
 */
export const starMaskShader = /* wgsl */ `
${fullscreenVertex}

${aaUtils}

// Uniform構造体（TypeScriptのパラメータ型と対応）
struct StarMaskParams {
  innerColor: vec4f,      // 16 bytes (offset 0)
  outerColor: vec4f,      // 16 bytes (offset 16)
  centerX: f32,           // 4 bytes  (offset 32)
  centerY: f32,           // 4 bytes  (offset 36)
  outerRadius: f32,       // 4 bytes  (offset 40)
  innerRadius: f32,       // 4 bytes  (offset 44)
  points: f32,            // 4 bytes  (offset 48)
  rotation: f32,          // 4 bytes  (offset 52)
  aspectRatio: f32,       // 4 bytes  (offset 56)
  viewportWidth: f32,     // 4 bytes  (offset 60)
  viewportHeight: f32,    // 4 bytes  (offset 64)
  _padding: vec3f,        // 12 bytes (offset 68) → total 80 bytes
}

@group(0) @binding(0) var<uniform> params: StarMaskParams;

// 定数
const PI: f32 = 3.14159265359;
const TWO_PI: f32 = 6.28318530718;

/**
 * 星形のSDF (Signed Distance Field)
 *
 * @param p - 中心からの相対座標（アスペクト比補正済み）
 * @param outerR - 外側の半径（頂点の先端）
 * @param innerR - 内側の半径（頂点の谷）
 * @param n - 頂点の数
 * @param rot - 回転角度（ラジアン）
 * @return 符号付き距離（負=内側、正=外側）
 */
fn starSDF(p: vec2f, outerR: f32, innerR: f32, n: f32, rot: f32) -> f32 {
  // 極座標に変換
  let angle = atan2(p.y, p.x) - rot;

  // 星の1セグメントあたりの角度
  let segmentAngle = TWO_PI / n;

  // 現在の角度を0〜segmentAngleの範囲に正規化
  // WGSL doesn't have modulo for floats, so we calculate it manually
  var normalizedAngle = angle - floor(angle / segmentAngle) * segmentAngle;

  // セグメントの中心からの角度（-半分〜+半分）
  let halfSegment = segmentAngle / 2.0;
  normalizedAngle = normalizedAngle - halfSegment;

  // 星の頂点と谷を交互に配置
  // 角度0が頂点、halfSegmentが谷
  let t = abs(normalizedAngle) / halfSegment;  // 0〜1の範囲
  let targetRadius = mix(outerR, innerR, t);

  // 中心からの距離
  let dist = length(p);

  // SDFを返す
  return dist - targetRadius;
}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let viewportWidth = params.viewportWidth;
  let viewportHeight = params.viewportHeight;
  let aspectRatio = params.aspectRatio;

  // 正規化UV座標 (0.0〜1.0)
  let uv = vec2f(pos.x / viewportWidth, pos.y / viewportHeight);

  // 中心からの相対座標
  let center = vec2f(params.centerX, params.centerY);
  var delta = uv - center;

  // アスペクト比補正
  // - 横長 (aspectRatio > 1): Xを拡大して円が正円に見えるように
  // - 縦長 (aspectRatio < 1): Yを拡大
  delta.x *= max(aspectRatio, 1.0);
  delta.y *= max(1.0 / aspectRatio, 1.0);

  // 星形SDFを計算
  let sdf = starSDF(
    delta,
    params.outerRadius,
    params.innerRadius,
    params.points,
    params.rotation
  );

  // アンチエイリアス
  // ピクセルサイズベースのスムージングでジャギーを防止
  let pixelSize = 1.0 / min(viewportWidth, viewportHeight);
  let alpha = smoothstep(-pixelSize, pixelSize, sdf);

  // 内側と外側の色を補間
  return mix(params.innerColor, params.outerColor, alpha);
}
`

// ============================================================
// 4. Spec生成関数
// ============================================================

/**
 * 星形マスクのTextureRenderSpecを生成
 *
 * @param params - 星形マスクのパラメータ
 * @param viewport - ビューポートサイズ
 * @returns TextureRenderSpec
 */
export function createStarMaskSpec(
  params: StarMaskParams,
  viewport: Viewport
): TextureRenderSpec {
  const aspectRatio = viewport.width / viewport.height

  // cutoutモードの処理
  // cutout=true: 外側に描画（穴あき効果）→ 色はそのまま
  // cutout=false: 内側に描画（塗りつぶし）→ 内外の色を交換
  const cutout = params.cutout ?? true
  const innerColor = cutout ? params.innerColor : params.outerColor
  const outerColor = cutout ? params.outerColor : params.innerColor

  // Uniformバッファを作成
  // Float32Arrayを使用して、構造体のレイアウトに従ってデータを配置
  const data = new Float32Array([
    // innerColor (vec4f) - offset 0
    ...innerColor,
    // outerColor (vec4f) - offset 16
    ...outerColor,
    // 個別のパラメータ
    params.centerX,           // offset 32
    params.centerY,           // offset 36
    params.outerRadius,       // offset 40
    params.innerRadius,       // offset 44
    params.points,            // offset 48
    params.rotation,          // offset 52
    aspectRatio,              // offset 56
    viewport.width,           // offset 60
    viewport.height,          // offset 64
    // _padding (vec3f) - offset 68
    0, 0, 0,
  ])

  return {
    shader: starMaskShader,
    uniforms: data.buffer,
    bufferSize: STAR_MASK_BUFFER_SIZE,
    blend: maskBlendState,
  }
}

// ============================================================
// 5. プリセット例
// ============================================================

/**
 * デフォルトの星形マスクプリセット
 */
export const defaultStarMaskParams: StarMaskParams = {
  centerX: 0.5,
  centerY: 0.5,
  outerRadius: 0.3,
  innerRadius: 0.15,
  points: 5,
  rotation: -Math.PI / 2, // 頂点が上を向くように
  innerColor: [1, 1, 1, 1],
  outerColor: [0, 0, 0, 0],
  cutout: true,
}
