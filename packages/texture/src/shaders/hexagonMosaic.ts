import { fullscreenVertex, hash22 } from './common'
import type { Viewport } from '../Domain'

/**
 * 六角形モザイクフィルターのパラメータ
 */
export interface HexagonMosaicParams {
  /** セルサイズ（ピクセル単位、8-80） */
  cellSize: number
  /** ノイズスケール（0-100） */
  noiseScale: number
}

/**
 * 六角形モザイクシェーダー
 * 六角形グリッドに基づいてモザイク効果を生成
 */
export const hexagonMosaicShader = /* wgsl */ `
struct Uniforms {
  cellSize: f32,           // 0
  noiseScale: f32,         // 4
  viewportWidth: f32,      // 8
  viewportHeight: f32,     // 12 (total 16 bytes, 16-byte aligned)
}

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var inputSampler: sampler;
@group(0) @binding(2) var inputTexture: texture_2d<f32>;

${fullscreenVertex}

${hash22}

// 六角形の中心座標を計算
fn hexCenter(q: f32, r: f32, size: f32) -> vec2f {
  let x = size * (3.0 / 2.0 * q);
  let y = size * (sqrt(3.0) / 2.0 * q + sqrt(3.0) * r);
  return vec2f(x, y);
}

// ピクセル座標から最も近い六角形のaxial座標を計算
fn pixelToHex(p: vec2f, size: f32) -> vec2f {
  let q = (2.0 / 3.0 * p.x) / size;
  let r = (-1.0 / 3.0 * p.x + sqrt(3.0) / 3.0 * p.y) / size;

  // 丸め処理（cube座標経由）
  let s = -q - r;
  var rq = round(q);
  var rr = round(r);
  var rs = round(s);

  let qDiff = abs(rq - q);
  let rDiff = abs(rr - r);
  let sDiff = abs(rs - s);

  if (qDiff > rDiff && qDiff > sDiff) {
    rq = -rr - rs;
  } else if (rDiff > sDiff) {
    rr = -rq - rs;
  }

  return vec2f(rq, rr);
}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let texSize = vec2f(u.viewportWidth, u.viewportHeight);

  // 画面中心を原点とした座標系に変換
  let centeredPos = pos.xy - texSize * 0.5;

  // 六角形グリッドのaxial座標を取得
  let hex = pixelToHex(centeredPos, u.cellSize);

  // 六角形の中心座標を計算
  var center = hexCenter(hex.x, hex.y, u.cellSize);

  // ノイズを適用（noiseScale > 0 の場合）
  if (u.noiseScale > 0.0) {
    let noise = hash22(hex) * 2.0 - 1.0; // -1 to 1
    let noiseOffset = noise * u.cellSize * u.noiseScale * 0.01;
    center = center + noiseOffset;
  }

  // 画面座標に戻してUVを計算
  let samplePos = center + texSize * 0.5;
  let uv = samplePos / texSize;

  // 境界チェック
  let clampedUV = clamp(uv, vec2f(0.0), vec2f(1.0));

  // 六角形中心の色をサンプリング
  let color = textureSample(inputTexture, inputSampler, clampedUV);

  return color;
}
`

export const HEXAGON_MOSAIC_BUFFER_SIZE = 16 // 4 floats * 4 bytes = 16 bytes (16-byte aligned)

/**
 * 六角形モザイクフィルター用のuniformsを生成
 */
export const createHexagonMosaicUniforms = (
  params: HexagonMosaicParams,
  viewport: Viewport
): ArrayBuffer => {
  const uniforms = new ArrayBuffer(HEXAGON_MOSAIC_BUFFER_SIZE)
  const view = new DataView(uniforms)

  view.setFloat32(0, params.cellSize, true)
  view.setFloat32(4, params.noiseScale ?? 0, true)
  view.setFloat32(8, viewport.width, true)
  view.setFloat32(12, viewport.height, true)

  return uniforms
}
