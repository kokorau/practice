import { fullscreenVertex, hash22 } from './common'
import type { Viewport } from '../Domain'

/**
 * ボロノイモザイクフィルターのパラメータ
 */
export interface VoronoiMosaicParams {
  /** セル数（グリッドの分割数、4-32） */
  cellCount: number
  /** シード値（0-1000） */
  seed: number
  /** エッジを表示するか（0=false, 1=true） */
  showEdges: number
  /** エッジの太さ（1-8） */
  edgeWidth: number
  /** ノイズスケール（0-100） */
  noiseScale: number
}

/**
 * ボロノイモザイクシェーダー
 * 不規則なセル分割によるモザイク効果を生成
 */
export const voronoiMosaicShader = /* wgsl */ `
struct Uniforms {
  cellCount: f32,          // 0
  seed: f32,               // 4
  showEdges: f32,          // 8
  edgeWidth: f32,          // 12
  noiseScale: f32,         // 16
  viewportWidth: f32,      // 20
  viewportHeight: f32,     // 24
  _padding: f32,           // 28 (total 32 bytes, 16-byte aligned)
}

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var inputSampler: sampler;
@group(0) @binding(2) var inputTexture: texture_2d<f32>;

${fullscreenVertex}

${hash22}

// ボロノイセルの情報を計算
fn voronoi(uv: vec2f, cellCount: f32, seed: f32) -> vec3f {
  let gridUV = uv * cellCount;
  let cell = floor(gridUV);
  let localUV = fract(gridUV);

  var minDist = 10.0;
  var minDist2 = 10.0;
  var closestCell = vec2f(0.0);

  // 3x3の近傍セルを探索
  for (var dy = -1; dy <= 1; dy++) {
    for (var dx = -1; dx <= 1; dx++) {
      let neighbor = vec2f(f32(dx), f32(dy));
      let cellCoord = cell + neighbor;

      // シードを加えたハッシュでランダムな点を生成
      let randomOffset = hash22(cellCoord + seed * 0.01);
      let point = neighbor + randomOffset - localUV;

      let dist = length(point);
      if (dist < minDist) {
        minDist2 = minDist;
        minDist = dist;
        closestCell = cellCoord;
      } else if (dist < minDist2) {
        minDist2 = dist;
      }
    }
  }

  // 最近セルのUV座標とエッジ距離を返す
  let centerOffset = hash22(closestCell + seed * 0.01);
  let centerUV = (closestCell + centerOffset) / cellCount;
  let edgeDist = minDist2 - minDist;

  return vec3f(centerUV, edgeDist);
}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let texSize = vec2f(u.viewportWidth, u.viewportHeight);
  let uv = pos.xy / texSize;

  // ボロノイセル情報を取得
  let voronoiInfo = voronoi(uv, u.cellCount, u.seed);
  var cellCenterUV = voronoiInfo.xy;
  let edgeDist = voronoiInfo.z;

  // ノイズを適用（noiseScale > 0 の場合）
  if (u.noiseScale > 0.0) {
    let cellIndex = floor(uv * u.cellCount);
    let noise = hash22(cellIndex + u.seed * 0.01) * 2.0 - 1.0; // -1 to 1
    let noiseOffset = noise / u.cellCount * u.noiseScale * 0.01;
    cellCenterUV = cellCenterUV + noiseOffset;
  }

  // セル中心の色をサンプリング
  let clampedUV = clamp(cellCenterUV, vec2f(0.0), vec2f(1.0));
  var color = textureSample(inputTexture, inputSampler, clampedUV);

  // エッジ描画（オプション）
  if (u.showEdges > 0.5) {
    let edgeThreshold = u.edgeWidth / u.cellCount * 0.1;
    let edgeFactor = smoothstep(0.0, edgeThreshold, edgeDist);
    color = mix(vec4f(0.0, 0.0, 0.0, color.a), color, edgeFactor);
  }

  return color;
}
`

export const VORONOI_MOSAIC_BUFFER_SIZE = 32 // 8 floats * 4 bytes = 32 bytes (16-byte aligned)

/**
 * ボロノイモザイクフィルター用のuniformsを生成
 */
export const createVoronoiMosaicUniforms = (
  params: VoronoiMosaicParams,
  viewport: Viewport
): ArrayBuffer => {
  const uniforms = new ArrayBuffer(VORONOI_MOSAIC_BUFFER_SIZE)
  const view = new DataView(uniforms)

  view.setFloat32(0, params.cellCount, true)
  view.setFloat32(4, params.seed, true)
  view.setFloat32(8, params.showEdges, true)
  view.setFloat32(12, params.edgeWidth, true)
  view.setFloat32(16, params.noiseScale ?? 0, true)
  view.setFloat32(20, viewport.width, true)
  view.setFloat32(24, viewport.height, true)
  view.setFloat32(28, 0, true) // padding

  return uniforms
}
